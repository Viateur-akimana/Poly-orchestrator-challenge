output "cluster_id" {
  value = aws_ecs_cluster.this.id
}

output "cluster_name" {
  value = aws_ecs_cluster.this.name
}

# Map of service name → CloudWatch log group name
output "log_group_names" {
  value = { for k, v in aws_cloudwatch_log_group.services : k => v.name }
}
