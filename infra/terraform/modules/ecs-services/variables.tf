variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "alb_sg_id" {
  description = "Security group ID of the public ALB (frontend tasks allow ingress from it)"
  type        = string
}

variable "alb_target_group_arn" {
  type = string
}

variable "cluster_id" {
  type = string
}

variable "cluster_name" {
  type = string
}

variable "task_execution_role_arn" {
  type = string
}

variable "task_role_arn" {
  type = string
}

variable "cloud_map_namespace_name" {
  description = "Cloud Map DNS namespace, e.g. skyline-prod.local"
  type        = string
}

variable "cloud_map_service_arns" {
  description = "Map of service name → Cloud Map service ARN"
  type        = map(string)
}

variable "log_group_names" {
  description = "Map of service name → CloudWatch log group name"
  type        = map(string)
}

variable "frontend_image" {
  type = string
}

variable "backend_image" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "jwt_refresh_secret" {
  type      = string
  sensitive = true
}

variable "admin_email" {
  type    = string
  default = "admin@skyline.local"
}

variable "alb_dns_name" {
  description = "ALB DNS name used as CLIENT_URL for the backend"
  type        = string
}

variable "backend_cpu" {
  type    = number
  default = 512
}

variable "backend_memory" {
  type    = number
  default = 1024
}

variable "frontend_cpu" {
  type    = number
  default = 256
}

variable "frontend_memory" {
  type    = number
  default = 512
}

variable "tags" {
  type    = map(string)
  default = {}
}
