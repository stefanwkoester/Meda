#!/usr/bin/env bash
set -euo pipefail
# Run using your own authorized AWS CLI profile, not platform service credentials.
: "${AWS_REGION:?Set AWS_REGION, e.g. us-west-2}"
: "${MEDA_DOMAIN:?Set MEDA_DOMAIN to a DNS hostname you control}"
: "${MEDA_SOURCE_BUCKET:?Set MEDA_SOURCE_BUCKET to an existing private S3 bucket in this region}"
MEDA_STACK="${MEDA_STACK:-meda-demo}"
MEDA_SOURCE_KEY="meda/source-$(date -u +%Y%m%dT%H%M%SZ).zip"
cd "$(dirname "$0")/../.."
command -v aws >/dev/null || { echo 'Install AWS CLI v2 and sign in to your own AWS account.' >&2; exit 1; }
if aws cloudformation describe-stacks --stack-name "$MEDA_STACK" --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "Stack already exists. Use the documented update procedure; changing UserData does not redeploy the app." >&2; exit 1
fi
aws sts get-caller-identity --query '{Account:Account,Arn:Arn}' --output table
aws cloudformation validate-template --template-body file://infra/aws/demo-stack.yaml --region "$AWS_REGION" >/dev/null
npm ci
npm run build
npm test
node scripts/package-source.mjs
printf '\nThis deployment creates billable EC2, EBS, public IPv4 and Secrets Manager resources in %s. It is for fictional data only.\n' "$AWS_REGION"
printf 'On stack deletion the EC2 instance is terminated; its disk and setup secret are retained to avoid losing data. Review AWS_DEMO.md for cleanup.\n'
read -r -p "Type deploy to create/update the $MEDA_STACK stack: " MEDA_CONFIRM
if [[ "$MEDA_CONFIRM" != deploy ]]; then echo 'Deployment cancelled.'; exit 0; fi
aws s3 cp Meda-source.zip "s3://$MEDA_SOURCE_BUCKET/$MEDA_SOURCE_KEY" --sse AES256 --region "$AWS_REGION" --only-show-errors
aws cloudformation deploy --template-file infra/aws/demo-stack.yaml --stack-name "$MEDA_STACK" --region "$AWS_REGION" --capabilities CAPABILITY_IAM --parameter-overrides "DomainName=$MEDA_DOMAIN" "SourceBucket=$MEDA_SOURCE_BUCKET" "SourceKey=$MEDA_SOURCE_KEY"
aws cloudformation describe-stacks --stack-name "$MEDA_STACK" --region "$AWS_REGION" --query 'Stacks[0].Outputs' --output table
printf '\nSet the domain A record to PublicIp, then verify HTTPS and /api/v1/health. View the setup key in Secrets Manager; never share it in chat.\n'
printf 'Stack creation does not prove application readiness. Follow infra/aws/AWS_DEMO.md before sharing the link.\n'
