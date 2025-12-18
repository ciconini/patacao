/**
 * Database Seeding Script
 *
 * Seeds the Firestore database with initial data for development:
 * - Default roles (Owner, Manager, Staff, Accountant, Veterinarian)
 * - Sample company and store
 * - Sample users
 * - Sample customers and pets
 * - Sample products and services
 *
 * Usage:
 *   npm run seed:dev
 *   or
 *   ts-node -r tsconfig-paths/register src/cli/seed-database.ts [--full]
 *
 * Options:
 *   --full: Create full sample data (customers, pets, products, services)
 *   --roles-only: Only seed roles
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

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
const auth = admin.auth();

interface SeedOptions {
  full?: boolean;
  rolesOnly?: boolean;
}

/**
 * Seed default roles
 */
async function seedRoles(): Promise<void> {
  console.log('📋 Seeding roles...');

  const roles = [
    {
      id: 'Owner',
      name: 'Owner',
      permissions: ['*:*'], // All permissions
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      id: 'Manager',
      name: 'Manager',
      permissions: [
        'user:create',
        'user:read',
        'user:update',
        'user:list',
        'store:create',
        'store:read',
        'store:update',
        'store:list',
        'company:read',
        'company:update',
        'customer:*',
        'pet:*',
        'appointment:*',
        'service:*',
        'invoice:issue',
        'invoice:void',
        'credit_note:create',
        'product:*',
        'supplier:*',
        'purchase_order:*',
        'stock_adjustment:create',
        'stock_reconciliation:create',
      ],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      id: 'Staff',
      name: 'Staff',
      permissions: [
        'customer:create',
        'customer:read',
        'customer:update',
        'customer:list',
        'pet:create',
        'pet:read',
        'pet:update',
        'pet:list',
        'appointment:create',
        'appointment:read',
        'appointment:update',
        'appointment:confirm',
        'appointment:checkin',
        'appointment:complete',
        'appointment:cancel',
        'appointment:reschedule',
        'service:read',
        'service:list',
        'invoice:create',
        'invoice:read',
        'invoice:update',
        'invoice:list',
        'invoice:mark_paid',
        'transaction:create',
        'transaction:read',
        'transaction:list',
        'transaction:complete',
        'product:read',
        'product:list',
        'stock_receipt:create',
        'stock_movement:read',
        'inventory_reservation:create',
        'inventory_reservation:release',
        'purchase_order:receive',
      ],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      id: 'Accountant',
      name: 'Accountant',
      permissions: [
        'invoice:*',
        'credit_note:*',
        'transaction:read',
        'transaction:list',
        'financial_export:*',
        'customer:read',
        'customer:list',
        'customer:export',
        'stock_movement:read',
        'stock_movement:list',
        'audit_log:read',
        'audit_log:list',
      ],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      id: 'Veterinarian',
      name: 'Veterinarian',
      permissions: [
        'pet:create',
        'pet:read',
        'pet:update',
        'pet:list',
        'appointment:read',
        'appointment:list',
        'appointment:complete',
        'service:read',
        'service:list',
      ],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ];

  const batch = db.batch();

  for (const role of roles) {
    const roleRef = db.collection('roles').doc(role.id);
    batch.set(roleRef, role);
  }

  await batch.commit();
  console.log(`✅ Seeded ${roles.length} roles`);
}

/**
 * Seed sample company and store
 */
async function seedCompanyAndStore(): Promise<{ companyId: string; storeId: string }> {
  console.log('🏢 Seeding company and store...');

  const companyId = uuidv4();
  const companyData = {
    id: companyId,
    name: 'Patacão Petshop',
    nif: '123456789',
    address: {
      street: 'Rua Example 123',
      city: 'Lisboa',
      postalCode: '1000-001',
      country: 'Portugal',
    },
    taxRegime: 'Normal',
    defaultVatRate: 23.0,
    phone: '+351211234567',
    email: 'info@patacao.pt',
    website: 'https://www.patacao.pt',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  const storeId = uuidv4();
  const storeData = {
    id: storeId,
    companyId: companyId,
    name: 'Loja Central',
    address: {
      street: 'Rua Example 123',
      city: 'Lisboa',
      postalCode: '1000-001',
      country: 'Portugal',
    },
    email: 'loja@patacao.pt',
    phone: '+351211234567',
    openingHours: {
      monday: { open: '09:00', close: '19:00', closed: false },
      tuesday: { open: '09:00', close: '19:00', closed: false },
      wednesday: { open: '09:00', close: '19:00', closed: false },
      thursday: { open: '09:00', close: '19:00', closed: false },
      friday: { open: '09:00', close: '19:00', closed: false },
      saturday: { open: '09:00', close: '18:00', closed: false },
      sunday: { open: '10:00', close: '14:00', closed: false },
    },
    timezone: 'Europe/Lisbon',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  await db.collection('companies').doc(companyId).set(companyData);
  await db.collection('stores').doc(storeId).set(storeData);

  console.log(`✅ Seeded company (${companyId}) and store (${storeId})`);

  return { companyId, storeId };
}

/**
 * Seed sample users
 */
async function seedUsers(storeId: string): Promise<{ ownerUserId: string }> {
  console.log('👥 Seeding users...');

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const bcrypt = require('bcryptjs');
  const defaultPassword = 'password123'; // Change in production!
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const ownerUserId = uuidv4();
  const ownerData = {
    id: ownerUserId,
    email: 'owner@patacao.pt',
    fullName: 'Owner User',
    phone: '+351912345678',
    username: 'owner',
    passwordHash: passwordHash,
    roleIds: ['Owner'],
    storeIds: [storeId],
    active: true,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  // Create Firebase Auth user
  try {
    const firebaseUser = await auth.createUser({
      uid: ownerUserId,
      email: ownerData.email,
      displayName: ownerData.fullName,
      password: defaultPassword,
    });

    // Set custom claims
    await auth.setCustomUserClaims(firebaseUser.uid, {
      roles: { Owner: true },
      storeIds: { [storeId]: true },
    });

    console.log(`✅ Created Firebase Auth user: ${ownerData.email}`);
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    if (firebaseError.code === 'auth/email-already-exists') {
      console.log(`⚠️  Firebase Auth user already exists: ${ownerData.email}`);
    } else {
      console.error(
        `❌ Failed to create Firebase Auth user: ${firebaseError.message || String(error)}`,
      );
    }
  }

  await db.collection('users').doc(ownerUserId).set(ownerData);

  // Create additional sample users
  const sampleUsers = [
    {
      email: 'manager@patacao.pt',
      fullName: 'Manager User',
      roleIds: ['Manager'],
      storeIds: [storeId],
    },
    {
      email: 'staff@patacao.pt',
      fullName: 'Staff User',
      roleIds: ['Staff'],
      storeIds: [storeId],
    },
    {
      email: 'accountant@patacao.pt',
      fullName: 'Accountant User',
      roleIds: ['Accountant'],
      storeIds: [],
    },
    {
      email: 'vet@patacao.pt',
      fullName: 'Veterinarian User',
      roleIds: ['Veterinarian'],
      storeIds: [storeId],
    },
  ];

  for (const userData of sampleUsers) {
    const userId = uuidv4();
    const user = {
      id: userId,
      email: userData.email,
      fullName: userData.fullName,
      passwordHash: passwordHash,
      roleIds: userData.roleIds,
      storeIds: userData.storeIds,
      active: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    try {
      const firebaseUser = await auth.createUser({
        uid: userId,
        email: user.email,
        displayName: user.fullName,
        password: defaultPassword,
      });

      const roles: Record<string, boolean> = {};
      userData.roleIds.forEach((role) => {
        roles[role] = true;
      });

      const storeIds: Record<string, boolean> = {};
      userData.storeIds.forEach((sId) => {
        storeIds[sId] = true;
      });

      await auth.setCustomUserClaims(firebaseUser.uid, {
        roles,
        storeIds: Object.keys(storeIds).length > 0 ? storeIds : undefined,
      });

      console.log(`✅ Created Firebase Auth user: ${user.email}`);
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'auth/email-already-exists') {
        console.log(`⚠️  Firebase Auth user already exists: ${user.email}`);
      } else {
        console.error(
          `❌ Failed to create Firebase Auth user: ${firebaseError.message || String(error)}`,
        );
      }
    }

    await db.collection('users').doc(userId).set(user);
  }

  console.log(`✅ Seeded ${sampleUsers.length + 1} users`);
  console.log(`⚠️  Default password for all users: ${defaultPassword}`);

  return { ownerUserId };
}

/**
 * Seed sample customers and pets
 */
async function seedCustomersAndPets(): Promise<void> {
  console.log('👤 Seeding customers and pets...');

  const customers = [
    {
      fullName: 'João Silva',
      email: 'joao.silva@example.com',
      phone: '+351912345679',
      address: {
        street: 'Rua das Flores 10',
        city: 'Lisboa',
        postalCode: '1000-200',
        country: 'Portugal',
      },
      consentMarketing: true,
      consentReminders: true,
      pets: [
        {
          name: 'Max',
          species: 'dog',
          breed: 'Golden Retriever',
          dateOfBirth: new Date('2020-05-15'),
        },
        { name: 'Luna', species: 'cat', breed: 'Persian', dateOfBirth: new Date('2021-03-20') },
      ],
    },
    {
      fullName: 'Maria Santos',
      email: 'maria.santos@example.com',
      phone: '+351912345680',
      address: {
        street: 'Avenida da Liberdade 50',
        city: 'Lisboa',
        postalCode: '1250-096',
        country: 'Portugal',
      },
      consentMarketing: false,
      consentReminders: true,
      pets: [
        { name: 'Bella', species: 'dog', breed: 'Labrador', dateOfBirth: new Date('2019-08-10') },
      ],
    },
  ];

  for (const customerData of customers) {
    const customerId = uuidv4();
    const customer = {
      id: customerId,
      fullName: customerData.fullName,
      email: customerData.email,
      phone: customerData.phone,
      address: customerData.address,
      consentMarketing: customerData.consentMarketing,
      consentReminders: customerData.consentReminders,
      archived: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await db.collection('customers').doc(customerId).set(customer);

    for (const petData of customerData.pets) {
      const petId = uuidv4();
      const pet = {
        id: petId,
        customerId: customerId,
        name: petData.name,
        species: petData.species,
        breed: petData.breed,
        dateOfBirth: admin.firestore.Timestamp.fromDate(petData.dateOfBirth),
        vaccinations: [],
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await db.collection('pets').doc(petId).set(pet);
    }
  }

  console.log(`✅ Seeded ${customers.length} customers with pets`);
}

/**
 * Seed sample products
 */
async function seedProducts(): Promise<void> {
  console.log('📦 Seeding products...');

  const products = [
    {
      sku: 'PROD-001',
      name: 'Ração Premium Cão Adulto',
      description: 'Ração premium para cães adultos',
      category: 'Alimentação',
      unitPrice: 45.99,
      vatRate: 23.0,
      trackInventory: true,
      lowStockThreshold: 10,
      active: true,
    },
    {
      sku: 'PROD-002',
      name: 'Ração Premium Gato',
      description: 'Ração premium para gatos',
      category: 'Alimentação',
      unitPrice: 38.99,
      vatRate: 23.0,
      trackInventory: true,
      lowStockThreshold: 10,
      active: true,
    },
    {
      sku: 'PROD-003',
      name: 'Brinquedo Osso',
      description: 'Brinquedo em forma de osso para cães',
      category: 'Brinquedos',
      unitPrice: 12.99,
      vatRate: 23.0,
      trackInventory: true,
      lowStockThreshold: 5,
      active: true,
    },
  ];

  for (const productData of products) {
    const productId = uuidv4();
    const product = {
      id: productId,
      sku: productData.sku,
      name: productData.name,
      description: productData.description,
      category: productData.category,
      unitPrice: productData.unitPrice,
      vatRate: productData.vatRate,
      trackInventory: productData.trackInventory,
      lowStockThreshold: productData.lowStockThreshold,
      active: productData.active,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await db.collection('products').doc(productId).set(product);
  }

  console.log(`✅ Seeded ${products.length} products`);
}

/**
 * Seed sample services
 */
async function seedServices(): Promise<void> {
  console.log('🔧 Seeding services...');

  const services = [
    {
      name: 'Banho e Tosa',
      description: 'Serviço completo de banho e tosa',
      durationMinutes: 120,
      price: 35.0,
      consumesInventory: false,
      tags: ['grooming', 'bath'],
    },
    {
      name: 'Consulta Veterinária',
      description: 'Consulta veterinária geral',
      durationMinutes: 30,
      price: 50.0,
      consumesInventory: false,
      tags: ['veterinary', 'consultation'],
    },
    {
      name: 'Vacinação',
      description: 'Aplicação de vacina',
      durationMinutes: 15,
      price: 25.0,
      consumesInventory: true,
      consumedItems: [],
      tags: ['veterinary', 'vaccination'],
    },
  ];

  for (const serviceData of services) {
    const serviceId = uuidv4();
    const service = {
      id: serviceId,
      name: serviceData.name,
      description: serviceData.description,
      durationMinutes: serviceData.durationMinutes,
      price: serviceData.price,
      consumesInventory: serviceData.consumesInventory,
      consumedItems: serviceData.consumedItems || [],
      tags: serviceData.tags,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await db.collection('services').doc(serviceId).set(service);
  }

  console.log(`✅ Seeded ${services.length} services`);
}

/**
 * Main seeding function
 */
async function seed(options: SeedOptions = {}): Promise<void> {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Always seed roles
    await seedRoles();

    if (options.rolesOnly) {
      console.log('\n✅ Seeding completed (roles only)');
      return;
    }

    // Seed company and store
    const { storeId } = await seedCompanyAndStore();

    // Seed users
    await seedUsers(storeId);

    if (options.full) {
      // Seed full sample data
      await seedCustomersAndPets();
      await seedProducts();
      await seedServices();
    }

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📝 Default credentials:');
    console.log('   Email: owner@patacao.pt');
    console.log('   Password: password123');
    console.log('\n⚠️  Remember to change default passwords in production!');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Seeding failed:', errorMessage);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: SeedOptions = {
  full: args.includes('--full'),
  rolesOnly: args.includes('--roles-only'),
};

// Run seeding
seed(options)
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
