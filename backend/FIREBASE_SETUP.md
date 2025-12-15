# Firebase Setup and Testing Guide

## Current Status

✅ **Firebase Admin SDK**: Configured and initialized successfully  
✅ **Service Account**: Loaded from `config/secrets/firebase-service-account.json`  
✅ **Connection**: Firebase connection established  
⚠️ **Firestore API**: Needs to be enabled in Firebase Console

## Setup Steps

### Step 1: Create Firestore Database

**This is the most important step!** You need to create a Firestore database first:

1. **Visit Firebase Console:**
   - Go to: https://console.firebase.google.com/project/patacao/firestore

2. **Create Database:**
   - Click "Create database" button
   - Choose **Native mode** (recommended for new projects)
   - Select a location (e.g., `europe-west1` for EU data residency)
   - Click "Enable"

3. **Security Rules:**
   - Start in "test mode" for initial testing (allows read/write for 30 days)
   - You can update rules later in `backend/firestore.rules`

### Step 2: Enable Firestore API (if not already enabled)

1. **Visit the Google Cloud Console:**
   - Go to: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=patacao
   - Or navigate to: Google Cloud Console → APIs & Services → Library → Search "Cloud Firestore API" → Enable

2. **Enable the API:**
   - Click "Enable" button
   - Wait a few minutes for the API to propagate

### Step 3: Verify Service Account Permissions

1. **Check IAM Permissions:**
   - Go to: Google Cloud Console → IAM & Admin → IAM
   - Find your service account: `firebase-adminsdk-fbsvc@patacao.iam.gserviceaccount.com`
   - Ensure it has one of these roles:
     - "Cloud Datastore User" (minimum required)
     - "Firebase Admin SDK Administrator Service Agent" (recommended)
     - "Owner" (for full access)

2. **Add Role if Needed:**
   - Click "Edit" on the service account
   - Click "Add Another Role"
   - Select "Cloud Datastore User" or "Firebase Admin SDK Administrator Service Agent"
   - Click "Save"

## Testing Options

### Option 1: Test with Production Firebase (After Enabling API)

```bash
cd backend
FIREBASE_PROJECT_ID=patacao npm run test:firebase:crud
```

### Option 2: Test with Firebase Emulator (Recommended for Development)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Start the Emulator**:
   ```bash
   cd backend
   npm run firebase:emulators
   ```

4. **In another terminal, run the test**:
   ```bash
   cd backend
   USE_FIREBASE_EMULATOR=true FIREBASE_PROJECT_ID=patacao-dev npm run test:firebase:crud
   ```

## Test Scripts Available

- **`npm run test:firebase`** - Basic connection test
- **`npm run test:firebase:crud`** - Full CRUD operations test (CREATE, READ, UPDATE, QUERY, BATCH, TRANSACTION, DELETE)

## What the CRUD Test Does

The CRUD test performs the following operations:

1. **CREATE**: Creates a test document with various data types
2. **READ**: Reads the document back to verify it was created
3. **UPDATE**: Updates the document with new fields
4. **QUERY**: Queries documents using filters and ordering
5. **BATCH WRITE**: Tests batch operations (multiple writes in one transaction)
6. **TRANSACTION**: Tests transactional operations
7. **DELETE**: Deletes the test document and verifies deletion

## Troubleshooting

### Error: "NOT_FOUND" (Error code 5)
- **Solution**: Create the Firestore database first (Step 1 above)
- Visit: https://console.firebase.google.com/project/patacao/firestore
- Click "Create database" and follow the setup wizard

### Error: "Firestore API has not been used"
- **Solution**: Enable the Firestore API (Step 2 above)
- Visit: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=patacao

### Error: "PERMISSION_DENIED"
- **Solution**: Check service account permissions (Step 3 above)
- Ensure service account has "Cloud Datastore User" role at minimum

### Error: "Connection refused" (Emulator)
- **Solution**: Make sure the Firebase emulator is running (`npm run firebase:emulators`)

### Error: "Service account file not found"
- **Solution**: Verify the file exists at `config/secrets/firebase-service-account.json`
- Or set `FIREBASE_SERVICE_ACCOUNT_PATH` environment variable

## Next Steps

1. Enable Firestore API in Firebase Console
2. Run the CRUD test: `npm run test:firebase:crud`
3. Verify all operations succeed
4. Start building your application with Firebase!

