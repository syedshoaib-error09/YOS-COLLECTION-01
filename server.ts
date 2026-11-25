import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import {
  addStampToCard,
  changeAdminPin,
  createCustomerCard,
  createDatabaseBackup,
  deleteCustomerCard,
  getActivityLogs,
  getCardById,
  getCardHistory,
  getFeaturedCard,
  getPublicSettings,
  initDatabase,
  issueAdminToken,
  logActivity,
  lookupSingleCard,
  resetCompletedCard,
  restoreDatabaseBackup,
  searchCustomers,
  updateBrandSettings,
  updateCustomerCard,
  verifyAdminPin,
  verifyAdminToken,
} from './server/db';

initDatabase();

const app = express();
app.use(express.json({ limit: '2mb' }));

// Simple per-IP PIN attempt rate limiter (max 12 failures in 5 minutes)
const failedPinAttempts = new Map<string, number[]>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_FAILURES = 12;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (failedPinAttempts.get(ip) || []).filter((ts) => now - ts < WINDOW_MS);
  failedPinAttempts.set(ip, list);
  return list.length >= MAX_FAILURES;
}

function recordPinFailure(ip: string): void {
  const now = Date.now();
  const list = (failedPinAttempts.get(ip) || []).filter((ts) => now - ts < WINDOW_MS);
  list.push(now);
  failedPinAttempts.set(ip, list);
}

function clearPinFailures(ip: string): void {
  failedPinAttempts.delete(ip);
}

function extractBearer(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return undefined;
  return auth.slice(7).trim();
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearer(req);
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Staff authorization required. Please sign in with your admin PIN.' });
    return;
  }
  next();
}

// Public Settings & Featured/Lookup Card Routes
app.get('/api/settings', (_req, res) => {
  res.json(getPublicSettings());
});

app.get('/api/cards/featured', (_req, res) => {
  const card = getFeaturedCard();
  if (!card) {
    res.json({ card: null, history: [] });
    return;
  }
  res.json({ card, history: getCardHistory(card.id) });
});

app.get('/api/cards/lookup', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  if (!q.trim()) {
    res.status(400).json({ error: 'Enter a mobile number or card code to locate your card.' });
    return;
  }
  const card = lookupSingleCard(q);
  if (!card) {
    res.status(404).json({ error: 'No YOS COLLECTION loyalty card matched that mobile number or card code.' });
    return;
  }
  res.json({ card, history: getCardHistory(card.id) });
});

app.get('/api/cards/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid card ID.' });
    return;
  }
  const card = getCardById(id);
  if (!card) {
    res.status(404).json({ error: 'Loyalty card not found.' });
    return;
  }
  res.json({ card, history: getCardHistory(card.id) });
});

