# AWS infrastructure, HIPAA-oriented safeguards and pilot release gates

## Recommended topology
AWS account dedicated to Meda pilot, isolated dev/stage/prod accounts or strong environment boundaries; US region selected with clinic. Frontend static app behind CloudFront/S3 private origin or Amplify only after verifying HIPAA eligibility and BAA coverage; API on ECS Fargate behind ALB (or equivalent supported managed runtime), private RDS PostgreSQL, private S3 media bucket, SQS queue, background worker, Cognito user pool for email/password with MFA (require MFA for pilot), Secrets Manager, KMS, CloudWatch with PHI redaction, WAF, VPC/private subnets, VPC endpoints as feasible. Terraform or CDK under `infra/`, reproducible, no manual secrets.

## Requirements
- Execute AWS BAA and confirm every AWS service processing PHI is HIPAA-eligible under current AWS terms; separately vet third-party email, video processing, error monitoring, Mentra SDK/bridge and other subprocessors.
- TLS everywhere; encryption at rest with managed keys, strict IAM least privilege, no public S3 access, signed URLs short TTL, bucket versioning/object lock as policy warrants, key rotation and backup.
- Cognito or comparable managed identity; invite-only registration, strong password policy, MFA, rate limiting, session timeout, server-side authorization on every request, revoke sessions, password reset.
- Audit record views, downloads, exports, writes, patient reassignment, edits, login and admin actions; immutable/restricted audit storage and defined retention. Do not put patient identifiers, names, note text or media URLs in logs.
- Security headers, CSRF defense if cookie sessions, HttpOnly Secure SameSite cookies, CSP, no PHI analytics, no third-party tracking pixels, no client localStorage for tokens or PHI, no public caching of patient assets.
- Virus scanning, media format allowlist, file size quotas, upload checksum, derivative pipelines, backup restore drills, disaster recovery objectives, retention/deletion policy approved by clinic, breach response plan.
- Consent documentation and scope checks; institute-specific policy for recording, especially audio, patient privacy and staff/bystanders; do not presume one generic consent covers all modalities.
- CSV import in encrypted processing path with purge policy; validation and duplicate detection.

## Infrastructure deliverables Codex must create
`infra/` IaC for network, compute, RDS, S3, KMS, queues, auth, monitoring, IAM, CI OIDC deploy role, secrets placeholders; migration and rollback strategy; Docker Compose for local development with synthetic data only; `.env.example` with NO credentials; environment-specific config; deploy and rollback scripts; restore runbook; security scan CI; OpenAPI and seed fixture.

## Release gates (hard stop for real PHI)
1. Signed AWS BAA and third-party BAAs where required; clinic counsel/compliance approval.
2. Clinical governance sign-off for photography/video/audio consent, retention, access and incident handling.
3. Threat model and independent penetration/security assessment with critical/high issues resolved.
4. RBAC/tenant isolation and audit test evidence; encryption and secrets verified.
5. Data retention, backup restore, monitoring, incident response and access review rehearsed.
6. Real device vendor review before glasses pilot; web-only clinical pilot may precede Mentra integration if consent and security gates pass.
7. Clinical staff training, SOPs for wrong-patient capture and reassignment, lost devices and downtime.

**Never label app HIPAA-compliant solely because it uses AWS or encryption.**
