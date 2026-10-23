# AWS hosted demo — fictional data only

This deployment runs the working app on one EC2 instance with an encrypted 20 GB EBS root disk, private on-disk SQLite/media storage, Secrets Manager setup key, and Caddy HTTPS. It is designed for controlled provider feedback on fictional records, not PHI. It does not implement the clinical Cognito/RDS/S3 architecture described in `AWS_SECURITY_DEPLOYMENT.md`.

## Prerequisites and costs

Use your own authorized AWS account and CLI v2 profile. This Codex environment has no connected customer AWS credentials. Never paste keys or passwords in chat.

You need an AWS region, a DNS hostname you control, and an existing **private** S3 bucket in the same region for the source bundle. The deploy script uploads with S3 server-side encryption. The EC2 role can read only the specified artifact object and its generated setup secret; it uses the AWS-managed SSM policy for administration.

The stack creates billable EC2 (`t3.small` by default), encrypted EBS, a public IPv4 address, and Secrets Manager resources. S3 storage/data transfer and DNS may also cost money. Review current AWS pricing before deploying; no resources are created by building or linting the files.

## Deploy

From the repository root, authenticate to your own AWS account, then set these non-secret values:

```sh
export AWS_REGION=us-west-2
export MEDA_DOMAIN=meda-demo.your-domain.example
export MEDA_SOURCE_BUCKET=your-existing-private-source-bucket
export MEDA_STACK=meda-demo
bash infra/aws/deploy.sh
```

The script shows the AWS identity, validates the template, builds/tests/packages the source, and asks for an explicit `deploy` confirmation before creating billable resources. The source ZIP excludes account databases, private media, credentials and `.env` files. It does not require public GitHub repository access from the instance.

After stack creation:

1. Set your domain's DNS A record to the `PublicIp` output. Do not create a conflicting AAAA record. Caddy retries certificate issuance after DNS propagation.
2. Use AWS Systems Manager Session Manager for administration. No SSH port or key pair is exposed. Review `/var/log/cloud-init-output.log` if initialization fails; never dump `/opt/meda/server.env` into logs or chat.
3. Verify HTTPS and `https://your-domain/api/v1/health` return successfully. Stack creation alone does not prove the app booted.
4. Open the website. View the generated setup key securely in AWS Secrets Manager using `SetupSecretArn`; enter it directly into the website's first-run setup form. Create your admin account and add provider/staff accounts in Settings. There are no default passwords.
5. Test provider sign-in, patient/encounter/procedure creation, upload/review/gallery, logout/login, and a restart before sharing the URL. Upload synthetic files only.

## Updates and recovery

The deploy script intentionally refuses an existing stack. Updating EC2 UserData does not re-run cloud-init and must not be mistaken for an app deployment.

For an existing demo, use Session Manager. Upload a new reviewed source bundle to your private artifact bucket, download/extract it into a new directory, and build the new Docker image first. During a short maintenance window stop the `meda` container, archive `/opt/meda/data` securely, remove only the old app container, and start the new image with the existing `/opt/meda/server.env`, `/opt/meda/data:/data` volume, `meda` network, and `--restart unless-stopped`. Keep the previous image for rollback. Verify health and data before reopening access. The Caddy container does not need replacement for ordinary app updates.

Back up database **and media together**. Restore to a separate test directory/container and verify records and original file hashes; backup existence alone is not a restore test. This release does not automate backup rotation, instance patching, monitoring, or disaster recovery.

## Retention / cleanup

Deleting the CloudFormation stack terminates EC2 and releases its Elastic IP. Its encrypted EBS root disk is configured **not** to delete on termination, and its setup secret has `Retain`. Those retained resources continue costing money. Snapshot or recover data before explicitly deleting orphaned volumes and secrets. Delete old private S3 source bundles separately. Review the AWS console for remaining resources; do not assume stack deletion removed all charges.

## Validation status

Local app/API/browser tests and Docker verification are reported in `VALIDATION.md`. The CloudFormation template is prepared for account-side validation/deployment. No public AWS URL is claimed until deployment and the functional checks above succeed in your account.
