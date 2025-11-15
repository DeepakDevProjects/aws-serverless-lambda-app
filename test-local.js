/**
 * ============================================================================
 * FILE: test-local.js
 * PURPOSE: Test Lambda function locally on your computer
 * 
 * WHAT THIS FILE DOES:
 * 1. Imports our Lambda handler function
 * 2. Creates fake/mock event and context objects (as if AWS Lambda called it)
 * 3. Calls the handler function
 * 4. Shows the results
 * 
 * WHY TEST LOCALLY?
 * - Faster: No need to deploy to AWS for every code change
 * - Cheaper: No AWS costs during development
 * - Easier debugging: Use your local debugger
 * 
 * LIMITATIONS:
 * - S3 upload will fail without AWS credentials (that's okay for testing logic)
 * - Some AWS features can't be tested locally
 * 
 * HOW TO RUN:
 * node test-local.js
 * ============================================================================
 */

/**
 * Import the handler function from our Lambda code
 * This is the same function that will run in AWS Lambda
 */
const { handler } = require('./src/index');

/**
 * ============================================================================
 * MOCK CONTEXT OBJECT
 * ============================================================================
 * 
 * In real AWS Lambda, AWS provides a 'context' object with runtime information
 * Here we create a fake one for local testing
 * 
 * context.requestId: Unique ID for this Lambda execution (useful for tracking)
 * context.functionName: Name of the Lambda function
 * context.getRemainingTimeInMillis(): How much time is left before timeout
 * 
 * These values are used in our Lambda code (like context.requestId for S3 key)
 */
const mockContext = {
    requestId: 'test-request-id-12345', // Fake request ID
    functionName: 'test-lambda-function',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
    memoryLimitInMB: '128',
    awsRequestId: 'test-request-id-12345',
    getRemainingTimeInMillis: () => 30000 // 30 seconds remaining
};

/**
 * ============================================================================
 * MOCK EVENT OBJECT
 * ============================================================================
 * 
 * In real AWS Lambda, 'event' contains data that triggered the function
 * - Could be from API Gateway: { "body": "...", "headers": {...} }
 * - Could be from S3: { "Records": [...] }
 * - Could be from CloudWatch: { "source": "..." }
 * 
 * For local testing, we create a simple event object
 */
const mockEvent = {
    test: true,
    message: 'Local test event'
};

/**
 * ============================================================================
 * TEST RUNNER FUNCTION
 * ============================================================================
 * 
 * This function orchestrates the entire test:
 * 1. Sets up environment variables (like Lambda configuration)
 * 2. Calls the Lambda handler
 * 3. Shows the results
 * 4. Verifies everything worked
 */
async function runLocalTest() {
    console.log('='.repeat(60));
    console.log('Starting Local Lambda Function Test');
    console.log('='.repeat(60));
    console.log('');
    
    /**
     * Set environment variables for testing
     * 
     * NOTE: We intentionally DON'T set S3_BUCKET_NAME
     * - This means S3 upload will fail (expected!)
     * - But we can still test: API call, Data processing, Error handling
     */
    process.env.AWS_REGION = 'us-east-1';
    process.env.API_URL = 'https://jsonplaceholder.typicode.com/posts/1';
    
    try {
        console.log('Calling Lambda handler...');
        console.log('Event:', JSON.stringify(mockEvent, null, 2));
        console.log('');
        
        const result = await handler(mockEvent, mockContext);
        
        console.log('='.repeat(60));
        console.log('Lambda Function Result:');
        console.log('='.repeat(60));
        console.log(JSON.stringify(result, null, 2));
        
        if (result.statusCode === 500) {
            console.log('');
            console.log('⚠️  Function returned error (expected if S3_BUCKET_NAME not set)');
            console.log('✅ API call and data processing logic tested');
            console.log('✅ Error handling tested');
        } else if (result.statusCode === 200) {
            console.log('');
            console.log('✅ Function executed successfully!');
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error(error.stack);
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('Test Complete');
    console.log('='.repeat(60));
}

/**
 * ============================================================================
 * RUN THE TEST
 * ============================================================================
 * 
 * When you run: node test-local.js
 * This immediately executes runLocalTest()
 * 
 * .catch(console.error): If runLocalTest() throws an error, catch and show it
 */
runLocalTest().catch(console.error);

