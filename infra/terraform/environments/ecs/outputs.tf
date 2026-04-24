output "app_url" {
  description = "Public URL of the application"
  value       = "http://${module.alb.alb_dns_name}"
}

output "ecr_frontend_url" {
  value = module.ecr.frontend_repo_url
}

output "ecr_backend_url" {
  value = module.ecr.backend_repo_url
}

output "ecs_cluster_name" {
  value = module.ecs_cluster.cluster_name
}

output "cloud_map_namespace" {
  value = module.cloud_map.namespace_name
}
