#!/bin/bash

# VeriAI Backend Google Cloud Run Deployment Script
# This script deploys the VeriAI backend to Google Cloud Run with Secret Manager integration

set -e

echo "🚀 Starting VeriAI Backend Cloud Run Deployment..."

# Configuration
PROJECT_ID=${PROJECT_ID:-"your-project-id"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME=${SERVICE_NAME:-"veriai-backend"}
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Configuration
PROJECT_ID=${PROJECT_ID:-"your-project-id"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME=${SERVICE_NAME:-"veriai-backend"}
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
SECRET_NAME="${SERVICE_NAME}-secrets"

# Check if required tools are installed
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    if ! command -v gcloud &> /dev/null; then
        echo "❌ gcloud CLI is not installed"
        echo "   Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed"
        exit 1
    fi
    
    echo "✅ Dependencies check passed"
    echo "   gcloud: $(gcloud --version 2>/dev/null | head -1 || echo 'installed')"
    echo "   docker: $(docker --version)"
}

# Check if user is authenticated with gcloud
check_authentication() {
    echo "� Checking Google Cloud authentication..."
    
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        echo "❌ Not authenticated with Google Cloud"
        echo "   Please run: gcloud auth login"
        exit 1
    fi
    
    # Set the project
    gcloud config set project $PROJECT_ID
    
    echo "✅ Authentication check passed"
    echo "   Project: $PROJECT_ID"
    echo "   Account: $(gcloud auth list --filter=status:ACTIVE --format='value(account)')"
}

# Enable required APIs
enable_apis() {
    echo "� Enabling required Google Cloud APIs..."
    
    local apis=(
        "cloudbuild.googleapis.com"
        "run.googleapis.com"
        "secretmanager.googleapis.com"
        "containerregistry.googleapis.com"
    )
    
    for api in "${apis[@]}"; do
        echo "   Enabling $api..."
        gcloud services enable $api
    done
    
    echo "✅ APIs enabled successfully"
}

# Read environment variables from .env file and upload to Secret Manager
upload_secrets() {
    echo "� Uploading environment variables to Secret Manager..."
    
    if [ ! -f ".env" ]; then
        echo "❌ .env file not found"
        exit 1
    fi
    
    # Create a temporary file with all env vars (excluding comments and empty lines)
    local temp_env_file=$(mktemp)
    grep -v '^#' .env | grep -v '^$' > "$temp_env_file"
    
    # Check if secret already exists
    if gcloud secrets describe $SECRET_NAME &> /dev/null; then
        echo "   Secret $SECRET_NAME already exists, creating new version..."
        gcloud secrets versions add $SECRET_NAME --data-file="$temp_env_file"
    else
        echo "   Creating new secret $SECRET_NAME..."
        gcloud secrets create $SECRET_NAME --data-file="$temp_env_file"
    fi
    
    # Clean up temp file
    rm "$temp_env_file"
    
    # Grant Cloud Run service account access to the secret
    echo "   Granting secret access to Cloud Run service account..."
    local project_number=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
    local service_account="$project_number-compute@developer.gserviceaccount.com"
    
    gcloud secrets add-iam-policy-binding $SECRET_NAME \
        --member="serviceAccount:$service_account" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet
    
    echo "✅ Environment variables uploaded to Secret Manager"
    echo "   Secret: $SECRET_NAME"
}

# Build and push Docker image
build_and_push() {
    echo "🐳 Building and pushing Docker image..."
    
    # Build the image
    docker build -t $IMAGE_NAME .
    
    # Configure Docker to use gcloud as a credential helper
    gcloud auth configure-docker
    
    # Push the image
    docker push $IMAGE_NAME
    
    echo "✅ Docker image built and pushed"
    echo "   Image: $IMAGE_NAME"
}

# Deploy to Cloud Run
deploy_to_cloud_run() {
    echo "🚀 Deploying to Cloud Run..."
    
    gcloud run deploy $SERVICE_NAME \
        --image=$IMAGE_NAME \
        --platform=managed \
        --region=$REGION \
        --allow-unauthenticated \
        --memory=1Gi \
        --cpu=1 \
        --concurrency=100 \
        --max-instances=10 \
        --timeout=300s \
        --set-env-vars="NODE_ENV=production" \
        --set-secrets="/etc/secrets/env=${SECRET_NAME}:latest"
    
    # Get the service URL
    local service_url=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
    
    echo "✅ Deployment successful!"
    echo "   Service URL: $service_url"
    echo "   Region: $REGION"
}

# Test the deployed service
test_deployment() {
    echo "🧪 Testing deployment..."
    
    local service_url=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
    
    # Test health endpoint
    local health_url="${service_url}/health"
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$health_url" || echo "000")
    
    if [ "$response" = "200" ]; then
        echo "✅ Deployment test passed"
        echo "   Health check: $health_url"
    else
        echo "⚠️  Deployment test warning (HTTP $response)"
        echo "   The service may still be starting up"
        echo "   Health check: $health_url"
    fi
}

# Main execution
main() {
    echo "═══════════════════════════════════════════════════════════"
    echo "       VeriAI Backend Google Cloud Run Deployment         "
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "📋 Configuration:"
    echo "   Project ID: $PROJECT_ID"
    echo "   Region: $REGION"
    echo "   Service Name: $SERVICE_NAME"
    echo "   Image: $IMAGE_NAME"
    echo "   Secret: $SECRET_NAME"
    echo ""
    
    check_dependencies
    check_authentication
    enable_apis
    upload_secrets
    build_and_push
    deploy_to_cloud_run
    test_deployment
    
    echo ""
    echo "🎉 VeriAI Backend successfully deployed to Google Cloud Run!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Update your frontend CORS settings with the new service URL"
    echo "   2. Test all API endpoints"
    echo "   3. Monitor logs: gcloud logs tail --service=$SERVICE_NAME"
    echo ""
}

# Handle interrupts gracefully
trap 'echo ""; echo "❌ Deployment interrupted"; exit 1' INT TERM

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
