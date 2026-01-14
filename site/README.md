# Demo Site

React/TypeScript/Vite/Tailwind site with AWS Cognito authentication and DynamoDB operations.

## Features

- **AWS Cognito Authentication**: Secure login with SRP (Secure Remote Password) protocol
- **User Profile Display**: Shows authenticated user's name and email in the header
- **DynamoDB Operations**: Add and delete records via API Gateway
- **Modern Stack**: React 18, TypeScript, Vite, Tailwind CSS

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Architecture

- **Authentication**: AWS Amplify library handles Cognito SRP authentication
- **API Calls**: Authenticated requests to API Gateway with Cognito tokens
- **State Management**: React hooks for auth state and form handling
- **Styling**: Tailwind CSS v4 with utility-first approach

## Usage

1. Sign in with your Cognito user credentials
2. View your user information in the header
3. Add records by providing hash key, range key, and optional data
4. Delete records using hash key and range key
5. Sign out when finished

## Project Structure

```
site/
├── src/
│   ├── components/
│   │   ├── Login.tsx       # Login form with SRP auth
│   │   └── Dashboard.tsx   # Main dashboard with DB operations
│   ├── services/
│   │   ├── auth.ts         # Cognito authentication service
│   │   └── api.ts          # API Gateway client
│   ├── App.tsx             # Main app with routing logic
│   ├── main.tsx            # Entry point
│   └── global.css          # Tailwind imports
├── index.html
├── package.json
└── vite.config.ts
```
