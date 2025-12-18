# How to Create a User in Firestore Manually

Since you have a user in Firebase Auth but need to create the corresponding Firestore user, here are the steps:

## Option 1: Using Firebase Console (Easiest)

1. Go to Firebase Console: https://console.firebase.google.com/project/patacao/firestore/data
2. Click on "users" collection (or create it if it doesn't exist)
3. Click "Add document"
4. Set the document ID (generate a UUID or use any unique ID)
5. Add the following fields:

```json
{
  "id": "YOUR_UUID_HERE",
  "email": "feciconini@gmail.com",
  "fullName": "Felipe Ciconini",
  "passwordHash": "YOU_NEED_TO_HASH_THIS",
  "roleIds": ["Owner"],
  "storeIds": [],
  "serviceSkills": [],
  "active": true,
  "firebaseUid": "YOUR_FIREBASE_AUTH_UID",
  "failedLoginAttempts": 0,
  "createdAt": "2025-12-18T19:00:00Z",
  "updatedAt": "2025-12-18T19:00:00Z"
}
```

**To get the password hash**, you can run:
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('acuma123', 10).then(h => console.log(h))"
```

**To get the Firebase UID**, check Firebase Auth console or use the script below.

## Option 2: Using the Script (If Permissions Work)

Run the script we created:
```bash
cd backend
export USE_FIREBASE_EMULATOR=false
npx ts-node -r tsconfig-paths/register src/cli/create-firestore-user.ts
```

## Option 3: Use Emulator (For Development)

If you want to use the emulator for development:

1. Start the emulator:
```bash
cd backend
firebase emulators:start --only firestore,auth
```

2. Create the user in emulator Auth (we already did this)
3. Run the script with emulator:
```bash
export USE_FIREBASE_EMULATOR=true
export FIREBASE_EMULATOR_HOST=localhost:8080
npx ts-node -r tsconfig-paths/register src/cli/create-firestore-user.ts
```

