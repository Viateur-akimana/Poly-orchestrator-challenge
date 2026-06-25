locals {
  name = "${var.project}-${var.environment}"
}

resource "aws_service_discovery_private_dns_namespace" "this" {
  name        = "${local.name}.local"
  vpc         = var.vpc_id
  description = "Private DNS for ${local.name} ECS services"
  tags        = var.tags
}

# One service registration per backend tier
resource "aws_service_discovery_service" "services" {
  for_each = toset(["backend", "redis", "postgres"])

  name = each.key

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.this.id
    routing_policy = "MULTIVALUE"
    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config { failure_threshold = 1 }
}
