# Skyline Transfers — Full-Stack Cloud Deployment

> A production-grade money transfer platform (Russia ↔ Rwanda) deployed on AWS using both **Amazon ECS Fargate** and **Amazon EKS (Kubernetes)** — side-by-side, for a DevOps architecture benchmark.

---

## Table of Contents

- [What is Skyline?](#what-is-skyline)
- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Changes Made — File by File](#changes-made--file-by-file)
- [How Everything Works Together](#how-everything-works-together)
- [Local Development Setup](#local-development-setup)
- [AWS Deployment Guide](#aws-deployment-guide)
  - [Prerequisites](#prerequisites)
  - [Step 1 — Build & Push Docker Images to ECR](#step-1--build--push-docker-images-to-ecr)
  - [Step 2 — Deploy Shared Infrastructure (VPC)](#step-2--deploy-shared-infrastructure-vpc)
  - [Step 3 — Deploy ECS Stack](#step-3--deploy-ecs-stack)
  - [Step 4 — Deploy EKS Stack](#step-4--deploy-eks-stack)
  - [Step 5 — Apply Kubernetes Manifests](#step-5--apply-kubernetes-manifests)
- [Deployment Screenshots](#deployment-screenshots)
- [Teardown](#teardown)

---

## What is Skyline?

Skyline Transfers is a full-stack web application that allows users to send money between Russia and Rwanda. It includes:

- **User registration, KYC, and authentication** (JWT-based)
- **Transfer creation** with real-time exchange rate calculations
- **Payment gateway integration** (UnitPay)
- **Admin dashboard** for managing users and transfers
- **Email notifications** and audit logging

---

## Architecture Overview

### Application Tiers

```
┌────────────────────────────────────────────────────────────┐
│                        Internet                            │
└────────────────────────┬───────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │  AWS ALB (Layer 7)  │  ← single public entry point
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  Frontend (nginx)   │  ← React SPA served by nginx
              │  Port 80            │    proxies /api/ → backend
              └──────────┬──────────┘
                         │ HTTP /api/*
              ┌──────────▼──────────┐
              │  Backend (Node.js)  │  ← Express REST API + Prisma
              │  Port 5004          │
              └──────┬──────┬───────┘
                     │      │
          ┌──────────▼─┐  ┌─▼──────────┐
          │ PostgreSQL  │  │   Redis     │
          │ Port 5432   │  │  Port 6379  │
          └─────────────┘  └─────────────┘
```

### Dual Cloud Deployment

This project is deployed on **two independent AWS orchestration platforms** simultaneously:

| Platform | Entry Point | Service Discovery | Storage |
|----------|-------------|-------------------|---------|
| **ECS Fargate** | ALB → ECS Services | AWS Cloud Map (`skyline-prod.local`) | EFS / managed |
| **EKS (Kubernetes 1.31)** | ALB → Ingress → Services | Kubernetes ClusterIP DNS | EBS gp3 (CSI driver) |

```
AWS Account: 764988411222 / us-east-1
│
├── Shared VPC (Terraform: environments/shared)
│   ├── 2 Public Subnets  (ALB, NAT GW)
│   ├── 2 Private Subnets (compute)
│   └── Internet Gateway + NAT Gateways
│
├── ECS Stack (Terraform: environments/ecs)
│   ├── ECR Repos (frontend + backend images)
│   ├── ECS Cluster: skyline-prod-cluster
│   ├── 4 Fargate Services: frontend, backend, postgres, redis
│   ├── ALB: skyline-prod-alb
│   └── Cloud Map Namespace: skyline-prod.local
│
└── EKS Stack (Terraform: environments/eks)
    ├── EKS Cluster: skyline-prod-eks (k8s 1.31)
    ├── Managed Node Group: t3.medium × 2
    ├── AWS Load Balancer Controller (via Helm)
    ├── EBS CSI Driver (via EKS Addon + IRSA)
    └── ALB: k8s-skyline-skylinei-*
```

---

## Technology Stack

### Application

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Shadcn UI |
| Backend | Node.js 20, Express.js, TypeScript, Prisma ORM |
| Database | PostgreSQL 15 |
| Cache / Rate-limit store | Redis 7 |
| API Docs | Swagger / OpenAPI |
| Auth | JWT (access + refresh tokens) |

### Infrastructure

| Component | Technology |
|-----------|-----------|
| IaC | Terraform (modular, 10 reusable modules) |
| Container Registry | Amazon ECR |
| Orchestration (option A) | Amazon ECS Fargate |
| Orchestration (option B) | Amazon EKS (Kubernetes 1.31) |
| Load Balancer | AWS Application Load Balancer |
| Service Discovery (ECS) | AWS Cloud Map |
| Persistent Volumes (EKS) | AWS EBS via CSI Driver |
| IAM for Pods | IRSA (IAM Roles for Service Accounts via OIDC) |
| Local Dev | Docker Compose |

---

## Project Structure

```
skyline/
├── docker-compose.yml              # Local dev: all 4 services
├── screenshoots/                   # Deployment proof screenshots
│
├── skyline-backend/
│   ├── Dockerfile                  # Multi-stage Node.js build
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema
│   │   └── migrations/             # SQL migration history
│   └── src/
│       ├── config/redis.ts         # Redis client singleton (NEW)
│       ├── controllers/            # Request handlers
│       ├── middleware/
│       │   └── rate-limit.middleware.ts  # Rate limiters (UPDATED)
│       ├── services/
│       │   └── transfer.service.ts  # Transfer business logic (FIXED)
│       └── routes/                 # Express route definitions
│
├── skyline-ifrontend/
│   ├── Dockerfile                  # Multi-stage nginx build (FIXED)
│   ├── nginx.conf                  # nginx reverse proxy config
│   └── src/                        # React application source
│
└── infra/
    ├── k8s/                        # Kubernetes manifests
    │   ├── 00-namespace.yaml       # skyline namespace
    │   ├── 01-configmap.yaml       # Environment variables
    │   ├── 02-postgres.yaml        # PostgreSQL StatefulSet (FIXED)
    │   ├── 03-redis.yaml           # Redis Deployment
    │   ├── 04-backend.yaml         # Backend Deployment
    │   ├── 05-frontend.yaml        # Frontend Deployment
    │   └── 06-ingress.yaml         # AWS ALB Ingress
    │
    └── terraform/
        ├── modules/                # Reusable Terraform modules
        │   ├── vpc/                # VPC, subnets, NAT gateways
        │   ├── alb/                # Application Load Balancer
        │   ├── ecr/                # Container registry
        │   ├── ecs-cluster/        # ECS cluster + CloudWatch
        │   ├── ecs-services/       # ECS task definitions + services
        │   ├── eks-cluster/        # EKS control plane + OIDC
        │   ├── eks-nodegroup/      # EKS managed node groups
        │   ├── iam-ecs/            # IAM roles for ECS tasks
        │   └── cloud-map/          # Service discovery namespace
        │
        └── environments/
            ├── shared/             # VPC (apply first)
            ├── ecs/                # ECS full stack (apply second)
            └── eks/                # EKS cluster (apply third)
```

---

## Changes Made — File by File

### 1. `skyline-backend/src/services/transfer.service.ts`

**Purpose:** Defines the data structure for creating a transfer.

**What changed:**
```typescript
// BEFORE — paymentMethodType did not exist in the interface
export interface CreateTransferData {
  userId: string;
  // ... other fields
  notes?: string;
}

// AFTER — added the optional field
export interface CreateTransferData {
  userId: string;
  // ... other fields
  paymentMethodType?: 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD'
                    | 'MOBILE_MONEY' | 'DIGITAL_WALLET' | 'OTHER';
  notes?: string;
}
```

**Why:** The transfer controller was already writing `paymentMethodType` into the object it passed to this service, but the TypeScript interface didn't declare it as a valid field. This caused the Docker build to fail with `TS2353: Object literal may only specify known properties`. Adding it unblocks the build.

---

### 2. `skyline-backend/src/controllers/transfer.controller.ts`

**Purpose:** Handles incoming HTTP requests for transfers.

**What changed:**
```typescript
// BEFORE — 'CARD' is not a valid PaymentMethodType enum value
paymentMethodType: paymentChannel === 'unitpay' ? 'CARD' : ...

// AFTER — corrected to a valid enum value
paymentMethodType: paymentChannel === 'unitpay' ? 'CREDIT_CARD' : ...
```

**Why:** The Prisma schema defines `PaymentMethodType` enum as: `BANK_TRANSFER`, `CREDIT_CARD`, `DEBIT_CARD`, `MOBILE_MONEY`, `DIGITAL_WALLET`, `OTHER`. The value `'CARD'` doesn't exist in that enum, causing a TypeScript compilation error. Changed to `'CREDIT_CARD'` which correctly represents a card payment.

---

### 3. `skyline-ifrontend/Dockerfile` *(critical fix)*

**Purpose:** Builds the React app and serves it with nginx.

**What changed:**
```dockerfile
# BEFORE — nginx.conf copied directly into conf.d/
COPY nginx.conf /etc/nginx/conf.d/app.conf

# AFTER — nginx.conf copied as a template
COPY nginx.conf /etc/nginx/templates/app.conf.template
```

**Why this matters — the nginx variable substitution problem:**

The `nginx.conf` file uses `${BACKEND_HOST}` to refer to the backend service address. There are two ways nginx sees this:

- If placed in `/etc/nginx/conf.d/`, nginx reads it at startup and interprets `${BACKEND_HOST}` as a **nginx variable** — but no nginx variable with that name exists, so nginx crashes with `unknown "backend_host" variable` and the container exits with code 1.
- If placed in `/etc/nginx/templates/`, nginx's built-in `20-envsubst-on-templates.sh` startup script runs first and replaces `${BACKEND_HOST}` with the actual **shell environment variable value** (e.g., `backend.skyline.svc.cluster.local`) before nginx loads the config.

The fix ensures the environment variable is substituted at container startup, allowing nginx to proxy `/api/*` requests to the correct backend address — whether that's an ECS Cloud Map hostname or a Kubernetes ClusterIP.

**Effect:** Frontend containers can now start successfully in both ECS and EKS.

---

### 4. `skyline-backend/src/config/redis.ts` *(new file)*

**Purpose:** Provides a shared Redis client instance used by the rate limiting middleware.

**What it does:**
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,          // doesn't throw on startup if Redis is absent
  maxRetriesPerRequest: 1,    // fails fast rather than hanging
  enableOfflineQueue: false,  // drops commands if disconnected (no queue buildup)
});

redis.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.warn('[Redis] Not available — rate limiters will use in-memory fallback');
  }
});

export default redis;
```

**Why:** The packages `ioredis` and `rate-limit-redis` were already installed in `package.json` but never wired up. The rate limiters were using in-memory stores, meaning:
- Counters reset every time the server restarts
- Counters don't sync across multiple backend replicas (2 pods/tasks in production)

With this file, rate limit state persists in Redis and is shared across all backend instances.

---

### 5. `skyline-backend/src/middleware/rate-limit.middleware.ts` *(updated)*

**Purpose:** Applies rate limiting to API routes to prevent abuse.

**What changed:**
```typescript
// BEFORE — all limiters used in-memory store (default)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  // no store: field — defaults to memory
});

// AFTER — all limiters use Redis store
import { RedisStore } from 'rate-limit-redis';
import redis from '../config/redis';

const makeRedisStore = (prefix: string) =>
  new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as Promise<number>,
    prefix,
  });

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  store: makeRedisStore('rl:auth:'),   // ← persisted, shared
});
```

Four rate limiters updated with Redis stores and unique key prefixes:

| Limiter | Prefix | Purpose |
|---------|--------|---------|
| `rateLimiter` | `rl:general:` | General API rate limit |
| `authLimiter` | `rl:auth:` | Login/register — 5 attempts per 15 min |
| `transferLimiter` | `rl:transfer:` | Transfer creation — prevents spam |
| `strictLimiter` | `rl:strict:` | Sensitive admin endpoints |

---

### 6. `docker-compose.yml` *(updated)*

**Purpose:** Orchestrates all 4 services for local development.

**What changed — added Redis service:**
```yaml
# ADDED under services:
redis:
  image: redis:7-alpine
  container_name: skyline-redis
  ports:
    - "6379:6379"
  networks:
    - backend-network
  restart: unless-stopped

# UPDATED backend depends_on:
backend:
  depends_on:
    postgres:
      condition: service_healthy
    redis:             # ← added
      condition: service_started
```

**Why:** The Redis service was missing from `docker-compose.yml` even though the backend needs it for rate limiting. Without it, the backend would start without a Redis connection and fall back to in-memory rate limiting.

---

### 7. `.env.example` *(updated)*

**What changed:**
```bash
# ADDED at the end:
# Redis
REDIS_URL=redis://localhost:6379
```

**Why:** Developers cloning the repo need to know about the `REDIS_URL` variable to configure their environment. Without it in `.env.example`, the variable would be silently missing and the rate limiter would use the hardcoded fallback `redis://localhost:6379` instead of the configured value.

---

### 8. `infra/k8s/02-postgres.yaml` *(two fixes)*

**Purpose:** Defines the PostgreSQL database as a Kubernetes StatefulSet.

**Fix 1 — StorageClass: gp2 → gp3**
```yaml
# BEFORE
spec:
  storageClassName: gp2

# AFTER
spec:
  storageClassName: gp3
```

**Why:** On EKS 1.23+, the old `gp2` StorageClass uses the deprecated in-tree `kubernetes.io/aws-ebs` provisioner, which is no longer active. PVCs using it would sit in `Pending` forever. The `gp3` StorageClass uses the modern `ebs.csi.aws.com` provisioner (installed as the EBS CSI Driver addon), which correctly provisions EBS volumes.

**Fix 2 — PGDATA subdirectory**
```yaml
# BEFORE — only envFrom, no PGDATA override
envFrom:
  - secretRef:
      name: postgres-secret

# AFTER — PGDATA points to a subdirectory
envFrom:
  - secretRef:
      name: postgres-secret
env:
  - name: PGDATA
    value: /var/lib/postgresql/data/pgdata
```

**Why:** When AWS provisions an EBS volume formatted as EXT4, it creates a `lost+found` directory at the root of the mount. PostgreSQL's `initdb` checks whether the data directory is empty before initializing — if `lost+found` is present, postgres refuses to start with:
```
initdb: error: directory "/var/lib/postgresql/data" exists but is not empty
```
Setting `PGDATA` to a subdirectory (`/pgdata`) means postgres works within an empty child directory, completely avoiding the `lost+found` conflict.

---

### 9. `infra/terraform/environments/eks/variables.tf` *(updated)*

**What changed:**
```hcl
# BEFORE
variable "kubernetes_version" {
  default = "1.29"
}

# AFTER
variable "kubernetes_version" {
  default = "1.31"
}
```

**Why:** AWS retired the AMIs for Kubernetes 1.29 — attempting to create a node group with `1.29` returns:
```
InvalidParameterException: Requested AMI for this version 1.29 is not supported
```
Kubernetes 1.31 has extended support until November 2026 and working AMIs in us-east-1. The EKS cluster was destroyed and recreated at 1.31.

---

### 10. `infra/terraform/environments/ecs/terraform.tfvars` *(created)*

**Purpose:** Provides actual values for all required Terraform variables for the ECS environment.

**What it contains:**
```hcl
project     = "skyline"
environment = "prod"
aws_region  = "us-east-1"

db_password        = "<generated-strong-password>"
jwt_secret         = "<generated-strong-secret>"
jwt_refresh_secret = "<generated-strong-secret>"
admin_email        = "viateur.akimana@amalitechtraining.org"

frontend_image = "764988411222.dkr.ecr.us-east-1.amazonaws.com/skyline-prod-frontend:latest"
backend_image  = "764988411222.dkr.ecr.us-east-1.amazonaws.com/skyline-prod-backend:latest"
```

**Why:** Terraform requires values for all non-default variables before `apply`. This file was created with secrets generated using `openssl rand -base64 32` and the ECR image URIs populated after the images were pushed.

---

### 11. AWS Resources Created Outside Terraform

These were created with the AWS CLI and Helm because they depend on the EKS cluster OIDC endpoint, which isn't known until after `terraform apply`:

**EBS CSI Driver IRSA Role**
- IAM Role: `AmazonEKS_EBS_CSI_DriverRole`
- Trust policy scoped to: `system:serviceaccount:kube-system:ebs-csi-controller-sa`
- Attached policy: `arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy`
- Why: EKS pods can't reach EC2 IMDS (hop limit = 1 on nodes, pod adds one more hop). IRSA injects AWS credentials directly into the pod via a projected service account token, bypassing IMDS entirely.

**AWS Load Balancer Controller IRSA Role**
- IAM Role: `AmazonEKSLoadBalancerControllerRole`
- Custom IAM policy from the official AWS LBC policy JSON
- Helm installation: `aws-load-balancer-controller` in namespace `kube-system`
- Why: Without the AWS Load Balancer Controller, Ingress objects with `alb` annotations are ignored — no ALB gets created. The controller watches Ingress resources and calls the AWS API to provision real ALBs.

**gp3 StorageClass**
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Retain
```

---

## How Everything Works Together

### Request Flow (Production)

```
User Browser
    │
    ▼
AWS ALB  (port 80/443)
    │ routes /* to frontend target group
    ▼
Frontend Container (nginx, port 80)
    │ serves React SPA for non-/api/ routes
    │ proxies /api/* to ${BACKEND_HOST}:5004
    ▼
Backend Container (Node.js, port 5004)
    │ authenticates via JWT
    │ validates input
    │ checks rate limits  ──────────▶  Redis (stores counters)
    │ runs business logic
    │ queries/updates DB  ──────────▶  PostgreSQL (stores data)
    ▼
JSON Response → Frontend → User
```

### Environment Variable Flow

```
Terraform tfvars / K8s Secret
    │
    ▼
ECS Task Definition env / K8s Secret mount
    │
    ├── DATABASE_URL      → Prisma (backend → postgres)
    ├── REDIS_URL         → ioredis (backend → redis)
    ├── JWT_SECRET        → jsonwebtoken (auth)
    └── BACKEND_HOST      → nginx envsubst (frontend → backend)
```

### DNS / Service Discovery

**ECS:**
```
frontend container → http://backend.skyline-prod.local:5004
                                  ↑
                     AWS Cloud Map registers this name
                     when the backend ECS service starts
```

**EKS:**
```
frontend container → http://backend.skyline.svc.cluster.local:5004
                                  ↑
                     Kubernetes creates this DNS entry
                     for the backend ClusterIP Service
```

---

## Local Development Setup

### Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Node.js 20+ (for running scripts outside Docker)

### Start Everything

```bash
# Clone the repo
git clone <repo-url>
cd skyline

# Copy and configure environment variables
cp skyline-backend/.env.example skyline-backend/.env
# Edit skyline-backend/.env — set your DATABASE_URL, JWT secrets, etc.

# Start all 4 services (postgres, redis, backend, frontend)
docker compose up --build

# The app will be available at:
# Frontend: http://localhost:80
# Backend API: http://localhost:5004
# API Docs: http://localhost:5004/api-docs
```

### Run Migrations Manually

```bash
cd skyline-backend
npx prisma migrate deploy
npx prisma db seed  # optional: seed demo data
```

---

## AWS Deployment Guide

### Prerequisites

- AWS CLI configured (`aws configure`) with account `764988411222`
- Terraform >= 1.5 installed
- Docker installed
- `kubectl` and `helm` installed
- `eksctl` installed (optional, for node group debugging)

### Step 1 — Build & Push Docker Images to ECR

```bash
# Authenticate Docker with ECR
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin \
    764988411222.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repos (first time only)
cd infra/terraform/environments/ecs
terraform init
terraform apply -target=module.ecr -auto-approve

# Build and push backend
docker build -t skyline-prod-backend ./skyline-backend
docker tag skyline-prod-backend:latest \
  764988411222.dkr.ecr.us-east-1.amazonaws.com/skyline-prod-backend:latest
docker push 764988411222.dkr.ecr.us-east-1.amazonaws.com/skyline-prod-backend:latest

# Build and push frontend
docker build -t skyline-prod-frontend ./skyline-ifrontend
docker tag skyline-prod-frontend:latest \
  764988411222.dkr.ecr.us-east-1.amazonaws.com/skyline-prod-frontend:latest
docker push 764988411222.dkr.ecr.us-east-1.amazonaws.com/skyline-prod-frontend:latest
```

### Step 2 — Deploy Shared Infrastructure (VPC)

```bash
cd infra/terraform/environments/shared
terraform init
terraform plan
terraform apply -auto-approve
# This creates the VPC and writes subnet IDs to SSM Parameter Store
```

### Step 3 — Deploy ECS Stack

```bash
cd infra/terraform/environments/ecs

# Create terraform.tfvars with your secrets
cat > terraform.tfvars <<EOF
project     = "skyline"
environment = "prod"
aws_region  = "us-east-1"
db_password        = "$(openssl rand -base64 24)"
jwt_secret         = "$(openssl rand -base64 32)"
jwt_refresh_secret = "$(openssl rand -base64 32)"
admin_email        = "your-email@example.com"
frontend_image = "764988411222.dkr.ecr.us-east-1.amazonaws.com/skyline-prod-frontend:latest"
backend_image  = "764988411222.dkr.ecr.us-east-1.amazonaws.com/skyline-prod-backend:latest"
EOF

terraform init
terraform plan
terraform apply -auto-approve

# Get the ALB URL
terraform output alb_dns_name
```

### Step 4 — Deploy EKS Stack

```bash
cd infra/terraform/environments/eks
terraform init
terraform plan
terraform apply -auto-approve

# Configure kubectl
aws eks update-kubeconfig \
  --region us-east-1 \
  --name skyline-prod-eks

# Verify nodes are ready
kubectl get nodes
```

**Install EBS CSI Driver (required for PostgreSQL PVC):**

```bash
# Get the OIDC issuer
OIDC=$(aws eks describe-cluster --name skyline-prod-eks \
  --query "cluster.identity.oidc.issuer" --output text | sed 's|https://||')

# Create IRSA trust policy
cat > ebs-trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "arn:aws:iam::764988411222:oidc-provider/${OIDC}"},
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {"StringEquals": {
      "${OIDC}:sub": "system:serviceaccount:kube-system:ebs-csi-controller-sa"
    }}
  }]
}
EOF

# Create role and install addon
aws iam create-role --role-name AmazonEKS_EBS_CSI_DriverRole \
  --assume-role-policy-document file://ebs-trust.json
aws iam attach-role-policy \
  --role-name AmazonEKS_EBS_CSI_DriverRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy
aws eks create-addon --cluster-name skyline-prod-eks \
  --addon-name aws-ebs-csi-driver \
  --service-account-role-arn arn:aws:iam::764988411222:role/AmazonEKS_EBS_CSI_DriverRole
```

**Install AWS Load Balancer Controller (required for ALB Ingress):**

```bash
# Download and create IAM policy
curl -o lbc-policy.json \
  https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json
aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://lbc-policy.json

# Create IRSA role (same OIDC flow as EBS CSI, scoped to kube-system:aws-load-balancer-controller)
# ... (same trust policy pattern, different service account name)

# Install via Helm
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=skyline-prod-eks \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

### Step 5 — Apply Kubernetes Manifests

```bash
# Apply all manifests in order
kubectl apply -f infra/k8s/00-namespace.yaml
kubectl apply -f infra/k8s/01-configmap.yaml
kubectl apply -f infra/k8s/02-postgres.yaml
kubectl apply -f infra/k8s/03-redis.yaml
kubectl apply -f infra/k8s/04-backend.yaml
kubectl apply -f infra/k8s/05-frontend.yaml
kubectl apply -f infra/k8s/06-ingress.yaml

# Wait for all pods to be ready
kubectl get pods -n skyline -w

# Get the ALB URL
kubectl get ingress -n skyline
```

---

## Deployment Screenshots

### 1. ECS Task Definitions — All 4 Services Active

All four ECS task definitions (`backend`, `frontend`, `postgres`, `redis`) registered and active in AWS console.

![ECS Task Definitions](screenshoots/Screenshot%20from%202026-04-23%2009-51-41.png)

---

### 2. ECR Private Repositories — Images Pushed

Both `skyline-prod-backend` and `skyline-prod-frontend` Docker images stored in Amazon ECR.

![ECR Repositories](screenshoots/Screenshot%20from%202026-04-23%2010-20-29.png)

---

### 3. ECS Services Running — All Active on Fargate

All 4 ECS services (`backend`, `frontend`, `postgres`, `redis`) running with `Active` status on AWS Fargate in the `skyline-prod-cluster`.

![ECS Services](screenshoots/Screenshot%20from%202026-04-23%2010-22-48.png)

---

### 4. Cloud Map Namespace — ECS Service Discovery

AWS Cloud Map namespace `skyline-prod.local` created for internal DNS-based service discovery between ECS services.

![Cloud Map Namespace](screenshoots/Screenshot%20from%202026-04-23%2010-31-00.png)

---

### 5. EKS Cluster — Kubernetes 1.31 Active

EKS cluster `skyline-prod-eks` running Kubernetes version 1.31, status `Active`, with extended support until November 2026.

![EKS Cluster](screenshoots/Screenshot%20from%202026-04-23%2010-21-19.png)

---

### 6. Both ALBs Active — ECS and EKS

Two Application Load Balancers active simultaneously: `skyline-prod-alb` (ECS) and `k8s-skyline-skylinei-*` (EKS Ingress). Both in `active` state and internet-facing.

![Load Balancers](screenshoots/Screenshot%20from%202026-04-23%2010-29-06.png)

---

### 7. VPC Internet Gateway — Network Connected

The VPC Internet Gateway (`skyline-prod-igw`) attached to the shared VPC, enabling public internet access for the ALBs.

![Internet Gateway](screenshoots/Screenshot%20from%202026-04-23%2010-30-24.png)

---

### 8. EKS Worker Node — Running in Private Subnet

An EKS managed node (`t3.medium`) running in a private subnet with the correct IAM role and IRSA configuration.

![EKS Node](screenshoots/Screenshot%20from%202026-04-23%2010-32-26.png)

---

### 9. Live App via ECS — HTTP 200

The Skyline Transfers frontend successfully loaded from the **ECS ALB URL**, showing the currency converter widget (10,000 RUB → 182,300 RWF).

![App via ECS](screenshoots/Screenshot%20from%202026-04-23%2010-19-45.png)

---

### 10. Live App via EKS — HTTP 200

The same Skyline Transfers frontend successfully loaded from the **EKS Ingress ALB URL**, confirming the Kubernetes deployment is fully operational.

![App via EKS](screenshoots/Screenshot%20from%202026-04-23%2010-20-14.png)

---

## Teardown

Destroy in reverse order to avoid dependency errors:

```bash
# 1. Delete Kubernetes resources (releases EBS volumes and ALB)
kubectl delete -f infra/k8s/
helm uninstall aws-load-balancer-controller -n kube-system

# 2. Destroy EKS Terraform stack
cd infra/terraform/environments/eks
terraform destroy -auto-approve

# 3. Destroy ECS Terraform stack
cd infra/terraform/environments/ecs
terraform destroy -auto-approve

# 4. Destroy shared VPC
cd infra/terraform/environments/shared
terraform destroy -auto-approve
```

> **Note:** The IAM roles `AmazonEKS_EBS_CSI_DriverRole` and `AmazonEKSLoadBalancerControllerRole` were created with the AWS CLI (not Terraform) and must be deleted manually:
> ```bash
> aws iam detach-role-policy --role-name AmazonEKS_EBS_CSI_DriverRole \
>   --policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy
> aws iam delete-role --role-name AmazonEKS_EBS_CSI_DriverRole
>
> aws iam delete-role --role-name AmazonEKSLoadBalancerControllerRole
> aws iam delete-policy \
>   --policy-arn arn:aws:iam::764988411222:policy/AWSLoadBalancerControllerIAMPolicy
> ```

---

