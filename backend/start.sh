#!/bin/sh

# VeriAI Backend Startup Script for Cloud Run
# This script loads environment variables from Secret Manager and starts the application

set -e

echo "🚀 Starting VeriAI Backend..."

# Function to load environment variables from mounted secret
load_secrets() {
    if [ -f "/etc/secrets/env" ]; then
        echo "📋 Loading environment variables from Secret Manager..."
        
        # Read and export each line as an environment variable
        while IFS= read -r line; do
            # Skip empty lines and comments
            if [ -n "$line" ] && [ "${line#\#}" = "$line" ]; then
                # Export the environment variable
                export "$line"
            fi
        done < /etc/secrets/env
        
        echo "✅ Environment variables loaded successfully"
    else
        echo "⚠️  No secrets file found at /etc/secrets/env"
        echo "   Using environment variables from container"
    fi
}

# Load secrets and start the application
load_secrets

echo "🎯 Starting Node.js application..."
echo "   Environment: ${NODE_ENV:-development}"
echo "   Port: ${PORT:-3001}"

# Start the application
exec npm start
