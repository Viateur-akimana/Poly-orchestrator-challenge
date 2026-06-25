variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "state_bucket_name" {
  type    = string
  default = "skyline-terraform-state-764988411222"
}

variable "lock_table_name" {
  type    = string
  default = "skyline-terraform-locks"
}
