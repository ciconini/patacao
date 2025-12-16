/**
 * Global Setup for Integration Tests
 * 
 * This runs once before all integration tests.
 * Verifies that the Firestore emulator is running.
 */

export default async function globalSetup() {
  console.log('🔧 Setting up integration test environment...');
  
  // Check if Firestore emulator is running
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
        console.warn('   Integration tests may fail if emulator is not available.');
        resolve(); // Don't fail, just warn
      });
      
      req.on('timeout', () => {
        req.destroy();
        console.warn('⚠️  Firestore emulator connection timeout.');
        resolve(); // Don't fail, just warn
      });
      
      req.end();
    });
  } catch (error) {
    console.warn('⚠️  Could not verify Firestore emulator connection:', error);
  }
  
  console.log('✅ Integration test environment ready');
}

