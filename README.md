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

1. **Push to ANY branch** in this repo (e.g., `feature/pr-212`, `bugfix-123`, `hotfix-456`, `my-custom-branch`, etc.).
2. GitHub webhook triggers the `lambda-app-pipeline` job (regular Pipeline with `**` branch spec to match all branches).
3. Stage `Checkout Lambda App Code` detects the branch name and extracts a PR number/identifier:
   - **Pattern 1**: Extracts from `pr-123`, `PR-456`, `pr_789` patterns
   - **Pattern 2**: Extracts trailing numbers from `bugfix-123`, `issue-456`, `ticket-789`
   - **Pattern 3**: Extracts any number found in the branch name
   - **Fallback**: Creates unique identifier from branch name + commit hash if no number found
4. Stages 2-6 install dependencies, test, package, and create `config/pr-${PR_NUMBER}` in the infra repo.
5. Stage 7 calls the `infrastructure-pipeline` Jenkins job, passing the same `PR_NUMBER`.
6. The infrastructure job runs CDK (`npx cdk synth/deploy`) and provisions the PR-scoped S3 bucket + Lambda function.
7. After the infra job finishes, stages 8-10 wait for CloudFormation, upload the ZIP to S3, call `aws lambda update-function-code`, and verify the deployment.
8. Both pipelines use the same AWS + GitHub credentials (`aws-credentials`, `github-token`) and expect AWS CLI + Node.js 22.x on the Jenkins agent.

### Branch Naming Flexibility

The pipeline supports **any branch name** and automatically extracts identifiers:
- ✅ `feature/pr-212` → PR number: `212`
- ✅ `bugfix-123` → PR number: `123`
- ✅ `hotfix-456` → PR number: `456`
- ✅ `my-custom-branch` → Unique ID: `my-custom-branch-abc1234` (branch name + commit hash)
- ✅ `release-v2.0` → Unique ID: `release-v2-0-abc1234`

### Jenkins trigger note

Updated to support any branch name with flexible PR number extraction (2025-11-17).

**Test push:** Testing pipeline with branch `feature/pr-212` - should extract PR number `212`.
Removed unwanted lines.