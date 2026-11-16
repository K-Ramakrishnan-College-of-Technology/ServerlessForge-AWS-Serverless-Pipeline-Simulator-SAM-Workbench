# ServerlessForge — AWS Serverless Architecture & Builder Workbench

Design, simulate, and export weekend-ready serverless AWS applications combining **Amazon API Gateway**, **AWS Lambda**, **AWS Step Functions**, **Amazon DynamoDB**, and **Amazon S3**, complete with an **AWS Builder Center** submission studio.

---

## Features

- **5-Service Topology & Inspector**: Configure API Gateway routes/throttling, ARM64 Node.js 22 Lambda functions, Step Functions retry/catch workflows, single-table DynamoDB keys/GSIs, and S3 bucket lifecycles.
- **Custom Weekend Idea Architect (`/api/architect`)**: Describe any software problem and synthesize a tailored 5-service serverless blueprint using server-side Gemini (`@google/genai`) with a multi-model fallback ladder.
- **Live Pipeline Simulator (`/api/simulate/run`)**: Trigger simulated HTTP API requests, trace Step Functions state transitions and Catch quarantine paths, and inspect persisted S3 objects and DynamoDB items.
- **Deployable IaC Bundle**: Export ready-to-deploy `template.yaml` (AWS SAM), `statemachine.asl.json`, TypeScript Lambda handlers (`src/handler.ts`), and `README.md` as a `.zip` bundle.
- **AWS Builder Submission Composer**: Live character counters (`0/255` Title, `0/512` Description), Markdown block inserter & preview, 1200×675 JPG cover image exporter (`<= 2 MB`), tag manager (`5` max), and repository/demo link validation.

---

## Prerequisites & Environment Setup

1. **Node.js 22+** and npm
2. **Google Cloud CLI (`gcloud`)** and **Firebase CLI** (for Cloud Run & Firestore deployment)
3. **AWS SAM CLI** (optional, for deploying exported `template.yaml` bundles to AWS)

Enable required Google Cloud APIs:
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com
```

### Local Development

```bash
npm install
cp .env.example .env
# Set GEMINI_API_KEY in .env
npm run dev
```

---

## Secret Manager Configuration

Store your Gemini API key securely in Google Cloud Secret Manager (never hardcode secrets):

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Database Security Configuration (Firestore Rules)

If provisioning Cloud Firestore for multi-user persistence, enforce strict owner-bound isolation in `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy rules with:
```bash
firebase deploy --only firestore:rules
```

---

## Google Cloud Run Deployment

Build and deploy the unified Express + Vite application to Cloud Run:

```bash
npm run build

gcloud run deploy serverlessforge \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

### Verification Label Binding

Apply the required resource label for automated challenge verification:

```bash
gcloud run services update serverlessforge \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```
