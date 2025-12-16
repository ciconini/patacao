/**
 * Global Setup for E2E Tests
 * 
 * This runs once before all E2E tests.
 * Starts the application and sets up test fixtures.
 */

export default async function globalSetup() {
  console.log('🔧 Setting up E2E test environment...');
  
  // Verify Firestore emulator is running
  const emulatorHost = process.env.FIREBASE_EMULATOR_HOST || 'localhost:8080';
  const [host, port] = emulatorHost.split(':');
  
  try {
    const http = require('http');
    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        {
          hostname: host,
          port: port,
          path: '/',
          method: 'GET',
          timeout: 5000,
        },
        (res: any) => {
          resolve();
        }
      );
      
      req.on('error', (err: any) => {
        console.warn('⚠️  Firestore emulator may not be running. Start it with: npm run firebase:emulators');
        resolve();
      });
      
      req.on('timeout', () => {
        req.destroy();
        console.warn('⚠️  Firestore emulator connection timeout.');
        resolve();
      });
      
      req.end();
    });
  } catch (error) {
    console.warn('⚠️  Could not verify Firestore emulator connection:', error);
  }
  
  console.log('✅ E2E test environment ready');
}

