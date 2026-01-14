# Demo Site Infrastructure

This CDK project creates a complete infrastructure for a single-page application (SPA) with API backend.

## Architecture

- **CloudFront Distribution**: Serves the SPA and routes API requests
- **S3 Buckets**: Website content storage and logging
- **API Gateway**: REST API with `/api/*` prefix
- **Cognito User Pool**: Authentication with self-signup disabled
- **Lambda Functions**: Two TypeScript functions for database operations
  - `AddRecordFunction`: Adds records to DynamoDB
  - `DeleteRecordFunction`: Deletes records from DynamoDB
- **DynamoDB Table**: `Database` table with `DemoHashKey` (partition key) and `DemoRangeKey` (sort key)
- **Route 53**: DNS record for custom domain

## Configuration

Before deploying, update `lib/config.ts` with your:
- Domain name
- Hosted Zone ID
- ACM Certificate ARN (must be in us-east-1 for CloudFront)

## Deployment

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Deploy the stack
npm run cdk deploy

# Or use the CDK CLI directly
npx cdk deploy
```

## API Endpoints

Both endpoints require Cognito authentication:

- `POST /api/add-record`: Add a record to DynamoDB
  ```json
  {
    "hashKey": "string",
    "rangeKey": "string",
    "data": { /* additional fields */ }
  }
  ```

- `POST /api/delete-record`: Delete a record from DynamoDB
  ```json
  {
    "hashKey": "string",
    "rangeKey": "string"
  }
  ```

## Useful Commands

- `npm run build`: Compile TypeScript to JavaScript
- `npm run watch`: Watch for changes and compile
- `npm run test`: Run unit tests
- `npx cdk deploy`: Deploy the stack to your default AWS account/region
- `npx cdk diff`: Compare deployed stack with current state
- `npx cdk synth`: Emit the synthesized CloudFormation template
