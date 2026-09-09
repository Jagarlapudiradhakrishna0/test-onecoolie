/**
 * server/src/scripts/seed_admin_accounts.js
 *
 * Ensures the two approved administrative identities exist in the database:
 *   1. admin01@onecoolie.in (Primary Admin)
 *   2. admin02@onecoolie.in (Secondary Admin)
 *
 * Preserves the exact same password hash configured for existing administrators.
 */

require('dotenv').config();
const supabase = require('../config/db');
const bcrypt = require('bcryptjs');

async function seedAdminAccounts() {
  console.log('[SEED] Ensuring approved administrator accounts (admin01@onecoolie.in, admin02@onecoolie.in)...');

  // 1. Fetch reference password from existing admin
  let passwordHash = null;
  const { data: existingAdmins } = await supabase
    .from('users')
    .select('password')
    .eq('role', 'admin')
    .not('password', 'is', null)
    .limit(1);

  if (existingAdmins && existingAdmins.length > 0 && existingAdmins[0].password) {
    passwordHash = existingAdmins[0].password;
  } else {
    passwordHash = await bcrypt.hash('Password123!', 10);
  }

  // 2. Ensure admin01@onecoolie.in
  const { data: admin1 } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', 'admin01@onecoolie.in')
    .maybeSingle();

  if (!admin1) {
    // Check if legacy admin@onecoolie.com exists and migrate it
    const { data: legacyAdmin } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'admin@onecoolie.com')
      .maybeSingle();

    if (legacyAdmin) {
      await supabase
        .from('users')
        .update({
          email: 'admin01@onecoolie.in',
          name: 'Primary Administrator 01',
          role: 'admin',
          admin_role: 'super_admin',
          is_approved: true
        })
        .eq('id', legacyAdmin.id);
      console.log(`[SEED] Migrated legacy admin to admin01@onecoolie.in (${legacyAdmin.id})`);
    } else {
      await supabase
        .from('users')
        .insert([{
          custom_id: 'ADM001',
          email: 'admin01@onecoolie.in',
          name: 'Primary Administrator 01',
          phone: '+91 9876543201',
          role: 'admin',
          admin_role: 'super_admin',
          password: passwordHash,
          is_approved: true,
          is_online: true
        }]);
      console.log('[SEED] Created admin01@onecoolie.in');
    }
  } else {
    await supabase
      .from('users')
      .update({
        role: 'admin',
        admin_role: 'super_admin',
        is_approved: true
      })
      .eq('id', admin1.id);
    console.log(`[SEED] Verified admin01@onecoolie.in (${admin1.id})`);
  }

  // 3. Ensure admin02@onecoolie.in
  const { data: admin2 } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', 'admin02@onecoolie.in')
    .maybeSingle();

  if (!admin2) {
    await supabase
      .from('users')
      .insert([{
        custom_id: 'ADM002',
        email: 'admin02@onecoolie.in',
        name: 'Secondary Administrator 02',
        phone: '+91 9876543202',
        role: 'admin',
        admin_role: 'super_admin',
        password: passwordHash,
        is_approved: true,
        is_online: true
      }]);
    console.log('[SEED] Created admin02@onecoolie.in');
  } else {
    await supabase
      .from('users')
      .update({
        role: 'admin',
        admin_role: 'super_admin',
        is_approved: true,
        password: passwordHash
      })
      .eq('id', admin2.id);
    console.log(`[SEED] Verified admin02@onecoolie.in (${admin2.id})`);
  }

  console.log('[SEED] Approved administrator provisioning complete.');
}

if (require.main === module) {
  seedAdminAccounts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[SEED FATAL]', err);
      process.exit(1);
    });
}

module.exports = { seedAdminAccounts };
