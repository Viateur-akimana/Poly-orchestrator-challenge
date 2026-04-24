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
    Stack       = "ecs"
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

# ─── ECR: image repositories ──────────────────────────────────────────────────

module "ecr" {
  source      = "../../modules/ecr"
  project     = var.project
  environment = var.environment
  tags        = local.tags
}

# ─── IAM: task execution + task roles ─────────────────────────────────────────

module "iam_ecs" {
  source      = "../../modules/iam-ecs"
  project     = var.project
  environment = var.environment
  tags        = local.tags
}

# ─── ECS Cluster + CloudWatch log groups ──────────────────────────────────────

module "ecs_cluster" {
  source      = "../../modules/ecs-cluster"
  project     = var.project
  environment = var.environment
  aws_region  = var.aws_region
  tags        = local.tags
}

# ─── Cloud Map: private DNS namespace + service registrations ─────────────────

module "cloud_map" {
  source      = "../../modules/cloud-map"
  project     = var.project
  environment = var.environment
  vpc_id      = local.vpc_id
  tags        = local.tags
}

# ─── ALB: public-facing load balancer for the frontend ────────────────────────

module "alb" {
  source            = "../../modules/alb"
  project           = var.project
  environment       = var.environment
  vpc_id            = local.vpc_id
  public_subnet_ids = local.public_subnets
  tags              = local.tags
}

# ─── ECS Services: task definitions + services + security groups ──────────────

module "ecs_services" {
  source      = "../../modules/ecs-services"
  project     = var.project
  environment = var.environment
  aws_region  = var.aws_region

  vpc_id             = local.vpc_id
  private_subnet_ids = local.private_subnets

  alb_sg_id            = module.alb.alb_sg_id
  alb_target_group_arn = module.alb.target_group_arn
  alb_dns_name         = module.alb.alb_dns_name

  cluster_id   = module.ecs_cluster.cluster_id
  cluster_name = module.ecs_cluster.cluster_name

  task_execution_role_arn = module.iam_ecs.task_execution_role_arn
  task_role_arn           = module.iam_ecs.task_role_arn

  cloud_map_namespace_name = module.cloud_map.namespace_name
  cloud_map_service_arns   = module.cloud_map.service_arns

  log_group_names = module.ecs_cluster.log_group_names

  frontend_image     = var.frontend_image
  backend_image      = var.backend_image
  db_password        = var.db_password
  jwt_secret         = var.jwt_secret
  jwt_refresh_secret = var.jwt_refresh_secret
  admin_email        = var.admin_email

  backend_cpu     = var.backend_cpu
  backend_memory  = var.backend_memory
  frontend_cpu    = var.frontend_cpu
  frontend_memory = var.frontend_memory

  tags = local.tags
}