app.post('/api/cards/register', (req, res) => {
  try {
    const { name, mobile, notes, totalStamps } = req.body || {};
    const isAdmin = verifyAdminToken(extractBearer(req));
    const result = createCustomerCard({
      name: String(name || ''),
      mobile: String(mobile || ''),
      notes: typeof notes === 'string' ? notes : '',
      totalStamps: isAdmin && typeof totalStamps === 'number' ? totalStamps : undefined,
      actorRole: isAdmin ? 'admin' : 'customer',
    });
    res.status(result.created ? 201 : 200).json({
      created: result.created,
      card: result.card,
      history: getCardHistory(result.card.id),
      message: result.created
        ? `Loyalty card ${result.card.cardCode} created for ${result.card.name}.`
        : `Welcome back, ${result.card.name}. Existing loyalty card ${result.card.cardCode} loaded.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to register customer card.';
    res.status(400).json({ error: message });
  }
});

// PIN-protected stamp route (requires valid staff PIN on every stamp action)
app.post('/api/cards/:id/stamp', (req, res) => {
  const ip = req.ip || 'unknown';
  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'Too many incorrect PIN attempts. Please wait 5 minutes before trying again.' });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid card ID.' });
    return;
  }

  const { pin, note, idempotencyKey } = req.body || {};
  if (!verifyAdminPin(String(pin || ''))) {
    recordPinFailure(ip);
    const target = getCardById(id);
    logActivity(
      'AUTH_FAILED',
      'staff',
      `Incorrect PIN entered when attempting to stamp ${target ? `${target.cardCode} (${target.name})` : `card #${id}`}.`,
      target?.id ?? null,
      target?.name ?? null
    );
    res.status(403).json({ error: 'Incorrect staff PIN. Stamp was not added.' });
    return;
  }

  clearPinFailures(ip);

  try {
    const result = addStampToCard({
      customerId: id,
      note: typeof note === 'string' ? note : undefined,
      idempotencyKey: typeof idempotencyKey === 'string' ? idempotencyKey : undefined,
    });

    res.json({
      card: result.card,
      event: result.event,
      history: getCardHistory(result.card.id),
      completedNow: result.completedNow,
      message: result.completedNow
        ? `Stamp ${result.card.stampsCount}/${result.card.totalStamps} verified. Card completed!`
        : `Stamp ${result.card.stampsCount}/${result.card.totalStamps} added to ${result.card.name}'s card.`,
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode || 400;
    const message = err instanceof Error ? err.message : 'Unable to add stamp.';
    res.status(status).json({ error: message });
  }
});

// Reset completed card (accepts Admin Bearer token OR valid Staff PIN)
app.post('/api/cards/:id/reset', (req, res) => {
  const ip = req.ip || 'unknown';
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid card ID.' });
    return;
  }

  const hasAdminToken = verifyAdminToken(extractBearer(req));
  const { pin, note } = req.body || {};

  if (!hasAdminToken) {
    if (isRateLimited(ip)) {
      res.status(429).json({ error: 'Too many incorrect PIN attempts. Please wait 5 minutes.' });
      return;
    }
    if (!verifyAdminPin(String(pin || ''))) {
      recordPinFailure(ip);
      res.status(403).json({ error: 'Admin authorization or valid staff PIN is required to reset a loyalty card.' });
      return;
    }
    clearPinFailures(ip);
  }

  try {
    const card = resetCompletedCard({
      customerId: id,
      note: typeof note === 'string' ? note : undefined,
      actorRole: hasAdminToken ? 'admin' : 'staff',
    });
    res.json({
      card,
      history: getCardHistory(card.id),
      message: `Loyalty card ${card.cardCode} has been reset for a new cycle.`,
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode || 400;
    const message = err instanceof Error ? err.message : 'Unable to reset card.';
    res.status(status).json({ error: message });
  }
});

// Admin Auth Routes
app.post('/api/auth/login', (req, res) => {
  const ip = req.ip || 'unknown';
  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'Too many incorrect PIN attempts. Please wait 5 minutes.' });
    return;
  }

  const { pin } = req.body || {};
  if (!verifyAdminPin(String(pin || ''))) {
    recordPinFailure(ip);
    logActivity('AUTH_FAILED', 'admin', 'Failed Admin Dashboard sign-in attempt.');
    res.status(403).json({ error: 'Incorrect Admin PIN.' });
    return;
  }

  clearPinFailures(ip);
  const token = issueAdminToken();
  logActivity('AUTH_LOGIN', 'admin', 'Admin signed in to YOS COLLECTION management console.');
  res.json({ token, role: 'admin' });
});

app.get('/api/auth/session', (req, res) => {
  const valid = verifyAdminToken(extractBearer(req));
  res.json({ authenticated: valid, role: valid ? 'admin' : 'customer' });
});

// Protected Admin Routes
app.get('/api/admin/customers', requireAdmin, (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  res.json({ customers: searchCustomers(q) });
});

app.patch('/api/admin/customers/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid customer ID.' });
    return;
  }
  try {
    const updated = updateCustomerCard(id, req.body || {});
    res.json({ card: updated, history: getCardHistory(updated.id) });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode || 400;
    const message = err instanceof Error ? err.message : 'Unable to update customer card.';
    res.status(status).json({ error: message });
  }
});

app.delete('/api/admin/customers/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid customer ID.' });
    return;
  }
  try {
    deleteCustomerCard(id);
    res.json({ ok: true });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode || 400;
    const message = err instanceof Error ? err.message : 'Unable to delete customer card.';
    res.status(status).json({ error: message });
  }
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  try {
    const settings = updateBrandSettings(req.body || {});
    res.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to update settings.';
    res.status(400).json({ error: message });
  }
});

app.post('/api/admin/change-pin', requireAdmin, (req, res) => {
  const { currentPin, newPin } = req.body || {};
  try {
    const nextToken = changeAdminPin(String(currentPin || ''), String(newPin || ''));
    res.json({ token: nextToken, message: 'Admin PIN updated securely.' });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode || 400;
    const message = err instanceof Error ? err.message : 'Unable to update PIN.';
    res.status(status).json({ error: message });
  }
});

app.get('/api/admin/logs', requireAdmin, (req, res) => {
  const action = typeof req.query.action === 'string' ? req.query.action : '';
  const limit = Number(req.query.limit) || 120;
  res.json({ logs: getActivityLogs(action, limit) });
});

app.get('/api/admin/backup', requireAdmin, (_req, res) => {
  const backup = createDatabaseBackup();
  res.json(backup);
});

app.post('/api/admin/restore', requireAdmin, (req, res) => {
  try {
    const result = restoreDatabaseBackup(req.body);
    res.json({
      ...result,
      settings: getPublicSettings(),
      message: `Restored ${result.restoredCustomers} customer cards and ${result.restoredHistory} stamp records.`,
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode || 400;
    const message = err instanceof Error ? err.message : 'Unable to restore backup.';
    res.status(status).json({ error: message });
  }
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`YOS COLLECTION server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
