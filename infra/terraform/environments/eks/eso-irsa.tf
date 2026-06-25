data "aws_caller_identity" "current" {}

locals {
  oidc_issuer = replace(module.eks_cluster.oidc_provider_url, "https://", "")
}

data "aws_iam_policy_document" "eso_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [module.eks_cluster.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_issuer}:sub"
      values   = ["system:serviceaccount:external-secrets:external-secrets"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_issuer}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "eso" {
  name               = "skyline-external-secrets"
  assume_role_policy = data.aws_iam_policy_document.eso_assume.json
  tags               = local.tags
}

resource "aws_iam_role_policy" "eso" {
  name = "skyline-external-secrets-policy"
  role = aws_iam_role.eso.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = "arn:aws:secretsmanager:us-east-1:${data.aws_caller_identity.current.account_id}:secret:skyline/*"
    }]
  })
}

output "eso_role_arn" {
  description = "Annotate the external-secrets service account with this ARN"
  value       = aws_iam_role.eso.arn
}
