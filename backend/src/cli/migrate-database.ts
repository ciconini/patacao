/**
 * Database Migration Script
 *
 * Manages database schema migrations for Firestore.
 * Migrations are versioned and tracked in the database.
 *
 * Usage:
 *   npm run migrate [migration-name]
 *   or
 *   ts-node -r tsconfig-paths/register src/cli/migrate-database.ts [migration-name]
 *
 * Options:
 *   --list: List all available migrations
 *   --status: Show migration status
 *   --up [name]: Run a specific migration (or all pending if no name)
 *   --down [name]: Rollback a specific migration
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '../../.env') });
} catch (error) {
  console.log('ℹ️  dotenv not found, using system environment variables\n');
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = path.join(
    __dirname,
    '../../config/secrets/firebase-service-account.json',
  );

  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    process.exit(1);
  }
}

const db = admin.firestore();
const MIGRATIONS_COLLECTION = '_migrations';
const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

interface Migration {
  name: string;
  version: string;
  up: () => Promise<void>;
  down?: () => Promise<void>;
}

interface MigrationRecord {
  name: string;
  version: string;
  appliedAt: admin.firestore.Timestamp;
  appliedBy?: string;
}

/**
 * Get all migration files
 */
function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
    .sort();
}

/**
 * Load migration module
 */
async function loadMigration(fileName: string): Promise<Migration | null> {
  const filePath = path.join(MIGRATIONS_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    // Delete require cache to allow reloading
    delete require.cache[require.resolve(filePath)];
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const migration = require(filePath);

    // Extract version from filename (e.g., "001_initial_schema.ts" -> "001")
    const version = fileName.match(/^(\d+)_/)?.[1] || '000';
    const name = fileName.replace(/^\d+_/, '').replace(/\.(ts|js)$/, '');

    return {
      name,
      version,
      up: migration.up || (async () => {}),
      down: migration.down,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to load migration ${fileName}:`, errorMessage);
    return null;
  }
}

/**
 * Get applied migrations from database
 */
async function getAppliedMigrations(): Promise<Map<string, MigrationRecord>> {
  const snapshot = await db.collection(MIGRATIONS_COLLECTION).get();
  const applied = new Map<string, MigrationRecord>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as MigrationRecord;
    applied.set(data.name, data);
  });

  return applied;
}

/**
 * Record migration as applied
 */
async function recordMigration(migration: Migration): Promise<void> {
  await db.collection(MIGRATIONS_COLLECTION).doc(migration.name).set({
    name: migration.name,
    version: migration.version,
    appliedAt: admin.firestore.Timestamp.now(),
  });
}

/**
 * Remove migration record (for rollback)
 */
async function removeMigrationRecord(migrationName: string): Promise<void> {
  await db.collection(MIGRATIONS_COLLECTION).doc(migrationName).delete();
}

/**
 * List all migrations
 */
async function listMigrations(): Promise<void> {
  console.log('📋 Available migrations:\n');

  const files = getMigrationFiles();
  const applied = await getAppliedMigrations();

  if (files.length === 0) {
    console.log('   No migrations found.');
    return;
  }

  for (const file of files) {
    const migration = await loadMigration(file);
    if (!migration) continue;

    const isApplied = applied.has(migration.name);
    const status = isApplied ? '✅ Applied' : '⏳ Pending';

    console.log(`   ${status} - ${migration.version}_${migration.name}`);
  }
}

/**
 * Show migration status
 */
async function showStatus(): Promise<void> {
  console.log('📊 Migration Status:\n');

  const files = getMigrationFiles();
  const applied = await getAppliedMigrations();

  const pending = files.filter((file) => {
    const name = file.replace(/^\d+_/, '').replace(/\.(ts|js)$/, '');
    return !applied.has(name);
  });

  console.log(`   Total migrations: ${files.length}`);
  console.log(`   Applied: ${applied.size}`);
  console.log(`   Pending: ${pending.length}`);

  if (pending.length > 0) {
    console.log('\n   Pending migrations:');
    pending.forEach((file) => {
      console.log(`     - ${file}`);
    });
  }
}

/**
 * Run migration up
 */
async function runMigrationUp(migrationName?: string): Promise<void> {
  const files = getMigrationFiles();
  const applied = await getAppliedMigrations();

  if (files.length === 0) {
    console.log('⚠️  No migrations found.');
    return;
  }

  let migrationsToRun = files;

  if (migrationName) {
    // Run specific migration
    migrationsToRun = files.filter(
      (file) =>
        file.includes(migrationName) ||
        file.replace(/^\d+_/, '').replace(/\.(ts|js)$/, '') === migrationName,
    );

    if (migrationsToRun.length === 0) {
      console.error(`❌ Migration not found: ${migrationName}`);
      return;
    }
  } else {
    // Run all pending migrations
    migrationsToRun = files.filter((file) => {
      const name = file.replace(/^\d+_/, '').replace(/\.(ts|js)$/, '');
      return !applied.has(name);
    });
  }

  if (migrationsToRun.length === 0) {
    console.log('✅ No pending migrations.');
    return;
  }

  console.log(`🚀 Running ${migrationsToRun.length} migration(s)...\n`);

  for (const file of migrationsToRun) {
    const migration = await loadMigration(file);
    if (!migration) continue;

    if (applied.has(migration.name)) {
      console.log(`⏭️  Skipping ${migration.name} (already applied)`);
      continue;
    }

    try {
      console.log(`▶️  Running migration: ${migration.name}...`);
      await migration.up();
      await recordMigration(migration);
      console.log(`✅ Migration ${migration.name} completed`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Migration ${migration.name} failed:`, errorMessage);
      throw error;
    }
  }

  console.log('\n✅ All migrations completed!');
}

/**
 * Run migration down (rollback)
 */
async function runMigrationDown(migrationName: string): Promise<void> {
  const files = getMigrationFiles();
  const applied = await getAppliedMigrations();

  if (!migrationName) {
    console.error('❌ Migration name required for rollback');
    return;
  }

  // Find migration file
  const file = files.find(
    (f) =>
      f.includes(migrationName) ||
      f.replace(/^\d+_/, '').replace(/\.(ts|js)$/, '') === migrationName,
  );

  if (!file) {
    console.error(`❌ Migration not found: ${migrationName}`);
    return;
  }

  const migration = await loadMigration(file);
  if (!migration) {
    console.error(`❌ Failed to load migration: ${migrationName}`);
    return;
  }

  if (!applied.has(migration.name)) {
    console.log(`⚠️  Migration ${migration.name} is not applied`);
    return;
  }

  if (!migration.down) {
    console.error(`❌ Migration ${migration.name} does not support rollback`);
    return;
  }

  try {
    console.log(`⏪ Rolling back migration: ${migration.name}...`);
    await migration.down();
    await removeMigrationRecord(migration.name);
    console.log(`✅ Migration ${migration.name} rolled back`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Rollback failed:`, errorMessage);
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--list')) {
    await listMigrations();
    return;
  }

  if (args.includes('--status')) {
    await showStatus();
    return;
  }

  if (args.includes('--up')) {
    const nameIndex = args.indexOf('--up');
    const name = args[nameIndex + 1];
    await runMigrationUp(name);
    return;
  }

  if (args.includes('--down')) {
    const nameIndex = args.indexOf('--down');
    const name = args[nameIndex + 1];
    if (!name) {
      console.error('❌ Migration name required for rollback');
      return;
    }
    await runMigrationDown(name);
    return;
  }

  // Default: run all pending migrations
  await runMigrationUp();
}

// Run migrations
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error:', errorMessage);
    process.exit(1);
  });
