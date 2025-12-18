# Firestore Permissions Guide

This guide covers two types of permissions:
1. **Firestore Security Rules** - Client-side access control (who can read/write data)
2. **Service Account Permissions** - Server-side access control (for backend operations)

---

## 1. Firestore Security Rules (Client-Side)

Firestore security rules control who can read and write data from client applications (web, mobile).

### Editing Rules

The rules file is located at: `backend/firestore.rules`

**Example: Adding permissions for a new collection**

```javascript
// Add this to firestore.rules
match /my_new_collection/{documentId} {
  // Allow read if authenticated
  allow read: if isAuthenticated();
  
  // Allow create/update if Owner or Manager
  allow create: if isOwnerOrManager();
  allow update: if isOwnerOrManager();
  
  // Deny delete
  allow delete: if false;
}
```

### Deploying Rules

**Option 1: Using Firebase CLI (Recommended)**

```bash
cd backend

# Deploy rules to production
firebase deploy --only firestore:rules

# Deploy to specific project
firebase deploy --only firestore:rules --project patacao
```

**Option 2: Using Firebase Console**

1. Go to: https://console.firebase.google.com/project/patacao/firestore/rules
2. Click "Edit rules"
3. Paste your rules
4. Click "Publish"

**Option 3: Test with Emulator First**

```bash
cd backend

# Start emulator with rules
firebase emulators:start --only firestore

# The emulator automatically uses firestore.rules from firebase.json
```

### Testing Rules

```bash
# Start emulator
firebase emulators:start --only firestore

# Run tests (if you have test files)
npm run test:firestore:rules
```

---

## 2. Service Account Permissions (Server-Side)

Service account permissions control what your backend can do in Firestore. This is what you need to fix the `PERMISSION_DENIED` errors.

### Current Issue

Your service account doesn't have permissions to read/write Firestore data. You need to grant it the appropriate IAM roles in Google Cloud Console.

### Granting Permissions via Google Cloud Console

**Step 1: Open Google Cloud Console**

1. Go to: https://console.cloud.google.com/iam-admin/iam?project=patacao
2. Make sure you're in the correct project (`patacao`)

**Step 2: Find Your Service Account**

1. Look for your service account email (usually something like `firebase-adminsdk-xxxxx@patacao.iam.gserviceaccount.com`)
2. You can find this in: `backend/config/secrets/firebase-service-account.json` (field: `client_email`)

**Step 3: Grant Roles**

Click the pencil icon (✏️) next to your service account and add these roles:

**Minimum Required Roles:**
- ✅ **Cloud Datastore User** (`roles/datastore.user`)
  - Allows read/write access to Firestore
- ✅ **Firebase Admin SDK Administrator Service Agent** (`roles/firebase.adminsdk.adminServiceAgent`)
  - Allows Firebase Admin SDK operations

**Optional (for full access):**
- **Firebase Admin** (`roles/firebase.admin`)
  - Full Firebase access (includes Auth, Firestore, etc.)

**Step 4: Save Changes**

Click "Save" and wait a few minutes for permissions to propagate.

### Granting Permissions via gcloud CLI

If you have `gcloud` CLI installed:

```bash
# Set your project
gcloud config set project patacao

# Get your service account email
SERVICE_ACCOUNT_EMAIL=$(cat backend/config/secrets/firebase-service-account.json | jq -r '.client_email')

# Grant Cloud Datastore User role
gcloud projects add-iam-policy-binding patacao \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/datastore.user"

# Grant Firebase Admin SDK role
gcloud projects add-iam-policy-binding patacao \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/firebase.adminsdk.adminServiceAgent"
```

### Verifying Permissions

After granting permissions, test with:

```bash
cd backend
export USE_FIREBASE_EMULATOR=false
npx ts-node -r tsconfig-paths/register src/cli/create-user-direct.ts
```

If it works, you should see:
```
✅ User created successfully!
```

---

## 3. Common Permission Scenarios

### Scenario 1: Backend Can't Read Firestore

**Error:** `7 PERMISSION_DENIED: Missing or insufficient permissions`

**Solution:**
- Grant `roles/datastore.user` to service account
- Or grant `roles/firebase.adminsdk.adminServiceAgent`

### Scenario 2: Backend Can't Write to Firestore

**Error:** `7 PERMISSION_DENIED: Missing or insufficient permissions`

**Solution:**
- Same as above - grant `roles/datastore.user`

### Scenario 3: Client Can't Read Data

**Error:** `Missing or insufficient permissions` (from client)

**Solution:**
- Check Firestore security rules in `firestore.rules`
- Ensure user is authenticated
- Ensure user has the required role
- Deploy updated rules: `firebase deploy --only firestore:rules`

### Scenario 4: Client Can't Write Data

**Error:** `Missing or insufficient permissions` (from client)

**Solution:**
- Check Firestore security rules
- Ensure user has write permissions for the collection
- Check if document exists (for updates)
- Deploy updated rules

---

## 4. Quick Reference

### Firestore Security Rules File
- **Location:** `backend/firestore.rules`
- **Deploy:** `firebase deploy --only firestore:rules`
- **Test:** Use Firebase emulator

### Service Account Permissions
- **Console:** https://console.cloud.google.com/iam-admin/iam?project=patacao
- **Required Role:** `roles/datastore.user`
- **Service Account File:** `backend/config/secrets/firebase-service-account.json`

### Firebase Console Links
- **Firestore Rules:** https://console.firebase.google.com/project/patacao/firestore/rules
- **Firestore Data:** https://console.firebase.google.com/project/patacao/firestore/data
- **IAM & Admin:** https://console.cloud.google.com/iam-admin/iam?project=patacao

---

## 5. Troubleshooting

### Permission Changes Not Taking Effect

1. **Wait 1-2 minutes** - IAM changes can take time to propagate
2. **Restart your backend** - If using a service account, restart the app
3. **Check project ID** - Ensure you're using the correct project (`patacao`)

### Still Getting Permission Errors

1. **Verify service account email** - Check `firebase-service-account.json`
2. **Check IAM roles** - Verify roles are assigned in Google Cloud Console
3. **Check project ID** - Ensure `FIREBASE_PROJECT_ID=patacao` in `.env`
4. **Use emulator** - Test with emulator first: `export USE_FIREBASE_EMULATOR=true`

### Rules Not Deploying

1. **Check Firebase CLI** - Ensure you're logged in: `firebase login`
2. **Check project** - Verify project in `firebase.json`
3. **Check rules syntax** - Validate rules file syntax
4. **Check permissions** - Ensure you have permission to deploy rules

---

## 6. Best Practices

1. **Always test rules in emulator first**
2. **Use least privilege** - Only grant necessary roles
3. **Document rule changes** - Update `FIRESTORE_SECURITY_RULES.md`
4. **Version control** - Commit rules changes to git
5. **Review regularly** - Audit permissions periodically

---

**Last Updated:** 2025-12-18

