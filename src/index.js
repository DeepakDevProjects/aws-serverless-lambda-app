/**
 * ============================================================================
 * FILE: src/index.js
 * PURPOSE: This is the main Lambda function handler file
 * 
 * WHAT THIS FILE DOES:
 * 1. This is the entry point for AWS Lambda function
 * 2. Makes an API call to an external service
 * 3. Processes/transforms the API response (business logic)
 * 4. Writes the processed data to AWS S3 bucket
 * 
 * HOW LAMBDA WORKS:
 * - AWS Lambda runs this code when triggered
 * - Lambda provides 'event' (input data) and 'context' (runtime info)
 * - Our handler function processes the request and returns a response
 * 
 * RUNTIME: Node.js 22.x (configured in AWS Lambda console/CDK)
 * ============================================================================
 */

/**
 * AWS SDK v3 - Import only what we need (better performance)
 * 
 * S3Client: Client object to interact with S3 service
 * PutObjectCommand: Command to upload a file/object to S3 bucket
 * 
 * Why AWS SDK v3? It's modular - only loads what you need, reducing bundle size
 */
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

/**
 * Initialize S3 Client
 * 
 * This creates a connection object to AWS S3 service
 * - region: Which AWS region to use (us-east-1, us-west-2, etc.)
 * - process.env.AWS_REGION: Reads from environment variable (set in Lambda config)
 * - 'us-east-1' is the default if environment variable is not set
 * 
 * Why environment variable? So we can deploy to different AWS regions easily
 */
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * ============================================================================
 * LAMBDA HANDLER FUNCTION
 * ============================================================================
 * 
 * This is THE function that AWS Lambda calls when your function is invoked
 * 
 * @param {Object} event - Data passed to Lambda (can be from API Gateway, S3, etc.)
 *                         Example: { "userId": 123, "action": "process" }
 * 
 * @param {Object} context - Runtime information about Lambda execution
 *                          - context.requestId: Unique ID for this execution
 *                          - context.functionName: Name of this Lambda function
 *                          - context.memoryLimitInMB: Memory allocated to function
 * 
 * @returns {Object} Response object with statusCode and body
 * 
 * WHY 'exports.handler'?
 * - AWS Lambda looks for 'exports.handler' by default
 * - You can change this in Lambda configuration, but 'handler' is standard
 * 
 * WHY 'async'?
 * - We're making API calls and S3 operations which take time (asynchronous)
 * - 'async/await' makes it easier to write asynchronous code
 * ============================================================================
 */
exports.handler = async (event, context) => {
    console.log('Lambda function started');
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        /**
         * Fetch data from external API
         * - process.env.API_URL: Reads URL from environment variable
         * - Default URL: A free test API (jsonplaceholder.typicode.com)
         * 
         * In production, you might call:
         * - Your own API
         * - Third-party APIs (Twitter, Weather, etc.)
         * - Other AWS services
         */
        const apiUrl = process.env.API_URL || 'https://jsonplaceholder.typicode.com/posts/1';
        console.log('Making API call to:', apiUrl);
        
        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'lambda-api-client/1.0'
            }
        });

        const contentType = response.headers.get('content-type') || '';
        const responseBody = await response.text();

        if (!response.ok) {
            console.error(`API request failed with status ${response.status}`);
            console.error('Response body preview:', responseBody.slice(0, 500));
            throw new Error(`API request failed with status ${response.status}`);
        }

        let apiData;
        try {
            if (contentType.includes('application/json')) {
                apiData = JSON.parse(responseBody);
            } else {
                throw new Error(`Unexpected content-type: ${contentType}`);
            }
        } catch (parseError) {
            console.error('Failed to parse API response as JSON');
            console.error('Content-Type:', contentType);
            console.error('Response body preview:', responseBody.slice(0, 500));
            throw new Error(`API response was not valid JSON: ${parseError.message}`);
        }

        console.log('API response received:', JSON.stringify(apiData, null, 2));
        
        /**
         * Business logic: Transform the API data
         * 
         * What we're doing:
         * - Keeping original data
         * - Adding timestamp (when it was processed)
         * - Creating a summary (title, body length, user ID)
         * - Marking it as processed
         * 
         * In a real application, you might:
         * - Filter unwanted data
         * - Calculate metrics
         * - Validate data
         * - Enrich data from other sources
         */
        const processedData = {
            originalData: apiData,
            processedAt: new Date().toISOString(),
            processed: true,
            summary: {
                title: apiData.title || 'No title',
                bodyLength: apiData.body ? apiData.body.length : 0,
                userId: apiData.userId || null
            }
        };
        
        console.log('Data processed successfully');
        
        /**
         * S3 (Simple Storage Service) is AWS's file storage service
         * 
         * Why S3?
         * - Scalable: Can store unlimited files
         * - Durable: 99.999999999% durability (11 nines!)
         * - Cost-effective: Pay only for what you use
         * 
         * S3 Structure:
         * - Bucket: Like a folder (must be globally unique name)
         * - Key: Path/filename inside bucket (like: folder/subfolder/file.json)
         */
        const bucketName = process.env.S3_BUCKET_NAME;
        if (!bucketName) {
            throw new Error('S3_BUCKET_NAME environment variable is not set');
        }
        
        const s3Key = `api-responses/${context.requestId || Date.now()}.json`;
        
        const putObjectParams = {
            Bucket: bucketName,
            Key: s3Key,
            Body: JSON.stringify(processedData, null, 2),
            ContentType: 'application/json'
        };
        
        await s3Client.send(new PutObjectCommand(putObjectParams));
        console.log(`Successfully uploaded to S3: s3://${bucketName}/${s3Key}`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully processed and stored data',
                s3Location: `s3://${bucketName}/${s3Key}`,
                requestId: context.requestId
            })
        };
        
    } catch (error) {
        console.error('Error in Lambda function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to process request',
                message: error.message,
                requestId: context.requestId
            })
        };
    }
};

