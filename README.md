# Demo Site - Full Stack AWS Application

Complete serverless application with React frontend, API Gateway + Lambda backend, Cognito authentication, and DynamoDB storage.

## Prerequisites

- Node.js 20+
- AWS CLI v2
- AWS Account with SSO configured
- Domain name with Route 53 hosted zone
- ACM certificate in us-east-1

## Project Structure

```
demosite/
├── infra/          # CDK infrastructure
├── lambdas/        # Lambda functions
├── site/           # React frontend
└── README.md       # This file
```

## Initial Setup

### 1. Configure AWS SSO

```bash
# Configure AWS SSO profile
aws configure sso --profile admin-profile

# Follow the prompts to set up your SSO profile
# SSO session name: admin-profile
# SSO start URL: https://your-org.awsapps.com/start
# SSO Region: us-east-1 (or your region)
# Account: Select your account
# Role: Select your role
# CLI default region: us-east-1
# CLI output format: json

# Login to AWS SSO
aws sso login --profile admin-profile

# Set your profile as default (or use --profile flag with commands)
export AWS_PROFILE=admin-profile
```

## Infrastructure Deployment

### Build and Deploy CDK Stack

```bash
# Navigate to infra directory
cd infra

# Install dependencies
npm install

# Build TypeScript
npm run build

# Bootstrap CDK (first time only)
npm run cdk bootstrap

# Review changes
npm run cdk diff

# Deploy the stack
npm run cdk deploy

# Save the outputs (User Pool ID, Client ID, API ID)
# You'll need these for the frontend configuration
```

### Get Stack Outputs

```bash
# Get CloudFormation outputs
aws cloudformation describe-stacks \
  --stack-name DemoSiteInfraStack \
  --query 'Stacks[0].Outputs' \
  --output table
```

## Lambda Functions

### Install Dependencies

```bash
cd lambdas
npm install
```

### Build Lambda Functions

```bash
# Compile TypeScript
npm run build
```

### Run Tests

```bash
# Set the table name for testing (use deployed table)
export TABLE_NAME=Database

# Run end-to-end tests
npm test

# Run tests in watch mode
npm run test:watch
```

**Note**: Tests require the DynamoDB table to exist. Deploy infrastructure first or set `TABLE_NAME` to your deployed table name.

## Frontend Development

### Install Dependencies

```bash
cd site
npm install
```

### Update Frontend Configuration

Edit `site/src/config.ts` with your deployed values:

```typescript
export const config = {
    aws: {
        region: 'us-east-1',
        userPoolId: 'us-east-1_XXXXXXXXX', // From CDK outputs
        userPoolClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX', // From CDK outputs
    },
    api: {
        endpoint: 'https://yourdomain.com/api', // Your deployed domain
    },
};
```

### Development Server

```bash
# Start Vite dev server
npm run dev

# Site will be available at http://localhost:5173
```

### Build for Production

```bash
# Build optimized production bundle
npm run build

# Output will be in dist/ directory
```

### Preview Production Build

```bash
# Preview the production build locally
npm run preview
```

## Deployment Workflow

### Full Deployment from Scratch

```bash
# 1. Configure AWS
export AWS_PROFILE=admin-profile
aws sso login --profile admin-profile

# 2. Deploy Infrastructure
cd infra
npm install
npm run build
npm run cdk deploy

# 3. Note the outputs and update site/src/config.ts

# 4. Build and Deploy Frontend
cd ../site
npm install
npm run build

# Frontend is automatically deployed via CDK BucketDeployment
# Just re-run cdk deploy to update the site:
cd ../infra
npm run cdk deploy
```

### Update Infrastructure

```bash
cd infra
npm run build
npm run cdk diff    # Review changes
npm run cdk deploy
```

### Update Frontend Only

```bash
cd site
npm run build

# Then redeploy CDK to sync to S3 and invalidate CloudFront
cd ../infra
npm run cdk deploy
```

### Update Lambda Functions Only

```bash
cd lambdas
npm run build

# Redeploy infrastructure to update Lambda code
cd ../infra
npm run cdk deploy
```

## Testing

### Test Lambda Functions

```bash
cd lambdas
export TABLE_NAME=Database
npm test
```

### Test Frontend Locally

```bash
cd site
npm run dev
# Open http://localhost:5173 and test authentication and API calls
```

## Create Cognito User

```bash
# Create a user in Cognito User Pool
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username testuser \
  --user-attributes Name=email,Value=test@example.com Name=email_verified,Value=true \
  --temporary-password TempPassword123! \
  --message-action SUPPRESS

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username testuser \
  --password YourPassword123! \
  --permanent
```

## Useful Commands

### CDK Commands

```bash
npm run cdk list          # List all stacks
npm run cdk synth         # Synthesize CloudFormation template
npm run cdk diff          # Compare deployed vs current
npm run cdk deploy        # Deploy stack
npm run cdk destroy       # Delete stack
```

### AWS CLI Commands

```bash
# List DynamoDB items
aws dynamodb scan --table-name Database

# Check CloudFront distribution
aws cloudfront list-distributions

# View Lambda logs
aws logs tail /aws/lambda/AddRecordFunction --follow
aws logs tail /aws/lambda/DeleteRecordFunction --follow
```

## Troubleshooting

### Lambda Function Logs

```bash
# Stream logs for add-record function
aws logs tail /aws/lambda/AddRecordFunction --follow

# Stream logs for delete-record function
aws logs tail /aws/lambda/DeleteRecordFunction --follow
```

### CloudFront Cache Invalidation

```bash
# Get distribution ID
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='CloudFront for UI and API'].Id" \
  --output text)

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"
```

### Check API Gateway

```bash
# Test API endpoint directly (replace with your API ID)
curl -X POST https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/api/add-record \
  -H "Authorization: YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hashKey":"test","rangeKey":"test","data":{"value":"test"}}'
```

## Architecture Overview

- **CloudFront**: CDN serving SPA and routing `/api/*` to API Gateway
- **S3**: Static website hosting
- **API Gateway**: REST API with `/api` stage
- **Cognito**: User authentication with SRP
- **Lambda**: Two functions (add-record, delete-record)
- **DynamoDB**: NoSQL database with hash and range key
- **Route 53**: DNS management

## Security Notes

- Cognito self-signup is disabled (admin must create users)
- All API endpoints require Cognito authentication
- CloudFront enforces HTTPS
- S3 buckets are private (accessed via CloudFront OAI)
- Content Security Policy headers configured

## License

MIT
