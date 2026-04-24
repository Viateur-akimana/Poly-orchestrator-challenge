output "namespace_id" {
  value = aws_service_discovery_private_dns_namespace.this.id
}

output "namespace_name" {
  description = "DNS namespace, e.g. skyline-prod.local"
  value       = aws_service_discovery_private_dns_namespace.this.name
}

# Map of service name → service ARN, e.g. { backend = "arn:..." }
output "service_arns" {
  value = { for k, v in aws_service_discovery_service.services : k => v.arn }
}
