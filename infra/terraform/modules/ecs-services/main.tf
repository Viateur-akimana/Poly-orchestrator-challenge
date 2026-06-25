locals {
  name = "${var.project}-${var.environment}"
  # DNS names resolved via Cloud Map, e.g. backend.skyline-prod.local
  backend_dns  = "backend.${var.cloud_map_namespace_name}"
  redis_dns    = "redis.${var.cloud_map_namespace_name}"
  postgres_dns = "postgres.${var.cloud_map_namespace_name}"
}

# ─── Security Groups ──────────────────────────────────────────────────────────

resource "aws_security_group" "frontend" {
  name        = "${local.name}-frontend-sg"
  vpc_id      = var.vpc_id
  description = "Frontend tasks: allow traffic from ALB"

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [var.alb_sg_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${local.name}-frontend-sg" })
}

resource "aws_security_group" "backend" {
  name        = "${local.name}-backend-sg"
  vpc_id      = var.vpc_id
  description = "Backend tasks: allow traffic from frontend tasks"

  ingress {
    from_port       = 5004
    to_port         = 5004
    protocol        = "tcp"
    security_groups = [aws_security_group.frontend.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${local.name}-backend-sg" })
}

resource "aws_security_group" "data" {
  name        = "${local.name}-data-sg"
  vpc_id      = var.vpc_id
  description = "Redis + Postgres: allow traffic from backend tasks and EFS mounts"

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  # EFS NFS port
  ingress {
    from_port   = 2049
    to_port     = 2049
    protocol    = "tcp"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${local.name}-data-sg" })
}

# ─── EFS for Postgres persistence ─────────────────────────────────────────────

resource "aws_efs_file_system" "postgres" {
  creation_token   = "${local.name}-postgres-efs"
  performance_mode = "generalPurpose"
  encrypted        = true
  tags             = merge(var.tags, { Name = "${local.name}-postgres-efs" })
}

resource "aws_efs_mount_target" "postgres" {
  count           = length(var.private_subnet_ids)
  file_system_id  = aws_efs_file_system.postgres.id
  subnet_id       = var.private_subnet_ids[count.index]
  security_groups = [aws_security_group.data.id]
}

# ─── Task Definitions ─────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "redis" {
  family                   = "${local.name}-redis"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([{
    name      = "redis"
    image     = "redis:7-alpine"
    essential = true
    portMappings = [{ containerPort = 6379, protocol = "tcp" }]
    command   = ["redis-server", "--save", "60", "1"]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = var.log_group_names["redis"]
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "redis"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "redis-cli ping || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 10
    }
  }])

  tags = var.tags
}

resource "aws_ecs_task_definition" "postgres" {
  family                   = "${local.name}-postgres"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn            = var.task_role_arn

  volume {
    name = "postgres-data"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.postgres.id
      root_directory = "/"
    }
  }

  container_definitions = jsonencode([{
    name      = "postgres"
    image     = "postgres:15-alpine"
    essential = true
    portMappings = [{ containerPort = 5432, protocol = "tcp" }]
    environment = [
      { name = "POSTGRES_DB",       value = "skyline" },
      { name = "POSTGRES_USER",     value = "skyline_user" },
      { name = "POSTGRES_PASSWORD", value = var.db_password }
    ]
    mountPoints = [{
      sourceVolume  = "postgres-data"
      containerPath = "/var/lib/postgresql/data"
      readOnly      = false
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = var.log_group_names["postgres"]
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "postgres"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "pg_isready -U skyline_user -d skyline || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 5
      startPeriod = 30
    }
  }])

  tags = var.tags
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([{
    name      = "backend"
    image     = var.backend_image
    essential = true
    portMappings = [{ containerPort = 5004, protocol = "tcp" }]
    environment = [
      { name = "NODE_ENV",               value = "production" },
      { name = "PORT",                   value = "5004" },
      { name = "DATABASE_URL",           value = "postgresql://skyline_user:${var.db_password}@${local.postgres_dns}:5432/skyline" },
      { name = "REDIS_URL",              value = "redis://${local.redis_dns}:6379" },
      { name = "JWT_SECRET",             value = var.jwt_secret },
      { name = "JWT_REFRESH_SECRET",     value = var.jwt_refresh_secret },
      { name = "ADMIN_EMAIL",            value = var.admin_email },
      { name = "CLIENT_URL",             value = "http://${var.alb_dns_name}" }
    ]
    command = ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = var.log_group_names["backend"]
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "backend"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "node -e \"require('http').get('http://localhost:5004/health',(r)=>{process.exit(r.statusCode===200?0:1)})\" || exit 1"]
      interval    = 30
      timeout     = 10
      retries     = 3
      startPeriod = 60
    }
  }])

  tags = var.tags
}

resource "aws_ecs_task_definition" "frontend" {
  family                   = "${local.name}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.frontend_cpu
  memory                   = var.frontend_memory
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([{
    name      = "frontend"
    image     = var.frontend_image
    essential = true
    portMappings = [{ containerPort = 80, protocol = "tcp" }]
    environment = [
      { name = "BACKEND_HOST", value = local.backend_dns }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = var.log_group_names["frontend"]
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "frontend"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "wget -qO- http://localhost/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 20
    }
  }])

  tags = var.tags
}

# ─── ECS Services ─────────────────────────────────────────────────────────────

resource "aws_ecs_service" "redis" {
  name            = "${local.name}-redis"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.redis.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.data.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = var.cloud_map_service_arns["redis"]
  }

  tags = var.tags
}

resource "aws_ecs_service" "postgres" {
  name            = "${local.name}-postgres"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.postgres.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.data.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = var.cloud_map_service_arns["postgres"]
  }

  depends_on = [aws_efs_mount_target.postgres]
  tags       = var.tags
}

resource "aws_ecs_service" "backend" {
  name            = "${local.name}-backend"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.backend.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = var.cloud_map_service_arns["backend"]
  }

  depends_on = [aws_ecs_service.postgres, aws_ecs_service.redis]
  tags       = var.tags
}

resource "aws_ecs_service" "frontend" {
  name            = "${local.name}-frontend"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.frontend.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arn
    container_name   = "frontend"
    container_port   = 80
  }

  depends_on = [aws_ecs_service.backend]
  tags       = var.tags
}
