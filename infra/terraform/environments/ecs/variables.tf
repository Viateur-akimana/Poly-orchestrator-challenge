variable "project" {
  type    = string
  default = "skyline"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
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

variable "frontend_image" {
  description = "Full ECR image URI for the frontend, e.g. 123456.dkr.ecr.us-east-1.amazonaws.com/skyline-prod-frontend:latest"
  type        = string
}

variable "backend_image" {
  description = "Full ECR image URI for the backend"
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
