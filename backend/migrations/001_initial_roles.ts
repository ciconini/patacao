/**
 * Migration: Initial Roles
 * 
 * Creates default system roles if they don't exist.
 * This is a safe migration that can be run multiple times.
 */

import * as admin from 'firebase-admin';

const db = admin.firestore();

export async function up(): Promise<void> {
  console.log('  Creating default roles...');
  
  const roles = [
    {
      id: 'Owner',
      name: 'Owner',
      permissions: ['*:*'],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      id: 'Manager',
      name: 'Manager',
      permissions: [
        'user:create', 'user:read', 'user:update', 'user:list',
        'store:create', 'store:read', 'store:update', 'store:list',
        'company:read', 'company:update',
        'customer:*', 'pet:*', 'appointment:*', 'service:*',
        'invoice:issue', 'invoice:void', 'credit_note:create',
        'product:*', 'supplier:*', 'purchase_order:*',
        'stock_adjustment:create', 'stock_reconciliation:create',
      ],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      id: 'Staff',
      name: 'Staff',
      permissions: [
        'customer:create', 'customer:read', 'customer:update', 'customer:list',
        'pet:create', 'pet:read', 'pet:update', 'pet:list',
        'appointment:create', 'appointment:read', 'appointment:update',
        'appointment:confirm', 'appointment:checkin', 'appointment:complete',
        'appointment:cancel', 'appointment:reschedule',
        'service:read', 'service:list',
        'invoice:create', 'invoice:read', 'invoice:update', 'invoice:list',
        'invoice:mark_paid',
        'transaction:create', 'transaction:read', 'transaction:list',
        'transaction:complete',
        'product:read', 'product:list',
        'stock_receipt:create', 'stock_movement:read',
        'inventory_reservation:create', 'inventory_reservation:release',
        'purchase_order:receive',
      ],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      id: 'Accountant',
      name: 'Accountant',
      permissions: [
        'invoice:*', 'credit_note:*', 'transaction:read', 'transaction:list',
        'financial_export:*', 'customer:read', 'customer:list',
        'customer:export', 'stock_movement:read', 'stock_movement:list',
        'audit_log:read', 'audit_log:list',
      ],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      id: 'Veterinarian',
      name: 'Veterinarian',
      permissions: [
        'pet:create', 'pet:read', 'pet:update', 'pet:list',
        'appointment:read', 'appointment:list', 'appointment:complete',
        'service:read', 'service:list',
      ],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ];

  const batch = db.batch();
  
  for (const role of roles) {
    const roleRef = db.collection('roles').doc(role.id);
    const roleDoc = await roleRef.get();
    
    // Only create if it doesn't exist
    if (!roleDoc.exists) {
      batch.set(roleRef, role);
      console.log(`    Created role: ${role.name}`);
    } else {
      console.log(`    Role already exists: ${role.name}`);
    }
  }
  
  await batch.commit();
  console.log('  ✅ Default roles migration completed');
}

export async function down(): Promise<void> {
  console.log('  ⚠️  Rollback not recommended for roles migration');
  console.log('  Roles will not be deleted to prevent data loss');
}

