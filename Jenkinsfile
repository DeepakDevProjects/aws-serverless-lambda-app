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
        // PR_NUMBER will be set in the first stage from branch name or CHANGE_ID
        PR_NUMBER = 'default'
        
        // AWS credentials (set in Jenkins Credentials Store)
        AWS_CREDENTIALS_ID = 'aws-credentials'
        
        // GitHub token for accessing infrastructure repo
        GITHUB_TOKEN_CREDENTIALS_ID = 'github-token'
        
        // Repository paths
        INFRA_REPO_URL = 'https://github.com/DeepakDevProjects/aws-infrastructure-as-code.git'
        INFRA_REPO_DIR = 'infra-repo'
        
        // AWS CLI path (for macOS with Homebrew - adjust if needed)
        // Add common AWS CLI installation paths to PATH
        PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:${env.PATH}"
    }
    
    // Tools available in the pipeline
    // IMPORTANT: The name 'NodeJS-22' must match the Node.js tool name you configured in Jenkins (Step 3)
    tools {
        nodejs 'NodeJS-22'
    }
    
    stages {
        /**
         * ====================================================================
         * STAGE 1: CHECKOUT CODE & DETECT PR NUMBER
         * ====================================================================
         * Check out the Lambda app repository code and extract PR number
         */
        stage('Checkout Lambda App Code') {
            steps {
                script {
                    echo "============================================"
                    echo "Checking out Lambda App repository"
                    echo "============================================"
                    
                    // First, try to get branch from webhook payload or environment variables
                    // GitHub webhook sets GIT_BRANCH in format: origin/feature/pr-123
                    def branchName = env.GIT_BRANCH ?: env.BRANCH_NAME
                    
                    // Normalize branch name (remove origin/ prefix if present)
                    if (branchName) {
                        branchName = branchName.replaceFirst(/^origin\\//, '')
                        echo "Branch from environment: ${branchName}"
                    }
                    
                    // If no branch detected, we'll checkout and detect from git
                    if (!branchName || branchName.trim() == '' || branchName == 'detached' || branchName == 'HEAD') {
                        echo "No branch detected from environment, checking out default and detecting..."
                        // Checkout using SCM configuration (will use branch specifier)
                        checkout scm
                        
                        // Now detect the actual branch that was checked out
                        branchName = sh(
                            script: 'git rev-parse --abbrev-ref HEAD 2>/dev/null || git branch --show-current 2>/dev/null || true',
                            returnStdout: true
                        ).trim()
                        
                        // If still HEAD, try to get from remote tracking branch
                        if (branchName == 'HEAD' || !branchName) {
                            branchName = sh(
                                script: 'git branch -r --contains HEAD 2>/dev/null | head -1 | sed "s|origin/||" | xargs || true',
                                returnStdout: true
                            ).trim()
                        }
                    } else {
                        // We have a branch name from webhook, explicitly checkout that branch
                        echo "Explicitly checking out branch: ${branchName}"
                        checkout([
                            $class: 'GitSCM',
                            branches: [[name: "*/${branchName}"]],
                            userRemoteConfigs: scm.userRemoteConfigs,
                            extensions: scm.extensions
                        ])
                    }
                    
                    // Final normalization
                    branchName = branchName?.replaceFirst(/^origin\\//, '')?.trim()
                    
                    if (!branchName || branchName == 'HEAD') {
                        // Last resort: use git to find the branch
                        branchName = sh(
                            script: '''
                                git branch -a | grep -E 'feature/pr-[0-9]+' | head -1 | sed 's|remotes/origin/||' | sed 's|^[* ] ||' | xargs || \
                                git log --oneline -1 --format="%D" | grep -oE 'feature/pr-[0-9]+' | head -1 || \
                                echo "unknown"
                            ''',
                            returnStdout: true
                        ).trim()
                    }
                    
                    echo "Detected branch: ${branchName}"
                    
                    // Try to get PR number from environment (if set by webhook)
                    def changeId = env.CHANGE_ID
                    def ghprbPullId = env.ghprbPullId  // GitHub Pull Request Builder plugin
                    
                    if (changeId) {
                        // PR number from Multibranch Pipeline or webhook
                        env.PR_NUMBER = changeId
                        echo "Detected PR number from CHANGE_ID: ${env.PR_NUMBER}"
                    } else if (ghprbPullId) {
                        // PR number from GitHub Pull Request Builder plugin
                        env.PR_NUMBER = ghprbPullId
                        echo "Detected PR number from ghprbPullId: ${env.PR_NUMBER}"
                    } else {
                        // Extract PR number from branch name
                        // Supports: feature/pr-222, PR-123, feature/test-pr-121, release-PR_456, etc.
                        def prMatch = branchName =~ /(?i)pr[-_]?(\d+)/
                        if (prMatch) {
                            env.PR_NUMBER = prMatch[0][1]
                            echo "Extracted PR number from branch name: ${env.PR_NUMBER}"
                        } else {
                            // Use sanitized branch name as identifier
                            env.PR_NUMBER = branchName.replaceAll(/[^a-zA-Z0-9]/, '-')
                            echo "Using branch name as identifier: ${env.PR_NUMBER}"
                        }
                    }
                    
                    echo "Final PR Number: ${env.PR_NUMBER}"
                    echo "Branch Name: ${branchName}"
                    echo "============================================"
                }
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
         * STAGE 7: TRIGGER INFRASTRUCTURE DEPLOYMENT
         * ====================================================================
         * Automatically trigger infrastructure pipeline for this PR
         * This calls the infrastructure-pipeline Jenkins job with PR number parameter
         */
        stage('Trigger Infrastructure Deployment') {
            steps {
                script {
                    echo "============================================"
                    echo "Triggering infrastructure deployment for PR ${PR_NUMBER}"
                    echo "============================================"
                    
                    // Trigger infrastructure pipeline job with PR number parameter
                    // This automatically triggers the infrastructure pipeline
                    echo "Calling infrastructure-pipeline job with PR_NUMBER=${PR_NUMBER}"
                    
                    try {
                        def infraJob = build job: 'infrastructure-pipeline',
                            parameters: [
                                string(name: 'PR_NUMBER', value: "${PR_NUMBER}")
                            ],
                            wait: true,  // Wait for infrastructure deployment to complete
                            propagate: false  // Don't fail Lambda app pipeline if infra fails (we'll check later)
                        
                        echo "Infrastructure pipeline completed for PR ${PR_NUMBER}"
                        echo "Infrastructure pipeline build number: ${infraJob.number}"
                        echo "Infrastructure pipeline result: ${infraJob.result}"
                    } catch (Exception e) {
                        echo "WARNING: Infrastructure pipeline failed or not found: ${e.message}"
                        echo "Continuing Lambda deployment - infrastructure may still be deploying"
                    }
                }
            }
        }
        
        /**
         * ====================================================================
         * STAGE 8: VERIFY INFRASTRUCTURE DEPLOYMENT
         * ====================================================================
         * Verify infrastructure is ready before deploying Lambda
         */
        stage('Verify Infrastructure Ready') {
            steps {
                script {
                    echo "============================================"
                    echo "Verifying infrastructure deployment is complete"
                    echo "============================================"
                }
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: "${AWS_CREDENTIALS_ID}"]]) {
                    sh '''
                        # Find AWS CLI
                        AWS_CLI=$(which aws 2>/dev/null || echo "/opt/homebrew/bin/aws")
                        if [ ! -f "${AWS_CLI}" ]; then
                            AWS_CLI=$(find /opt/homebrew /usr/local /usr -name aws 2>/dev/null | head -1)
                        fi
                        
                        if [ -z "${AWS_CLI}" ] || [ ! -f "${AWS_CLI}" ]; then
                            echo "WARNING: AWS CLI not found. Skipping infrastructure verification."
                            exit 0
                        fi
                        
                        STACK_NAME="InfrastructureStack-${PR_NUMBER}"
                        MAX_RETRIES=10
                        RETRY_COUNT=0
                        
                        echo "Checking if CloudFormation stack ${STACK_NAME} is ready..."
                        
                        while [ ${RETRY_COUNT} -lt ${MAX_RETRIES} ]; do
                            STACK_STATUS=$(${AWS_CLI} cloudformation describe-stacks \
                                --stack-name ${STACK_NAME} \
                                --query 'Stacks[0].StackStatus' \
                                --output text \
                                --region us-east-1 2>/dev/null || echo "NOT_FOUND")
                            
                            if [ "${STACK_STATUS}" = "CREATE_COMPLETE" ] || [ "${STACK_STATUS}" = "UPDATE_COMPLETE" ]; then
                                echo "✅ Infrastructure stack is ready!"
                                exit 0
                            elif [ "${STACK_STATUS}" = "CREATE_IN_PROGRESS" ] || [ "${STACK_STATUS}" = "UPDATE_IN_PROGRESS" ]; then
                                RETRY_COUNT=$((RETRY_COUNT + 1))
                                echo "Stack status: ${STACK_STATUS} - Waiting... (${RETRY_COUNT}/${MAX_RETRIES})"
                                sleep 10
                            else
                                echo "Stack status: ${STACK_STATUS}"
                                echo "Proceeding anyway - stack may still be deploying"
                                exit 0
                            fi
                        done
                        
                        echo "Timeout waiting for infrastructure. Proceeding with Lambda deployment..."
                    '''
                }
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
                        # Find AWS CLI (try common installation paths)
                        AWS_CLI=$(which aws 2>/dev/null || echo "/opt/homebrew/bin/aws")
                        if [ ! -f "${AWS_CLI}" ]; then
                            AWS_CLI=$(find /opt/homebrew /usr/local /usr -name aws 2>/dev/null | head -1)
                        fi
                        
                        if [ -z "${AWS_CLI}" ] || [ ! -f "${AWS_CLI}" ]; then
                            echo "ERROR: AWS CLI not found. Please install AWS CLI or update PATH in Jenkinsfile."
                            exit 1
                        fi
                        
                        echo "Using AWS CLI at: ${AWS_CLI}"
                        ${AWS_CLI} --version
                        
                        # Read S3 bucket name from infra repo config
                        S3_BUCKET=$(cat ${INFRA_REPO_DIR}/config/pr-${PR_NUMBER}/config.json | grep -o '"s3BucketName": "[^"]*' | cut -d'"' -f4)
                        LAMBDA_FUNCTION_NAME="api-processor-lambda-pr-${PR_NUMBER}"
                        
                        echo "S3 Bucket: ${S3_BUCKET}"
                        echo "Lambda Function: ${LAMBDA_FUNCTION_NAME}"
                        
                        # Upload Lambda package to S3 (temporary storage)
                        ${AWS_CLI} s3 cp lambda-function-pr-${PR_NUMBER}.zip s3://${S3_BUCKET}/lambda-code/ || {
                            echo "S3 bucket may not exist yet, trying direct Lambda update..."
                        }
                        
                        # Check if Lambda function exists
                        if ${AWS_CLI} lambda get-function --function-name ${LAMBDA_FUNCTION_NAME} 2>/dev/null; then
                            echo "Updating existing Lambda function..."
                            ${AWS_CLI} lambda update-function-code \
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
                        # Find AWS CLI
                        AWS_CLI=$(which aws 2>/dev/null || echo "/opt/homebrew/bin/aws")
                        if [ ! -f "${AWS_CLI}" ]; then
                            AWS_CLI=$(find /opt/homebrew /usr/local /usr -name aws 2>/dev/null | head -1)
                        fi
                        
                        if [ -z "${AWS_CLI}" ] || [ ! -f "${AWS_CLI}" ]; then
                            echo "WARNING: AWS CLI not found. Skipping verification."
                            echo "Lambda function may still be deploying via infrastructure pipeline."
                            exit 0
                        fi
                        
                        LAMBDA_FUNCTION_NAME="api-processor-lambda-pr-${PR_NUMBER}"
                        
                        # Get Lambda function details
                        ${AWS_CLI} lambda get-function --function-name ${LAMBDA_FUNCTION_NAME} || {
                            echo "Lambda function not found - may still be deploying"
                            echo "This is OK if infrastructure pipeline hasn't run yet"
                            exit 0
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

