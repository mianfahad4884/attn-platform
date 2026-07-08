import 'dotenv/config';
import { db } from './src/db/index.js';
import { users, systemConfig } from './src/db/schema.js';
import { hashPassword } from './src/utils/index.js';

async function seed() {
  console.log('Seeding database...');
  
  try {
    await db.insert(systemConfig).values({
      id: 1,
      feePercentage: 5,
      withdrawalMinimum: 5000000, // 500.0000 ATTN
      emergencyPause: false,
    }).onConflictDoNothing();
    
    console.log('✅ System Config seeded.');

    // Seed Demo User
    await db.insert(users).values({
      id: 'usr_demo_123',
      email: 'demo@attn.io',
      role: 'USER',
      tier: 1,
      tierLabel: 'NOVICE',
      multiplier: 1.0,
      status: 'ACTIVE',
      referralCode: 'DEMO-123',
    }).onConflictDoNothing();

    // Seed Admin User
    await db.insert(users).values({
      id: 'usr_admin_999',
      email: 'admin@attn.io',
      role: 'SUPER_ADMIN',
      tier: 4,
      tierLabel: 'LEGEND',
      multiplier: 5.0,
      status: 'ACTIVE',
      referralCode: 'ADMIN-999',
    }).onConflictDoNothing();

    console.log('✅ Users seeded. You can login with demo@attn.io or admin@attn.io (password does not matter in demo mode).');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

seed();
