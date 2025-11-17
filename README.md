# AWS Serverless Lambda App

A Lambda function that makes an API call, processes the data, and writes the response to S3.

## Overview

- **Runtime**: Node.js 22.x
- **Function**: Makes API call → Processes data → Writes to S3

## Project Structure

```
aws-serverless-lambda-app/
├── src/
│   └── index.js          # Lambda handler function
├── package.json          # Dependencies
├── .gitignore
└── README.md
```

## Dependencies

- `@aws-sdk/client-s3`: AWS SDK v3 for S3 operations

## Environment Variables

- `AWS_REGION`: AWS region (default: us-east-1)
- `S3_BUCKET_NAME`: S3 bucket name for storing responses (required)
- `API_URL`: API endpoint URL (default: https://jsonplaceholder.typicode.com/posts/1)

## Local Testing

To test locally, install dependencies:

```bash
npm install
```

## Deployment

Deployment is fully automated via Jenkins (Node.js 22.x everywhere):

## CI/CD Flow

1. Push to a feature branch named like `feature/pr-212` in this repo.
2. GitHub webhook triggers the `lambda-app-pipeline` job (regular Pipeline with `*/feature/*` branch spec).
3. Stage `Checkout Lambda App Code` detects the PR number from the webhook/branch name and sets `PR_NUMBER`.
4. Stages 2-6 install dependencies, test, package, and create `config/pr-${PR_NUMBER}` in the infra repo.
5. Stage 7 calls the `infrastructure-pipeline` Jenkins job, passing the same `PR_NUMBER`.
6. The infrastructure job runs CDK (`npx cdk synth/deploy`) and provisions the PR-scoped S3 bucket + Lambda function.
7. After the infra job finishes, stages 8-10 wait for CloudFormation, upload the ZIP to S3, call `aws lambda update-function-code`, and verify the deployment.
8. Both pipelines use the same AWS + GitHub credentials (`aws-credentials`, `github-token`) and expect AWS CLI + Node.js 22.x on the Jenkins agent.

### Jenkins trigger note

Testing improved PR number detection from branch names (2025-11-17).