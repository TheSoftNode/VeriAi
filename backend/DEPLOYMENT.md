# VeriAI Backend Cloud Run Deployment Guide

This guide will help you deploy the VeriAI backend to Google Cloud Run with automatic Secret Manager integration.

## Prerequisites

1. **Google Cloud Account**: Ensure you have a Google Cloud account with billing enabled
2. **Google Cloud CLI**: Install and configure the gcloud CLI
3. **Docker**: Install Docker on your local machine
4. **Environment Variables**: Ensure your `.env` file contains all required variables

## Setup Instructions

### 1. Install Google Cloud CLI

```bash
# macOS
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

### 2. Authenticate with Google Cloud

```bash
# Login to your Google account
gcloud auth login

# Set your project ID (replace with your actual project ID)
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID
```

### 3. Configure Environment Variables

Make sure your `.env` file in the backend directory contains all the required variables. The deployment script will automatically read from this file and upload them to Secret Manager.

### 4. Update Deployment Configuration

Edit the deployment script variables if needed:

```bash
# Edit deploy.sh and update these variables at the top:
PROJECT_ID="your-actual-project-id"    # Your GCP project ID
REGION="us-central1"                   # Your preferred region
SERVICE_NAME="veriai-backend"          # Cloud Run service name
```

## Deployment Process

### 1. Make the deployment script executable

```bash
chmod +x deploy.sh
```

### 2. Run the deployment

```bash
# Set your project ID
export PROJECT_ID="your-actual-project-id"

# Run the deployment script
./deploy.sh
```

The script will automatically:

- ✅ Check all dependencies (gcloud, docker)
- ✅ Authenticate with Google Cloud
- ✅ Enable required APIs (Cloud Build, Cloud Run, Secret Manager, Container Registry)
- ✅ Upload all environment variables from `.env` to Secret Manager
- ✅ Build and push the Docker image
- ✅ Deploy to Cloud Run with secrets mounted
- ✅ Test the deployment

### 3. Alternative: Use Cloud Build (Automated CI/CD)

For automated deployments, you can use the included `cloudbuild.yaml`:

```bash
# Trigger a build and deployment
gcloud builds submit --config cloudbuild.yaml
```

## Post-Deployment

### 1. Get Service URL

```bash
gcloud run services describe veriai-backend --region=us-central1 --format='value(status.url)'
```

### 2. Test the API

```bash
# Test health endpoint
curl https://your-service-url/health

# Test API endpoints
curl https://your-service-url/api/v1/health
```

### 3. View Logs

```bash
# Tail logs in real-time
gcloud logs tail --service=veriai-backend

# View recent logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=veriai-backend" --limit=50
```

### 4. Update Frontend Configuration

Update your frontend to use the new backend URL:

```typescript
// In your frontend config
const API_BASE_URL = "https://your-service-url-here.run.app";
```

## Environment Variables

The following variables from your `.env` file will be automatically uploaded to Secret Manager:

- **Database**: `MONGODB_URI`
- **AI APIs**: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`
- **Blockchain**: `PRIVATE_KEY`, `DEPLOYER_PRIVATE_KEY`, Contract addresses
- **Security**: `JWT_SECRET`
- **Configuration**: All other environment variables

## Troubleshooting

### Permission Issues

If you encounter permission errors:

```bash
# Enable required IAM roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="user:your-email@gmail.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="user:your-email@gmail.com" \
    --role="roles/secretmanager.admin"
```

### Build Failures

Check Cloud Build logs:

```bash
gcloud builds list --limit=5
gcloud builds log [BUILD_ID]
```

### Service Not Starting

Check Cloud Run logs:

```bash
gcloud logs read "resource.type=cloud_run_revision" --limit=20
```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use least privilege** IAM roles
3. **Regularly rotate** API keys and secrets
4. **Monitor** service usage and costs
5. **Enable** Cloud Run authentication for production

## Cost Optimization

- **Set memory/CPU limits** based on actual usage
- **Configure auto-scaling** to minimize idle instances
- **Use Cloud Build triggers** for efficient CI/CD
- **Monitor billing** alerts

## Next Steps

1. Set up custom domain with Cloud Run
2. Configure Cloud CDN for better performance
3. Set up monitoring with Cloud Monitoring
4. Implement proper CI/CD pipeline
5. Configure database connection pooling for MongoDB

Your VeriAI backend is now deployed and ready to serve your frontend application!
