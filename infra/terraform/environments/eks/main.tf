terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Stack       = "eks"
  }
}

# ─── Read shared VPC from SSM (written by environments/shared) ────────────────

data "aws_ssm_parameter" "vpc_id" {
  name = "/${var.project}/${var.environment}/vpc/id"
}

data "aws_ssm_parameter" "public_subnets" {
  name = "/${var.project}/${var.environment}/vpc/public-subnet-ids"
}

data "aws_ssm_parameter" "private_subnets" {
  name = "/${var.project}/${var.environment}/vpc/private-subnet-ids"
}

locals {
  vpc_id          = data.aws_ssm_parameter.vpc_id.value
  public_subnets  = split(",", data.aws_ssm_parameter.public_subnets.value)
  private_subnets = split(",", data.aws_ssm_parameter.private_subnets.value)
}

# ─── EKS Cluster (control plane + IAM + OIDC) ────────────────────────────────

module "eks_cluster" {
  source = "../../modules/eks-cluster"

  project            = var.project
  environment        = var.environment
  kubernetes_version = var.kubernetes_version
  vpc_id             = local.vpc_id
  # Control plane needs both public (for kubectl access) and private subnets
  subnet_ids = concat(local.public_subnets, local.private_subnets)
  tags       = local.tags
}

# ─── EKS Managed Node Group (worker nodes) ────────────────────────────────────

module "eks_nodegroup" {
  source = "../../modules/eks-nodegroup"

  cluster_name  = module.eks_cluster.cluster_name
  node_role_arn = module.eks_cluster.node_role_arn
  subnet_ids    = local.private_subnets
  instance_type = var.node_instance_type
  desired_size  = var.node_desired_size
  min_size      = var.node_min_size
  max_size      = var.node_max_size
  tags          = local.tags
}

# ─── SSM: store cluster info for kubectl helper scripts ───────────────────────

resource "aws_ssm_parameter" "cluster_name" {
  name  = "/${var.project}/${var.environment}/eks/cluster-name"
  type  = "String"
  value = module.eks_cluster.cluster_name
  tags  = local.tags
}
