/**
 * Setup file for Firestore security rules tests
 * 
 * This file sets up the Firebase emulator connection for tests
 */

// Set environment variables for Firebase emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

// Increase timeout for Firebase emulator operations
jest.setTimeout(30000);

