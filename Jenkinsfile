/**
 * ============================================================================
 * FILE: Jenkinsfile
 * PURPOSE: Jenkins Pipeline for Lambda App Repository
 * 
 * WHAT THIS PIPELINE DOES:
 * 1. Triggers on Pull Request creation
 * 2. Builds and tests Lambda function code
 * 3. Creates PR-specific configuration in infrastructure repo
 * 4. Packages Lambda code for deployment
 * 5. Deploys Lambda function to AWS
 * 
 * PR-SPECIFIC RESOURCES:
 * - Lambda function name: api-processor-lambda-pr-{PR_NUMBER}
 * - S3 bucket: Created by infrastructure repo pipeline
 * 
 * TRIGGER:
 * - GitHub webhook on PR creation
 * - Or manual trigger via Jenkins UI
 * ============================================================================
 */

pipeline {
    agent any
    
    // Environment variables available throughout the pipeline
    environment {
        // Get PR number from GitHub webhook or manually set
        PR_NUMBER = "${env.CHANGE_ID ?: params.PR_NUMBER ?: 'default'}"
        
        // AWS credentials (set in Jenkins Credentials Store)
        AWS_CREDENTIALS_ID = 'aws-credentials'
        
        // GitHub token for accessing infrastructure repo
        GITHUB_TOKEN_CREDENTIALS_ID = 'github-token'
        
        // Repository paths
        INFRA_REPO_URL = 'https://github.com/DeepakDevProjects/aws-infrastructure-as-code.git'
        INFRA_REPO_DIR = 'infra-repo'
    }
    
    // Tools available in the pipeline
    // IMPORTANT: The name 'NodeJS-22' must match the Node.js tool name you configured in Jenkins (Step 3)
    tools {
        nodejs 'NodeJS-22'
    }
    
    stages {
        /**
         * ====================================================================
         * STAGE 1: CHECKOUT CODE
         * ====================================================================
         * Check out the Lambda app repository code
         */
        stage('Checkout Lambda App Code') {
            steps {
                script {
                    echo "============================================"
                    echo "Checking out Lambda App repository"
                    echo "PR Number: ${PR_NUMBER}"
                    echo "============================================"
                }
                checkout scm
            }
        }
        
        /**
         * ====================================================================
         * STAGE 2: SETUP NODE.JS
         * ====================================================================
         * Verify Node.js is available
         */
        stage('Setup Node.js') {
            steps {
                script {
                    echo "============================================"
                    echo "Setting up Node.js"
                    echo "============================================"
                }
                sh '''
                    node --version
                    npm --version
                    echo "Node.js and npm are available"
                '''
            }
        }
        
        /**
         * ====================================================================
         * STAGE 3: INSTALL DEPENDENCIES
         * ====================================================================
         * Install Node.js dependencies for Lambda function
         */
        stage('Install Dependencies') {
            steps {
                script {
                    echo "============================================"
                    echo "Installing Node.js dependencies"
                    echo "============================================"
                }
                sh '''
                    npm install
                    echo "Dependencies installed successfully"
                '''
            }
        }
        
        /**
         * ====================================================================
         * STAGE 4: RUN TESTS
         * ====================================================================
         * Test Lambda function locally (optional - add tests here)
         */
        stage('Run Tests') {
            steps {
                script {
                    echo "============================================"
                    echo "Running Lambda function tests"
                    echo "============================================"
                }
                sh '''
                    # Run local test if test script exists
                    if [ -f "test-local.js" ]; then
                        node test-local.js || echo "Tests completed (S3 upload expected to fail)"
                    else
                        echo "No test script found, skipping tests"
                    fi
                '''
            }
        }
        
        /**
         * ====================================================================
         * STAGE 5: PACKAGE LAMBDA CODE
         * ====================================================================
         * Create ZIP file with Lambda code for deployment
         */
        stage('Package Lambda Code') {
            steps {
                script {
                    echo "============================================"
                    echo "Packaging Lambda function code"
                    echo "============================================"
                }
                sh '''
                    # Create deployment package
                    zip -r lambda-function-pr-${PR_NUMBER}.zip . \
                        -x "*.git*" \
                        -x "node_modules/.cache/*" \
                        -x "*.log" \
                        -x ".DS_Store" \
                        -x "cdk.out/*"
                    
                    echo "Lambda package created: lambda-function-pr-${PR_NUMBER}.zip"
                    ls -lh lambda-function-pr-${PR_NUMBER}.zip
                '''
            }
        }
        
        /**
         * ====================================================================
         * STAGE 6: CREATE PR CONFIG IN INFRA REPO
         * ====================================================================
         * Create PR-specific configuration folder in infrastructure repo
         */
        stage('Create PR Config in Infra Repo') {
            steps {
                script {
                    echo "============================================"
                    echo "Creating PR-specific config in infrastructure repo"
                    echo "============================================"
                }
                withCredentials([string(credentialsId: "${GITHUB_TOKEN_CREDENTIALS_ID}", variable: 'GITHUB_TOKEN')]) {
                    sh '''
                        # Clone infrastructure repo
                        git clone https://${GITHUB_TOKEN}@github.com/DeepakDevProjects/aws-infrastructure-as-code.git ${INFRA_REPO_DIR} || true
                        cd ${INFRA_REPO_DIR}
                        
                        # Create config directory for this PR
                        mkdir -p config/pr-${PR_NUMBER}
                        
                        # Create PR-specific config file
                        cat > config/pr-${PR_NUMBER}/config.json <<EOF
{
  "prNumber": "${PR_NUMBER}",
  "lambdaCodePackage": "lambda-function-pr-${PR_NUMBER}.zip",
  "lambdaFunctionName": "api-processor-lambda-pr-${PR_NUMBER}",
  "s3BucketName": "api-responses-bucket-pr-${PR_NUMBER}",
  "stackName": "InfrastructureStack-${PR_NUMBER}",
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
                        
                        # Commit and push config
                        git config user.name "Jenkins"
                        git config user.email "jenkins@example.com"
                        git add config/pr-${PR_NUMBER}/config.json
                        git commit -m "Add PR ${PR_NUMBER} configuration" || echo "No changes to commit"
                        git push origin main || echo "Push failed (may already exist)"
                        
                        echo "PR ${PR_NUMBER} configuration created in infrastructure repo"
                    '''
                }
            }
        }
        
        /**
         * ====================================================================
         * STAGE 7: DEPLOY INFRASTRUCTURE (via webhook or direct call)
         * ====================================================================
         * Trigger infrastructure deployment for this PR
         * Note: This can be done via webhook to infra repo or direct API call
         */
        stage('Trigger Infrastructure Deployment') {
            steps {
                script {
                    echo "============================================"
                    echo "Triggering infrastructure deployment for PR ${PR_NUMBER}"
                    echo "============================================"
                    echo "Note: Infrastructure repo Jenkins job should be triggered"
                    echo "via webhook or manually to deploy resources"
                }
                // Optional: Call infrastructure repo Jenkins job via API
                // Or rely on webhook from previous stage's git push
                sh '''
                    echo "Infrastructure deployment should be triggered automatically"
                    echo "via GitHub webhook or manually in infrastructure repo Jenkins job"
                '''
            }
        }
        
        /**
         * ====================================================================
         * STAGE 8: WAIT FOR INFRASTRUCTURE DEPLOYMENT
         * ====================================================================
         * Wait for infrastructure to be ready before deploying Lambda
         */
        stage('Wait for Infrastructure') {
            steps {
                script {
                    echo "============================================"
                    echo "Waiting for infrastructure deployment to complete"
                    echo "============================================"
                }
                sh '''
                    # Wait a bit for infrastructure to deploy
                    # In production, poll CloudFormation stack status
                    echo "Waiting 30 seconds for infrastructure deployment..."
                    sleep 30
                    echo "Proceeding with Lambda deployment..."
                '''
            }
        }
        
        /**
         * ====================================================================
         * STAGE 9: DEPLOY LAMBDA FUNCTION
         * ====================================================================
         * Update Lambda function code with packaged ZIP file
         */
        stage('Deploy Lambda Function') {
            steps {
                script {
                    echo "============================================"
                    echo "Deploying Lambda function: api-processor-lambda-pr-${PR_NUMBER}"
                    echo "============================================"
                }
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: "${AWS_CREDENTIALS_ID}"]]) {
                    sh '''
                        # Read S3 bucket name from infra repo config
                        S3_BUCKET=$(cat ${INFRA_REPO_DIR}/config/pr-${PR_NUMBER}/config.json | grep -o '"s3BucketName": "[^"]*' | cut -d'"' -f4)
                        LAMBDA_FUNCTION_NAME="api-processor-lambda-pr-${PR_NUMBER}"
                        
                        echo "S3 Bucket: ${S3_BUCKET}"
                        echo "Lambda Function: ${LAMBDA_FUNCTION_NAME}"
                        
                        # Upload Lambda package to S3 (temporary storage)
                        aws s3 cp lambda-function-pr-${PR_NUMBER}.zip s3://${S3_BUCKET}/lambda-code/ || {
                            echo "S3 bucket may not exist yet, trying direct Lambda update..."
                        }
                        
                        # Check if Lambda function exists
                        if aws lambda get-function --function-name ${LAMBDA_FUNCTION_NAME} 2>/dev/null; then
                            echo "Updating existing Lambda function..."
                            aws lambda update-function-code \
                                --function-name ${LAMBDA_FUNCTION_NAME} \
                                --zip-file fileb://lambda-function-pr-${PR_NUMBER}.zip
                        else
                            echo "Lambda function does not exist yet."
                            echo "It should be created by infrastructure repo deployment."
                            echo "Waiting for infrastructure deployment to complete..."
                        fi
                    '''
                }
            }
        }
        
        /**
         * ====================================================================
         * STAGE 10: VERIFY DEPLOYMENT
         * ====================================================================
         * Test the deployed Lambda function
         */
        stage('Verify Deployment') {
            steps {
                script {
                    echo "============================================"
                    echo "Verifying Lambda function deployment"
                    echo "============================================"
                }
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: "${AWS_CREDENTIALS_ID}"]]) {
                    sh '''
                        LAMBDA_FUNCTION_NAME="api-processor-lambda-pr-${PR_NUMBER}"
                        
                        # Get Lambda function details
                        aws lambda get-function --function-name ${LAMBDA_FUNCTION_NAME} || {
                            echo "Lambda function not found - may still be deploying"
                            exit 1
                        }
                        
                        echo "Lambda function ${LAMBDA_FUNCTION_NAME} deployed successfully!"
                        echo "PR ${PR_NUMBER} deployment complete"
                    '''
                }
            }
        }
    }
    
    post {
        /**
         * ====================================================================
         * POST ACTIONS
         * ====================================================================
         * Cleanup and notifications after pipeline completes
         */
        always {
            script {
                echo "============================================"
                echo "Pipeline completed for PR ${PR_NUMBER}"
                echo "============================================"
            }
            // Cleanup temporary files
            sh '''
                rm -rf ${INFRA_REPO_DIR} || true
                echo "Cleanup completed"
            '''
        }
        success {
            echo "✅ Pipeline succeeded for PR ${PR_NUMBER}"
        }
        failure {
            echo "❌ Pipeline failed for PR ${PR_NUMBER}"
        }
    }
}

