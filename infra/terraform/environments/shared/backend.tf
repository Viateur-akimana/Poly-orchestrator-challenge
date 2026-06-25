terraform {
  backend "s3" {
    bucket         = "skyline-terraform-state-764988411222"
    key            = "shared/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    use_lockfile   = true
  }
}
