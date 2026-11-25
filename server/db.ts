import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  ActivityLog,
  BackupPayload,
  ColorTheme,
  CustomerCard,
  LoyaltySettings,
  StampDesign,
  StampEvent,
} from '../src/types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'yos_loyalty.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ephemeral HMAC signing key generated on server boot if SESSION_SECRET is unset
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const VALID_THEMES: ReadonlySet<ColorTheme> = new Set([
  'obsidian-gold',
  'ivory-gold',
  'champagne-noir',
]);
const VALID_DESIGNS: ReadonlySet<StampDesign> = new Set([
  'monogram',
  'crown',
  'diamond',
  'laurel',
]);

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(pin, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyHash(pin: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(pin, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

export function normalizeMobile(raw: string): string {
  return raw.replace(/[^\d+]/g, '').trim();
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL UNIQUE,
      mobile_digits TEXT NOT NULL,
      stamps_count INTEGER NOT NULL DEFAULT 0,
      total_stamps INTEGER NOT NULL DEFAULT 6,
      completed_cycles INTEGER NOT NULL DEFAULT 0,
      stamp_design TEXT,
      color_theme TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stamp_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      cycle_number INTEGER NOT NULL DEFAULT 1,
      slot_number INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      target_customer_id INTEGER,
      target_name TEXT,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    );
  `);

  const setDefault = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const initialPin = ['0', '0', '0', '0'].join('');

  db.transaction(() => {
    setDefault.run('default_total_stamps', '6');
    setDefault.run('stamp_design', 'monogram');
    setDefault.run('color_theme', 'obsidian-gold');
    setDefault.run('reward_title', 'Complimentary Signature Gift');
    setDefault.run('reward_subtitle', 'Redeemable on your next boutique visit upon completing your stamp card.');
    setDefault.run('brand_tagline', 'Bespoke Atelier & Fine Objects');
    setDefault.run('pin_hash', hashPin(initialPin));
    setDefault.run('token_version', '1');
  })();

  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM customers').get() as { cnt: number };
  if (countRow.cnt === 0) {
    seedSampleCustomers();
  }
}

function seedSampleCustomers(): void {
  const insertCustomer = db.prepare(`
    INSERT INTO customers (card_code, name, mobile, mobile_digits, stamps_count, total_stamps, completed_cycles, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertHistory = db.prepare(`
    INSERT INTO stamp_history (customer_id, cycle_number, slot_number, event_type, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertLog = db.prepare(`
    INSERT INTO activity_logs (action, actor_role, target_customer_id, target_name, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    const c1 = insertCustomer.run(
      'YOS-1042',
      'Amira Al-Mansoor',
      '+1 555 0142',
      '15550142',
      2,
      6,
      0,
      'Prefers matte gold gift wrap'
    );
    const id1 = Number(c1.lastInsertRowid);
    insertHistory.run(id1, 1, 1, 'STAMP_ADDED', 'Boutique purchase verified', new Date(Date.now() - 86400000 * 6).toISOString());
    insertHistory.run(id1, 1, 2, 'STAMP_ADDED', 'Autumn Capsule collection', new Date(Date.now() - 86400000 * 2).toISOString());

    const c2 = insertCustomer.run(
      'YOS-1088',
      'Julian Vance',
      '+1 555 0188',
      '15550188',
      5,
      6,
      1,
      'VIP member since 2025'
    );
    const id2 = Number(c2.lastInsertRowid);
    for (let s = 1; s <= 5; s++) {
      insertHistory.run(id2, 2, s, 'STAMP_ADDED', `Visit #${s} stamped in store`, new Date(Date.now() - 86400000 * (7 - s)).toISOString());
    }

    const c3 = insertCustomer.run(
      'YOS-1105',
      'Elena Rostova',
      '+1 555 0105',
      '15550105',
      6,
      6,
      0,
      'Ready to claim reward'
    );
    const id3 = Number(c3.lastInsertRowid);
    for (let s = 1; s <= 6; s++) {
      insertHistory.run(id3, 1, s, 'STAMP_ADDED', `Purchase #${s}`, new Date(Date.now() - 86400000 * (8 - s)).toISOString());
    }

    insertLog.run('SYSTEM_INITIALIZED', 'system', null, null, 'YOS COLLECTION loyalty database initialized with 3 member cards.', new Date().toISOString());
  })();
}

function getSetting(key: string, fallback = ''): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : fallback;
}

function setSetting(key: string, value: string): void {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

export function getPublicSettings(): LoyaltySettings {
  const envPin = (process.env.ADMIN_PIN || '').trim();
  const total = Number.parseInt(getSetting('default_total_stamps', '6'), 10);
  const designRaw = getSetting('stamp_design', 'monogram') as StampDesign;
  const themeRaw = getSetting('color_theme', 'obsidian-gold') as ColorTheme;

  return {
    defaultTotalStamps: Number.isFinite(total) && total >= 4 && total <= 20 ? total : 6,
    stampDesign: VALID_DESIGNS.has(designRaw) ? designRaw : 'monogram',
    colorTheme: VALID_THEMES.has(themeRaw) ? themeRaw : 'obsidian-gold',
    rewardTitle: getSetting('reward_title', 'Complimentary Signature Gift'),
    rewardSubtitle: getSetting('reward_subtitle', 'Redeemable on your next boutique visit upon completing your stamp card.'),
    brandTagline: getSetting('brand_tagline', 'Bespoke Atelier & Fine Objects'),
    pinConfiguredViaEnv: envPin.length > 0,
  };
}

export function verifyAdminPin(pin: string): boolean {
  if (!pin || typeof pin !== 'string') return false;
  const trimmed = pin.trim();
  const envPin = (process.env.ADMIN_PIN || '').trim();
  if (envPin.length > 0) {
    const a = Buffer.from(trimmed);
    const b = Buffer.from(envPin);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
  const storedHash = getSetting('pin_hash', '');
  if (!storedHash) return false;
  return verifyHash(trimmed, storedHash);
}

export function issueAdminToken(): string {
  const version = Number.parseInt(getSetting('token_version', '1'), 10) || 1;
  const payload = {
    role: 'admin',
    v: version,
    exp: Date.now() + 8 * 60 * 60 * 1000,
    jti: crypto.randomBytes(12).toString('hex'),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      role: string;
      v: number;
      exp: number;
    };
    const currentVersion = Number.parseInt(getSetting('token_version', '1'), 10) || 1;
    return payload.role === 'admin' && payload.v === currentVersion && payload.exp > Date.now();
  } catch {
    return false;
  }
}

interface RawCustomerRow {
  id: number;
  card_code: string;
  name: string;
  mobile: string;
  mobile_digits: string;
  stamps_count: number;
  total_stamps: number;
  completed_cycles: number;
  stamp_design: string | null;
  color_theme: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function mapCustomer(row: RawCustomerRow): CustomerCard {
  const design = row.stamp_design && VALID_DESIGNS.has(row.stamp_design as StampDesign)
    ? (row.stamp_design as StampDesign)
    : null;
  const theme = row.color_theme && VALID_THEMES.has(row.color_theme as ColorTheme)
    ? (row.color_theme as ColorTheme)
    : null;

  return {
    id: row.id,
    cardCode: row.card_code,
    name: row.name,
    mobile: row.mobile,
    stampsCount: row.stamps_count,
    totalStamps: row.total_stamps,
    completedCycles: row.completed_cycles,
    stampDesign: design,
    colorTheme: theme,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function logActivity(
  action: string,
  actorRole: 'admin' | 'staff' | 'customer' | 'system',
  details: string,
  targetCustomerId: number | null = null,
  targetName: string | null = null
): void {
  db.prepare(`
    INSERT INTO activity_logs (action, actor_role, target_customer_id, target_name, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(action, actorRole, targetCustomerId, targetName, details, new Date().toISOString());
}

export function getFeaturedCard(): CustomerCard | null {
  const row = db.prepare('SELECT * FROM customers ORDER BY updated_at DESC, id ASC LIMIT 1').get() as RawCustomerRow | undefined;
  return row ? mapCustomer(row) : null;
}

export function lookupSingleCard(query: string): CustomerCard | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const upperCode = trimmed.toUpperCase();
  const digits = trimmed.replace(/\D/g, '');

  const byCode = db.prepare('SELECT * FROM customers WHERE UPPER(card_code) = ? LIMIT 1').get(upperCode) as RawCustomerRow | undefined;
  if (byCode) return mapCustomer(byCode);

  if (digits.length >= 4) {
    const byMobile = db.prepare('SELECT * FROM customers WHERE mobile_digits = ? OR mobile_digits LIKE ? LIMIT 1').get(digits, `%${digits}`) as RawCustomerRow | undefined;
    if (byMobile) return mapCustomer(byMobile);
  }

  return null;
}

export function getCardById(id: number): CustomerCard | null {
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as RawCustomerRow | undefined;
  return row ? mapCustomer(row) : null;
}

export function getCardHistory(customerId: number): StampEvent[] {
  const rows = db.prepare(`
    SELECT id, customer_id, cycle_number, slot_number, event_type, note, created_at
    FROM stamp_history
    WHERE customer_id = ?
    ORDER BY id DESC
    LIMIT 100
  `).all(customerId) as Array<{
    id: number;
    customer_id: number;
    cycle_number: number;
    slot_number: number;
    event_type: 'STAMP_ADDED' | 'CYCLE_RESET' | 'CARD_ADJUSTED';
    note: string;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    customerId: r.customer_id,
    cycleNumber: r.cycle_number,
    slotNumber: r.slot_number,
    eventType: r.event_type,
    note: r.note,
    createdAt: r.created_at,
  }));
}

function generateUniqueCardCode(): string {
  for (let i = 0; i < 15; i++) {
    const num = crypto.randomInt(1000, 9999);
    const code = `YOS-${num}`;
    const existing = db.prepare('SELECT 1 FROM customers WHERE card_code = ?').get(code);
    if (!existing) return code;
  }
  return `YOS-${Date.now().toString().slice(-5)}`;
}

export function createCustomerCard(input: {
  name: string;
  mobile: string;
  notes?: string;
  totalStamps?: number;
  actorRole: 'admin' | 'customer';
}): { created: boolean; card: CustomerCard } {
  const cleanName = input.name.trim().slice(0, 80);
  const cleanMobile = input.mobile.trim().slice(0, 32);
  const digits = cleanMobile.replace(/\D/g, '');
  if (!cleanName || digits.length < 6) {
    throw new Error('Please provide a valid customer name and mobile number.');
  }

  const existing = db.prepare('SELECT * FROM customers WHERE mobile_digits = ?').get(digits) as RawCustomerRow | undefined;
  if (existing) {
    return { created: false, card: mapCustomer(existing) };
  }

  const settings = getPublicSettings();
  const totalStamps =
    input.totalStamps && input.totalStamps >= 4 && input.totalStamps <= 20
      ? Math.floor(input.totalStamps)
      : settings.defaultTotalStamps;

  const cardCode = generateUniqueCardCode();
  const now = new Date().toISOString();

  const cardId = db.transaction(() => {
    const res = db.prepare(`
      INSERT INTO customers (card_code, name, mobile, mobile_digits, stamps_count, total_stamps, completed_cycles, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, 0, ?, ?, ?)
    `).run(cardCode, cleanName, cleanMobile, digits, totalStamps, (input.notes || '').trim().slice(0, 240), now, now);

    const insertedId = Number(res.lastInsertRowid);
    logActivity(
      'CUSTOMER_CREATED',
      input.actorRole,
      `Created loyalty card ${cardCode} (${totalStamps} slots) for ${cleanName} (${cleanMobile}).`,
      insertedId,
      cleanName
    );
    return insertedId;
  })();

  const card = getCardById(cardId)!;
  return { created: true, card };
}

export function addStampToCard(params: {
  customerId: number;
  note?: string;
  idempotencyKey?: string;
}): { card: CustomerCard; event: StampEvent; completedNow: boolean } {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const note = (params.note || 'In-store purchase verified').trim().slice(0, 160);

  const result = db.transaction(() => {
    // Cleanup expired idempotency keys (> 5 minutes)
    db.prepare('DELETE FROM idempotency_keys WHERE created_at < ?').run(nowMs - 5 * 60 * 1000);

    if (params.idempotencyKey) {
      const seen = db.prepare('SELECT 1 FROM idempotency_keys WHERE key = ?').get(params.idempotencyKey);
      if (seen) {
        throw Object.assign(new Error('Duplicate stamp submission blocked.'), { statusCode: 409 });
      }
      db.prepare('INSERT INTO idempotency_keys (key, created_at) VALUES (?, ?)').run(params.idempotencyKey, nowMs);
    }

    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(params.customerId) as RawCustomerRow | undefined;
    if (!row) {
      throw Object.assign(new Error('Customer loyalty card not found.'), { statusCode: 404 });
    }

    if (row.stamps_count >= row.total_stamps) {
      throw Object.assign(
        new Error('Card is already complete. Reset the completed card with admin authorization to start a new cycle.'),
        { statusCode: 409 }
      );
    }

    // Prevent rapid accidental double-stamps within 2 seconds on the same card without explicit confirmation
    const recentStamp = db.prepare(`
      SELECT created_at FROM stamp_history
      WHERE customer_id = ? AND event_type = 'STAMP_ADDED'
      ORDER BY id DESC LIMIT 1
    `).get(params.customerId) as { created_at: string } | undefined;

    if (recentStamp) {
      const lastTime = Date.parse(recentStamp.created_at);
      if (Number.isFinite(lastTime) && nowMs - lastTime < 2000) {
        throw Object.assign(new Error('Duplicate stamp entry prevented. Please wait a moment before stamping again.'), {
          statusCode: 409,
        });
      }
    }

    const newCount = row.stamps_count + 1;
    const cycleNumber = row.completed_cycles + 1;

    db.prepare('UPDATE customers SET stamps_count = ?, updated_at = ? WHERE id = ?').run(
      newCount,
      nowIso,
      params.customerId
    );

    const histRes = db.prepare(`
      INSERT INTO stamp_history (customer_id, cycle_number, slot_number, event_type, note, created_at)
      VALUES (?, ?, ?, 'STAMP_ADDED', ?, ?)
    `).run(params.customerId, cycleNumber, newCount, note, nowIso);

    logActivity(
      'STAMP_ADDED',
      'staff',
      `Stamped slot ${newCount}/${row.total_stamps} on ${row.card_code} (${row.name}). Note: ${note}`,
      row.id,
      row.name
    );

    const updated = getCardById(params.customerId)!;
    const event: StampEvent = {
      id: Number(histRes.lastInsertRowid),
      customerId: params.customerId,
      cycleNumber,
      slotNumber: newCount,
      eventType: 'STAMP_ADDED',
      note,
      createdAt: nowIso,
    };

    return {
      card: updated,
      event,
      completedNow: newCount >= updated.totalStamps,
    };
  })();

  return result;
}

export function resetCompletedCard(params: {
  customerId: number;
  note?: string;
  actorRole: 'admin' | 'staff';
}): CustomerCard {
  const nowIso = new Date().toISOString();
  const note = (params.note || 'Reward redeemed and loyalty cycle reset').trim().slice(0, 160);

  return db.transaction(() => {
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(params.customerId) as RawCustomerRow | undefined;
    if (!row) {
      throw Object.assign(new Error('Customer loyalty card not found.'), { statusCode: 404 });
    }

    const wasCompleted = row.stamps_count >= row.total_stamps;
    const nextCompletedCycles = wasCompleted ? row.completed_cycles + 1 : row.completed_cycles;

    db.prepare(`
      UPDATE customers
      SET stamps_count = 0, completed_cycles = ?, updated_at = ?
      WHERE id = ?
    `).run(nextCompletedCycles, nowIso, params.customerId);

    db.prepare(`
      INSERT INTO stamp_history (customer_id, cycle_number, slot_number, event_type, note, created_at)
      VALUES (?, ?, 0, 'CYCLE_RESET', ?, ?)
    `).run(params.customerId, nextCompletedCycles, note, nowIso);

    logActivity(
      'CARD_RESET',
      params.actorRole,
      `Reset ${row.card_code} (${row.name}) from ${row.stamps_count}/${row.total_stamps} to 0/${row.total_stamps}. Completed cycles: ${nextCompletedCycles}.`,
      row.id,
      row.name
    );

    return getCardById(params.customerId)!;
  })();
}

export function searchCustomers(query = ''): CustomerCard[] {
  const q = query.trim();
  if (!q) {
    const rows = db.prepare('SELECT * FROM customers ORDER BY updated_at DESC, id DESC LIMIT 200').all() as RawCustomerRow[];
    return rows.map(mapCustomer);
  }
  const like = `%${q}%`;
  const digits = q.replace(/\D/g, '');
  const digitLike = digits ? `%${digits}%` : like;

  const rows = db.prepare(`
    SELECT * FROM customers
    WHERE name LIKE ? OR mobile LIKE ? OR card_code LIKE ? OR mobile_digits LIKE ?
    ORDER BY updated_at DESC, id DESC
    LIMIT 200
  `).all(like, like, like, digitLike) as RawCustomerRow[];
  return rows.map(mapCustomer);
}

export function updateCustomerCard(
  customerId: number,
  updates: {
    name?: string;
    mobile?: string;
    totalStamps?: number;
    stampsCount?: number;
    stampDesign?: StampDesign | null;
    colorTheme?: ColorTheme | null;
    notes?: string;
  }
): CustomerCard {
  const nowIso = new Date().toISOString();

  return db.transaction(() => {
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as RawCustomerRow | undefined;
    if (!existing) {
      throw Object.assign(new Error('Customer loyalty card not found.'), { statusCode: 404 });
    }

    const nextName = updates.name !== undefined ? updates.name.trim().slice(0, 80) : existing.name;
    const nextMobile = updates.mobile !== undefined ? updates.mobile.trim().slice(0, 32) : existing.mobile;
    const nextDigits = nextMobile.replace(/\D/g, '');
    if (!nextName || nextDigits.length < 6) {
      throw Object.assign(new Error('Customer name and valid mobile number are required.'), { statusCode: 400 });
    }

    const dupMobile = db.prepare('SELECT id FROM customers WHERE mobile_digits = ? AND id != ?').get(nextDigits, customerId);
    if (dupMobile) {
      throw Object.assign(new Error('Another loyalty card already uses this mobile number.'), { statusCode: 409 });
    }

    const nextTotal =
      updates.totalStamps !== undefined
        ? Math.min(20, Math.max(4, Math.floor(updates.totalStamps)))
        : existing.total_stamps;

    const rawCount = updates.stampsCount !== undefined ? Math.floor(updates.stampsCount) : existing.stamps_count;
    const nextCount = Math.min(nextTotal, Math.max(0, rawCount));

    const nextDesign =
      updates.stampDesign === null
        ? null
        : updates.stampDesign && VALID_DESIGNS.has(updates.stampDesign)
          ? updates.stampDesign
          : existing.stamp_design;

    const nextTheme =
      updates.colorTheme === null
        ? null
        : updates.colorTheme && VALID_THEMES.has(updates.colorTheme)
          ? updates.colorTheme
          : existing.color_theme;

    const nextNotes = updates.notes !== undefined ? updates.notes.trim().slice(0, 240) : existing.notes;

    db.prepare(`
      UPDATE customers
      SET name = ?, mobile = ?, mobile_digits = ?, total_stamps = ?, stamps_count = ?, stamp_design = ?, color_theme = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(nextName, nextMobile, nextDigits, nextTotal, nextCount, nextDesign, nextTheme, nextNotes, nowIso, customerId);

    if (nextCount !== existing.stamps_count || nextTotal !== existing.total_stamps) {
      db.prepare(`
        INSERT INTO stamp_history (customer_id, cycle_number, slot_number, event_type, note, created_at)
        VALUES (?, ?, ?, 'CARD_ADJUSTED', ?, ?)
      `).run(
        customerId,
        existing.completed_cycles + 1,
        nextCount,
        `Admin adjusted card to ${nextCount}/${nextTotal}`,
        nowIso
      );
    }

    logActivity(
      'CUSTOMER_EDITED',
      'admin',
      `Updated ${existing.card_code} (${nextName}): ${nextCount}/${nextTotal} stamps.`,
      customerId,
      nextName
    );

    return getCardById(customerId)!;
  })();
}

export function deleteCustomerCard(customerId: number): void {
  db.transaction(() => {
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as RawCustomerRow | undefined;
    if (!existing) {
      throw Object.assign(new Error('Customer loyalty card not found.'), { statusCode: 404 });
    }
    db.prepare('DELETE FROM customers WHERE id = ?').run(customerId);
    logActivity(
      'CUSTOMER_DELETED',
      'admin',
      `Deleted card ${existing.card_code} (${existing.name}, ${existing.mobile}).`,
      customerId,
      existing.name
    );
  })();
}

export function updateBrandSettings(input: {
  defaultTotalStamps?: number;
  stampDesign?: StampDesign;
  colorTheme?: ColorTheme;
  rewardTitle?: string;
  rewardSubtitle?: string;
  brandTagline?: string;
  applyToExistingCards?: boolean;
}): LoyaltySettings {
  db.transaction(() => {
    let nextTotal: number | undefined;
    if (input.defaultTotalStamps !== undefined) {
      nextTotal = Math.min(20, Math.max(4, Math.floor(input.defaultTotalStamps)));
      setSetting('default_total_stamps', String(nextTotal));
    }
    if (input.stampDesign && VALID_DESIGNS.has(input.stampDesign)) {
      setSetting('stamp_design', input.stampDesign);
    }
    if (input.colorTheme && VALID_THEMES.has(input.colorTheme)) {
      setSetting('color_theme', input.colorTheme);
    }
    if (input.rewardTitle !== undefined) {
      setSetting('reward_title', input.rewardTitle.trim().slice(0, 100) || 'Complimentary Signature Gift');
    }
    if (input.rewardSubtitle !== undefined) {
      setSetting('reward_subtitle', input.rewardSubtitle.trim().slice(0, 220));
    }
    if (input.brandTagline !== undefined) {
      setSetting('brand_tagline', input.brandTagline.trim().slice(0, 80) || 'Bespoke Atelier & Fine Objects');
    }

    if (input.applyToExistingCards && nextTotal !== undefined) {
      db.prepare(`
        UPDATE customers
        SET total_stamps = ?,
            stamps_count = MIN(stamps_count, ?),
            updated_at = ?
      `).run(nextTotal, nextTotal, new Date().toISOString());
    }

    const updated = getPublicSettings();
    logActivity(
      'SETTINGS_UPDATED',
      'admin',
      `Updated brand settings: ${updated.defaultTotalStamps} slots, ${updated.stampDesign} stamp, ${updated.colorTheme} palette${input.applyToExistingCards ? ' (applied to existing cards)' : ''}.`
    );
  })();

  return getPublicSettings();
}

export function changeAdminPin(currentPin: string, newPin: string): string {
  if (!verifyAdminPin(currentPin)) {
    logActivity('AUTH_FAILED', 'admin', 'Failed attempt to change admin PIN due to incorrect current PIN.');
    throw Object.assign(new Error('Current PIN is incorrect.'), { statusCode: 403 });
  }
  if (!isValidPinFormat(newPin)) {
    throw Object.assign(new Error('New PIN must be 4 to 8 numeric digits.'), { statusCode: 400 });
  }
  if (process.env.ADMIN_PIN && process.env.ADMIN_PIN.trim().length > 0) {
    throw Object.assign(
      new Error('PIN is currently locked by the server ADMIN_PIN environment variable. Remove ADMIN_PIN to manage it in-app.'),
      { statusCode: 409 }
    );
  }

  db.transaction(() => {
    setSetting('pin_hash', hashPin(newPin));
    const nextVersion = (Number.parseInt(getSetting('token_version', '1'), 10) || 1) + 1;
    setSetting('token_version', String(nextVersion));
    logActivity('PIN_CHANGED', 'admin', 'Admin security PIN was updated and prior sessions invalidated.');
  })();

  return issueAdminToken();
}

export function getActivityLogs(actionFilter = '', limit = 100): ActivityLog[] {
  const safeLimit = Math.min(300, Math.max(10, limit));
  const filter = actionFilter.trim();
  const rows = filter
    ? (db.prepare(`
        SELECT id, action, actor_role, target_customer_id, target_name, details, created_at
        FROM activity_logs
        WHERE action = ?
        ORDER BY id DESC
        LIMIT ?
      `).all(filter, safeLimit) as Array<{
        id: number;
        action: string;
        actor_role: 'admin' | 'staff' | 'customer' | 'system';
        target_customer_id: number | null;
        target_name: string | null;
        details: string;
        created_at: string;
      }>)
    : (db.prepare(`
        SELECT id, action, actor_role, target_customer_id, target_name, details, created_at
        FROM activity_logs
        ORDER BY id DESC
        LIMIT ?
      `).all(safeLimit) as Array<{
        id: number;
        action: string;
        actor_role: 'admin' | 'staff' | 'customer' | 'system';
        target_customer_id: number | null;
        target_name: string | null;
        details: string;
        created_at: string;
      }>);

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    actorRole: r.actor_role,
    targetCustomerId: r.target_customer_id,
    targetName: r.target_name,
    details: r.details,
    createdAt: r.created_at,
  }));
}

export function createDatabaseBackup(): BackupPayload {
  const settings = getPublicSettings();
  const customers = (db.prepare('SELECT * FROM customers ORDER BY id ASC').all() as RawCustomerRow[]).map(mapCustomer);
  const stampHistory = (db.prepare('SELECT * FROM stamp_history ORDER BY id ASC').all() as Array<{
    id: number;
    customer_id: number;
    cycle_number: number;
    slot_number: number;
    event_type: 'STAMP_ADDED' | 'CYCLE_RESET' | 'CARD_ADJUSTED';
    note: string;
    created_at: string;
  }>).map((r) => ({
    id: r.id,
    customerId: r.customer_id,
    cycleNumber: r.cycle_number,
    slotNumber: r.slot_number,
    eventType: r.event_type,
    note: r.note,
    createdAt: r.created_at,
  }));
  const activityLogs = getActivityLogs('', 500);

  logActivity('BACKUP_EXPORTED', 'admin', `Exported full backup (${customers.length} customer cards, ${stampHistory.length} stamp events).`);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    brand: 'YOS COLLECTION',
    settings: {
      defaultTotalStamps: settings.defaultTotalStamps,
      stampDesign: settings.stampDesign,
      colorTheme: settings.colorTheme,
      rewardTitle: settings.rewardTitle,
      rewardSubtitle: settings.rewardSubtitle,
      brandTagline: settings.brandTagline,
    },
    customers,
    stampHistory,
    activityLogs,
  };
}

export function restoreDatabaseBackup(payload: unknown): { restoredCustomers: number; restoredHistory: number } {
  if (!payload || typeof payload !== 'object') {
    throw Object.assign(new Error('Invalid backup file format.'), { statusCode: 400 });
  }
  const data = payload as Partial<BackupPayload>;
  if (data.brand !== 'YOS COLLECTION' || !Array.isArray(data.customers) || !Array.isArray(data.stampHistory)) {
    throw Object.assign(new Error('Backup file is not a valid YOS COLLECTION archive.'), { statusCode: 400 });
  }

  let restoredCustomers = 0;
  let restoredHistory = 0;

  db.transaction(() => {
    if (data.settings) {
      const s = data.settings;
      if (typeof s.defaultTotalStamps === 'number') {
        setSetting('default_total_stamps', String(Math.min(20, Math.max(4, Math.floor(s.defaultTotalStamps)))));
      }
      if (s.stampDesign && VALID_DESIGNS.has(s.stampDesign)) {
        setSetting('stamp_design', s.stampDesign);
      }
      if (s.colorTheme && VALID_THEMES.has(s.colorTheme)) {
        setSetting('color_theme', s.colorTheme);
      }
      if (typeof s.rewardTitle === 'string') {
        setSetting('reward_title', s.rewardTitle.slice(0, 100));
      }
      if (typeof s.rewardSubtitle === 'string') {
        setSetting('reward_subtitle', s.rewardSubtitle.slice(0, 220));
      }
      if (typeof s.brandTagline === 'string') {
        setSetting('brand_tagline', s.brandTagline.slice(0, 80));
      }
    }

    db.prepare('DELETE FROM stamp_history').run();
    db.prepare('DELETE FROM customers').run();

    const insertCust = db.prepare(`
      INSERT INTO customers (id, card_code, name, mobile, mobile_digits, stamps_count, total_stamps, completed_cycles, stamp_design, color_theme, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const validIds = new Set<number>();

    for (const c of data.customers!) {
      if (!c || typeof c.name !== 'string' || typeof c.mobile !== 'string' || typeof c.cardCode !== 'string') {
        throw Object.assign(new Error('Corrupted customer record in backup.'), { statusCode: 400 });
      }
      const digits = c.mobile.replace(/\D/g, '');
      const total = Math.min(20, Math.max(4, Number(c.totalStamps) || 6));
      const count = Math.min(total, Math.max(0, Number(c.stampsCount) || 0));
      const cycles = Math.max(0, Number(c.completedCycles) || 0);
      const design = c.stampDesign && VALID_DESIGNS.has(c.stampDesign) ? c.stampDesign : null;
      const theme = c.colorTheme && VALID_THEMES.has(c.colorTheme) ? c.colorTheme : null;

      insertCust.run(
        c.id,
        c.cardCode.slice(0, 24),
        c.name.slice(0, 80),
        c.mobile.slice(0, 32),
        digits,
        count,
        total,
        cycles,
        design,
        theme,
        (c.notes || '').slice(0, 240),
        c.createdAt || new Date().toISOString(),
        c.updatedAt || new Date().toISOString()
      );
      validIds.add(c.id);
      restoredCustomers++;
    }

    const insertHist = db.prepare(`
      INSERT INTO stamp_history (customer_id, cycle_number, slot_number, event_type, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const h of data.stampHistory!) {
      if (!h || !validIds.has(h.customerId)) continue;
      insertHist.run(
        h.customerId,
        Math.max(1, Number(h.cycleNumber) || 1),
        Math.max(0, Number(h.slotNumber) || 0),
        h.eventType || 'STAMP_ADDED',
        (h.note || '').slice(0, 160),
        h.createdAt || new Date().toISOString()
      );
      restoredHistory++;
    }

    logActivity(
      'BACKUP_RESTORED',
      'admin',
      `Restored database from backup (${restoredCustomers} customer cards, ${restoredHistory} stamp events).`
    );
  })();

  return { restoredCustomers, restoredHistory };
}
