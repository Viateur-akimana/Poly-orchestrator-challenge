# Skyline Transfers — ECS vs EKS Benchmark

## Overview

This document covers the full deployment of the **Skyline Transfers** application to both **Amazon ECS (Fargate)** and **Amazon EKS**, using the existing codebase as-is. The goal is to benchmark both orchestrators and guide the decision on which to adopt.

### Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                     ┌──────▼──────┐
                     │  Public ALB  │  (port 80)
                     └──────┬──────┘
                            │
                     ┌──────▼──────┐
                     │  Frontend   │  nginx · port 80
                     │  (React SPA)│  proxies /api → backend
                     └──────┬──────┘
                            │ HTTP :5004
                     ┌──────▼──────┐
                     │  Backend    │  Node.js/Express · port 5004
                     │  API        │  Prisma ORM
                     └──┬──────┬───┘
                        │      │
               ┌────────▼─┐  ┌─▼────────┐
               │ Postgres │  │  Redis   │
               │ :5432    │  │  :6379   │
               └──────────┘  └──────────┘
```

### Stack

| Component | Technology |
|-----------|-----------|
| Frontend  | React 18 + Vite, served by nginx |
| Backend   | Node.js + Express + TypeScript + Prisma |
| Database  | PostgreSQL 15 |
| Cache / Rate-limit store | Redis 7 |

---

## Prerequisites

```bash
# CLI tools required
aws --version          # AWS CLI v2
terraform --version    # >= 1.5
docker --version       # >= 24
kubectl version        # >= 1.28
helm version           # >= 3
```

AWS credentials must be configured with permissions for: VPC, ECS, EKS, ECR, IAM, ALB, Cloud Map, EFS, SSM, CloudWatch.

---

## Part 1 — Local Verification with Docker Compose

Run the full 4-tier stack locally before pushing to AWS.

```bash
# 1. Clone / navigate to project root
cd /path/to/skyline

# 2. Copy and fill in secrets
cp skyline-backend/.env.example .env.local
# Edit .env.local: set POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET

# 3. Build and start all services
docker compose --env-file .env.local up --build -d

# 4. Verify health
curl http://localhost/health          # frontend (nginx)
curl http://localhost:5004/health     # backend direct

# 5. Run DB migration manually if needed
docker compose exec backend sh -c "npx prisma migrate deploy"

# 6. Tear down
docker compose down -v
```

**Expected result:** Frontend at `http://localhost`, backend API at `http://localhost:5004/api`.

---

## Part 2 — Build & Push Images to ECR

```bash
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-east-1
FRONTEND_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/skyline-prod-frontend"
BACKEND_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/skyline-prod-backend"

# Authenticate
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Build
docker build -t skyline-frontend:latest ./skyline-ifrontend
docker build -t skyline-backend:latest  ./skyline-backend

# Tag & push
docker tag skyline-frontend:latest ${FRONTEND_REPO}:latest
docker tag skyline-backend:latest  ${BACKEND_REPO}:latest
docker push ${FRONTEND_REPO}:latest
docker push ${BACKEND_REPO}:latest
```

> ECR repositories are created by the ECS Terraform stack. Run Part 3 first, then push images.

---

## Part 3 — ECS Fargate Deployment

### 3.1 Provision shared VPC

```bash
cd infra/terraform/vpc
terraform init
terraform apply -auto-approve
```

This creates the VPC, subnets, NAT Gateway, and stores IDs in SSM Parameter Store for use by both ECS and EKS stacks.

### 3.2 Provision ECS stack

```bash
cd infra/terraform/ecs
terraform init
terraform apply \
  -var="db_password=<YOUR_DB_PASSWORD>" \
  -var="jwt_secret=<YOUR_JWT_SECRET>" \
  -var="jwt_refresh_secret=<YOUR_JWT_REFRESH_SECRET>" \
  -var="frontend_image=${FRONTEND_REPO}:latest" \
  -var="backend_image=${BACKEND_REPO}:latest"
```

Resources created:
- ECS Cluster (`skyline-prod-cluster`) with Container Insights enabled
- ECR repositories for frontend and backend
- 4 task definitions: `postgres`, `redis`, `backend`, `frontend`
- 4 ECS services: each in private subnets
- Cloud Map namespace `skyline-prod.local` — services resolve as:
  - `backend.skyline-prod.local:5004`
  - `redis.skyline-prod.local:6379`
  - `postgres.skyline-prod.local:5432`
- Public ALB → frontend service (port 80)
- EFS volume for Postgres data persistence

### 3.3 Verify ECS deployment

```bash
# Get ALB DNS from terraform output
ALB_DNS=$(terraform output -raw alb_dns_name)
echo "App URL: http://${ALB_DNS}"

# Check service status
aws ecs describe-services \
  --cluster skyline-prod-cluster \
  --services skyline-prod-frontend skyline-prod-backend skyline-prod-redis skyline-prod-postgres \
  --query 'services[*].{Name:serviceName,Running:runningCount,Desired:desiredCount,Status:status}'

# Tail logs
aws logs tail /ecs/skyline-prod/backend --follow
```

### 3.4 ECS Resiliency Test

