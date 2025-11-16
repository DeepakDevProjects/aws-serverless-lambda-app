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

Deployment will be handled via Jenkins pipeline (coming soon).

jhghjghgsdsd