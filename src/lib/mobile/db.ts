// Mobile API Database Connection
import { getDb } from '@/lib/db';

export async function getMobileDb() {
  return getDb();
}

// Ensure database schema has required tables for mobile API
export async function ensureMobileSchema() {
  const db = await getDb();
  
  // Notifications table
  await db.exec(
    `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      user_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      priority TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'unread',
      action_required INTEGER DEFAULT 0,
      action_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      read_at TEXT
    )`
  );

  // Push tokens table
  await db.exec(
    `CREATE TABLE IF NOT EXISTS push_tokens (
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      platform TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (tenant_id, user_id, platform)
    )`
  );

  // User devices table
  await db.exec(
    `CREATE TABLE IF NOT EXISTS user_devices (
      user_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      device_id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      app_version TEXT,
      push_token TEXT,
      last_active TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id, tenant_id) REFERENCES users(id, tenant_id)
    )`
  );

  // Notification settings table
  await db.exec(
    `CREATE TABLE IF NOT EXISTS notification_settings (
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      types TEXT DEFAULT '{}',
      quiet_hours_enabled INTEGER DEFAULT 0,
      quiet_hours_start TEXT DEFAULT '22:00',
      quiet_hours_end TEXT DEFAULT '08:00',
      sound_enabled INTEGER DEFAULT 1,
      vibration_enabled INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (tenant_id, user_id)
    )`
  );

  // User settings table
  await db.exec(
    `CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      theme TEXT DEFAULT 'system',
      language TEXT DEFAULT 'en',
      currency TEXT DEFAULT 'USD',
      auto_refresh INTEGER DEFAULT 1,
      refresh_interval INTEGER DEFAULT 5,
      data_saver INTEGER DEFAULT 0,
      analytics INTEGER DEFAULT 1,
      crash_reporting INTEGER DEFAULT 1,
      biometric_enabled INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, tenant_id)
    )`
  );

  // Create indexes
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_notifications_tenant_status ON notifications(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_notifications_tenant_created ON notifications(tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id, platform);
    CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id, last_active DESC);
    CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id, tenant_id);`
  );

  console.log('Mobile API schema ensured');
}

// Initialize on startup
ensureMobileSchema().catch(console.error);