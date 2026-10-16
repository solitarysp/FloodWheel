#!/usr/bin/env bash
# ==============================================================================
# FloodWheel — Google Cloud Run & Firebase Deployment Automation Script
# Default Region: asia-southeast1 (Singapore)
# ==============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ID="${1:-${GCP_PROJECT_ID:-}}"
REGION="${2:-${GCP_REGION:-asia-southeast1}}"
REPO_NAME="floodwheel"
DB_INSTANCE="floodwheel-db"
DB_NAME="floodwheel"
DB_USER="floodwheel_admin"

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}       FloodWheel Cloud Run & Firebase Deployer       ${NC}"
echo -e "${BLUE}======================================================${NC}"

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Missing GCP Project ID.${NC}"
    echo "Usage: ./scripts/deploy_gcp_firebase.sh <GCP_PROJECT_ID> [GCP_REGION]"
    exit 1
fi

echo -e "${GREEN}==> Configuring GCP Project: ${PROJECT_ID} (Region: ${REGION})${NC}"
gcloud config set project "$PROJECT_ID"

echo -e "${GREEN}==> Enabling required GCP APIs...${NC}"
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com

echo -e "${GREEN}==> Creating Artifact Registry repository (if not exists)...${NC}"
gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" >/dev/null 2>&1 || \
gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="FloodWheel Docker Repository"

REGISTRY_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

# --- 1. BUILD & DEPLOY CAMERA BACKEND ---
echo -e "${GREEN}==> 1/4: Building and deploying Camera Microservice to Cloud Run...${NC}"
gcloud builds submit --tag "${REGISTRY_BASE}/camera-backend:latest" ./camera-backend

gcloud run deploy floodwheel-camera-backend \
    --image "${REGISTRY_BASE}/camera-backend:latest" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --min-instances 0 \
    --max-instances 5 \
    --memory 512Mi \
    --cpu 1 \
    --set-env-vars "ENVIRONMENT=production,LOG_LEVEL=INFO,PORT=8080"

CAMERA_SERVICE_URL=$(gcloud run services describe floodwheel-camera-backend --region "$REGION" --format='value(status.url)')
echo -e "${GREEN}Camera Backend URL: ${CAMERA_SERVICE_URL}${NC}"

# --- 2. CLOUD SQL SETUP (PostgreSQL + PostGIS) ---
echo -e "${GREEN}==> 2/4: Verifying Cloud SQL Instance (${DB_INSTANCE})...${NC}"
if ! gcloud sql instances describe "$DB_INSTANCE" >/dev/null 2>&1; then
    echo -e "${YELLOW}Initializing Cloud SQL PostgreSQL instance (approx. 3-5 minutes)...${NC}"
    DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
    gcloud sql instances create "$DB_INSTANCE" \
        --database-version=POSTGRES_16 \
        --tier=db-f1-micro \
        --region="$REGION" \
        --storage-type=SSD \
        --storage-size=10GB \
        --root-password="$DB_PASSWORD"

    gcloud sql databases create "$DB_NAME" --instance="$DB_INSTANCE" || true
    gcloud sql users create "$DB_USER" --instance="$DB_INSTANCE" --password="$DB_PASSWORD" || true
    
    echo -e "${GREEN}Cloud SQL created successfully. DB_USER: ${DB_USER}, DB_PASSWORD: ${DB_PASSWORD}${NC}"
fi

INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe "$DB_INSTANCE" --format='value(connectionName)')
echo -e "${BLUE}Cloud SQL Connection Name: ${INSTANCE_CONNECTION_NAME}${NC}"

# --- 3. BUILD & DEPLOY CORE BACKEND ---
echo -e "${GREEN}==> 3/4: Building and deploying Core AI Backend to Cloud Run...${NC}"
gcloud builds submit --tag "${REGISTRY_BASE}/backend:latest" ./backend

# Load environment secrets from .env if available
GEMINI_KEY=$(grep -E '^GEMINI_API_KEY=' .env | cut -d '=' -f2- || echo "")
ADMIN_PASSWORD_VAL=$(grep -E '^ADMIN_PASSWORD=' .env | cut -d '=' -f2- || echo "admin123")

CLOUDSQL_ASYNC_URL="postgresql+asyncpg://${DB_USER}:postgres@/${DB_NAME}?host=/cloudsql/${INSTANCE_CONNECTION_NAME}"

gcloud run deploy floodwheel-backend \
    --image "${REGISTRY_BASE}/backend:latest" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --min-instances 0 \
    --max-instances 10 \
    --memory 1Gi \
    --cpu 1 \
    --add-cloudsql-instances "$INSTANCE_CONNECTION_NAME" \
    --set-env-vars "ENVIRONMENT=production,LOG_LEVEL=INFO,PORT=8080,CAMERA_BACKEND_URL=${CAMERA_SERVICE_URL},DATABASE_URL=${CLOUDSQL_ASYNC_URL},GEMINI_API_KEY=${GEMINI_KEY},ADMIN_PASSWORD=${ADMIN_PASSWORD_VAL}"

BACKEND_URL=$(gcloud run services describe floodwheel-backend --region "$REGION" --format='value(status.url)')
echo -e "${GREEN}Core Backend URL: ${BACKEND_URL}${NC}"

# --- 4. EXPORT & DEPLOY FRONTEND TO FIREBASE HOSTING ---
echo -e "${GREEN}==> 4/4: Building static frontend and deploying to Firebase Hosting...${NC}"
cd frontend
export NEXT_PUBLIC_API_URL="$BACKEND_URL"
npm run build
cd ..

firebase use "$PROJECT_ID" || true
firebase deploy --only hosting --project "$PROJECT_ID"

echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}         DEPLOYMENT COMPLETED SUCCESSFULLY!           ${NC}"
echo -e "${GREEN} Backend URL:  ${BACKEND_URL}${NC}"
echo -e "${GREEN} Camera API:   ${CAMERA_SERVICE_URL}${NC}"
echo -e "${GREEN} Firebase App: https://${PROJECT_ID}.web.app${NC}"
echo -e "${GREEN}======================================================${NC}"
