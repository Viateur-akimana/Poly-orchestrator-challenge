variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "kubernetes_version" {
  type    = string
  default = "1.29"
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  description = "Subnets for the EKS control plane (mix of public and private)"
  type        = list(string)
}

variable "tags" {
  type    = map(string)
  default = {}
}