```bash
# 1. Get a running task ARN
TASK_ARN=$(aws ecs list-tasks --cluster skyline-prod-cluster \
  --service-name skyline-prod-backend \
  --query 'taskArns[0]' --output text)

# 2. Stop the task (simulates crash)
aws ecs stop-task --cluster skyline-prod-cluster --task $TASK_ARN \
  --reason "Resiliency test"

# 3. Watch ECS automatically replace it (desired count = 2, so one still serves traffic)
watch -n 5 "aws ecs describe-services \
  --cluster skyline-prod-cluster \
  --services skyline-prod-backend \
  --query 'services[0].{Running:runningCount,Desired:desiredCount,Pending:pendingCount}'"

# 4. Verify the app stayed up during replacement
while true; do curl -s -o /dev/null -w "%{http_code}\n" http://${ALB_DNS}/health; sleep 2; done
```

**Expected:** New task starts within ~60 seconds. The ALB drains the stopped task and routes to the remaining healthy task. No downtime with `desired_count = 2`.

---

## Part 4 — Amazon EKS Deployment

### 4.1 Provision EKS cluster

```bash
cd infra/terraform/eks
terraform init
terraform apply -auto-approve

# Configure kubectl
$(terraform output -raw kubeconfig_command)

# Verify cluster access
kubectl get nodes
```

### 4.2 Install AWS Load Balancer Controller

```bash
# Add the EKS chart repo
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Install the controller (uses IRSA — OIDC provider created by Terraform)
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName=$(terraform output -raw cluster_name) \
  --set serviceAccount.create=true \
  --set region=us-east-1 \
  --set vpcId=$(aws ssm get-parameter \
    --name /skyline/prod/vpc/id --query Parameter.Value --output text)
```

### 4.3 Update image URIs in manifests

```bash
sed -i "s|<AWS_ACCOUNT_ID>|${AWS_ACCOUNT_ID}|g" infra/k8s/04-backend.yaml
sed -i "s|<AWS_ACCOUNT_ID>|${AWS_ACCOUNT_ID}|g" infra/k8s/05-frontend.yaml
```

### 4.4 Deploy to EKS

```bash
cd infra/k8s

# Deploy in dependency order
kubectl apply -f 00-namespace.yaml
kubectl apply -f 01-configmap.yaml
kubectl apply -f 02-postgres.yaml
kubectl apply -f 03-redis.yaml

# Wait for data tier to be ready
kubectl wait --namespace skyline \
  --for=condition=ready pod \
  --selector=tier=data \
  --timeout=120s

kubectl apply -f 04-backend.yaml

# Wait for backend
kubectl wait --namespace skyline \
  --for=condition=ready pod \
  --selector=app=backend \
  --timeout=120s

kubectl apply -f 05-frontend.yaml
kubectl apply -f 06-ingress.yaml
```

### 4.5 Verify EKS deployment

```bash
# All pods running
kubectl get pods -n skyline

# Get the ALB DNS from the Ingress
kubectl get ingress -n skyline

# Check logs
kubectl logs -n skyline -l app=backend --tail=50 -f
kubectl logs -n skyline -l app=frontend --tail=20 -f
```

### 4.6 EKS Resiliency Test

```bash
# 1. List backend pods
kubectl get pods -n skyline -l app=backend

# 2. Delete one pod (simulates a crash)
POD=$(kubectl get pod -n skyline -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl delete pod -n skyline $POD

# 3. Watch Kubernetes immediately schedule a replacement
kubectl get pods -n skyline -l app=backend -w

# 4. Verify the Ingress ALB kept serving traffic
INGRESS_HOST=$(kubectl get ingress skyline-ingress -n skyline \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
while true; do curl -s -o /dev/null -w "%{http_code}\n" http://${INGRESS_HOST}/health; sleep 2; done
```

**Expected:** Kubernetes detects the missing pod and schedules a replacement on another node. The second replica continues handling traffic throughout. New pod is `Running` within ~30 seconds.

---

## Part 5 — ECS vs EKS Comparison

| Dimension | ECS Fargate | EKS |
|-----------|------------|-----|
| **Setup complexity** | Low — task definitions are JSON configs | High — cluster + node group + controller installs |
| **Operational overhead** | Very low — no nodes to manage | Medium — node groups need patching |
| **Service discovery** | Cloud Map (DNS-based, automatic) | CoreDNS + ClusterIP services (built-in) |
| **Load balancing** | ALB via ECS service lb config | ALB via Ingress (requires controller install) |
| **Scaling** | ECS Service auto-scaling | HPA + Cluster Autoscaler |
| **Cold start** | ~60–90s (Fargate task startup) | ~30s (container on warm node) |
| **Resiliency** | ECS replaces failed tasks automatically | K8s restarts failed pods immediately |
| **Cost model** | Pay per vCPU/memory per task | Pay per EC2 node (+ EKS control plane $0.10/hr) |
| **Portability** | AWS-specific | Portable across cloud providers |
| **Best for** | Small teams, AWS-native stacks | Large teams, complex workloads, multi-cloud |

**Recommendation for Skyline (startup phase):** Start with ECS Fargate for its lower operational overhead. Migrate to EKS if you need advanced scheduling, multi-cloud portability, or a larger engineering team that already knows Kubernetes.

---

## Cleanup

```bash
# ECS
cd infra/terraform/ecs && terraform destroy -auto-approve

# EKS (manifests first, then cluster)
kubectl delete -f infra/k8s/ --recursive
cd infra/terraform/eks && terraform destroy -auto-approve

# VPC (last — both stacks must be destroyed first)
cd infra/terraform/vpc && terraform destroy -auto-approve
```
