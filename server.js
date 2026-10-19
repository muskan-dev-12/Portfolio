require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const app = express();
const PRIVATE = path.join(__dirname, 'private');
const COOKIE = 'token';
const secureCookie = process.env.COOKIE_SECURE === 'true'; // HTTPS par true karo
const SOCIAL = new Set(['linkedin', 'github', 'instagram', 'email']);

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

app.set('trust proxy', 1); // nginx/docker ke peeche ho to sahi IP milega
app.use(helmet({ contentSecurityPolicy: false })); // baad me CSP tight kar sakti ho
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const sign = (u) =>
  jwt.sign({ id: u.id, name: u.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
const setCookie = (res, token) =>
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie,
    maxAge: 7 * 24 * 3600 * 1000,
  });

function requireAuth(req, res, next) {
  try {
    req.user = jwt.verify(req.cookies[COOKIE], process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Login required' });
  }
}

const logEvent = (userId, action, target) =>
  db.execute('INSERT INTO click_events (user_id, action, target) VALUES (?, ?, ?)', [
    userId, action, target,
  ]);

app.post('/api/signup', authLimiter, wrap(async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 80);
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 72)
    return res.status(400).json({ error: 'Valid name, email and password (8-72 chars) chahiye' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const [r] = await db.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, hash]);
    setCookie(res, sign({ id: r.insertId, name }));
    res.json({ name });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already registered' });
    throw e;
  }
}));

app.post('/api/login', authLimiter, wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const [rows] = await db.execute(
    'SELECT id, name, password_hash FROM users WHERE email = ?', [email]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(password, u.password_hash)))
    return res.status(401).json({ error: 'Email ya password galat hai' });
  setCookie(res, sign(u));
  res.json({ name: u.name });
}));

app.post('/api/logout', (req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => res.json({ name: req.user.name }));

// social link clicks (LinkedIn, Instagram, ...)
app.post('/api/track', requireAuth, wrap(async (req, res) => {
  const target = String(req.body.target || '');
  if (!SOCIAL.has(target)) return res.status(400).json({ error: 'Unknown target' });
  await logEvent(req.user.id, 'social_click', target);
  res.json({ ok: true });
}));

// protected files: resume + certificates (private/ folder se)
app.get('/files/:name', requireAuth, wrap(async (req, res) => {
  const name = req.params.name;
  const full = path.join(PRIVATE, name);
  if (!/^[\w.-]+$/.test(name) || !full.startsWith(PRIVATE + path.sep) || !fs.existsSync(full))
    return res.status(404).end();
  const isResume = /resume/i.test(name);
  await logEvent(req.user.id, isResume ? 'resume_download' : 'certificate_view', name);
  res.set('Cache-Control', 'private, no-store');
  return isResume ? res.download(full) : res.sendFile(full);
}));

// sirf logged-in user ki apni activity
app.get('/api/my-activity', requireAuth, wrap(async (req, res) => {
  const [rows] = await db.execute(
    'SELECT action, target, created_at FROM click_events WHERE user_id = ? ORDER BY id DESC LIMIT 50',
    [req.user.id]);
  res.json(rows);
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(process.env.PORT || 3000, () => console.log('Running on port ' + (process.env.PORT || 3000)));
