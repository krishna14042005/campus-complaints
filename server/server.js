import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Student, Admin, Staff, Complaint, Notification, Feedback, History } from './models.js';
import { CATEGORIES, analyze, similarity, chat } from './ai.js';

const STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const M = { student: Student, admin: Admin, staff: Staff };
const oid = (id) => new mongoose.Types.ObjectId(id);
fs.mkdirSync('uploads', { recursive: true });

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static('uploads'));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 60 }));

const upload = multer({
  storage: multer.diskStorage({ destination: 'uploads', filename: (q, f, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(f.originalname).toLowerCase()}`) }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (q, f, cb) => cb(null, /^image\/(png|jpe?g|webp|gif)$/.test(f.mimetype))
});
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const bad = (res, m, c = 400) => res.status(c).json({ message: m });
const sign = (u, role) => jwt.sign({ id: u._id, role, name: u.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u, role) => { const o = u.toObject(); delete o.password; return { ...o, role }; };
const auth = (...roles) => (req, res, next) => {
  try {
    req.user = jwt.verify((req.headers.authorization || '').split(' ')[1], process.env.JWT_SECRET);
    if (roles.length && !roles.includes(req.user.role)) return bad(res, 'You do not have access to this', 403);
    next();
  } catch { bad(res, 'Please log in again', 401); }
};
const notify = (user, role, message, c) => Notification.create({ user, role, message, complaint: c._id, complaintId: c.complaintId });
const log = (c, action, req, note = '') => History.create({ complaint: c._id, complaintId: c.complaintId, action, by: req.user.name, byRole: req.user.role, note });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- Auth ----------
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password, rollNo, department, hostel, phone } = req.body;
  if (!name || name.trim().length < 2) return bad(res, 'Enter your full name');
  if (!/^\S+@\S+\.\S+$/.test(email || '')) return bad(res, 'Enter a valid email address');
  if ((password || '').length < 8) return bad(res, 'Password must be at least 8 characters');
  if (await Student.findOne({ email: email.toLowerCase() })) return bad(res, 'This email is already registered', 409);
  const s = await Student.create({ name: name.trim(), email, password: await bcrypt.hash(password, 10), rollNo, department, hostel, phone });
  res.status(201).json({ token: sign(s, 'student'), user: publicUser(s, 'student') });
}));
app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password, role } = req.body;
  if (!M[role]) return bad(res, 'Choose a role');
  const u = await M[role].findOne({ email: (email || '').toLowerCase() });
  if (!u || !(await bcrypt.compare(password || '', u.password))) return bad(res, 'Incorrect email or password', 401);
  if (!u.active) return bad(res, 'This account has been disabled', 403);
  res.json({ token: sign(u, role), user: publicUser(u, role) });
}));
app.get('/api/me', auth(), wrap(async (req, res) => res.json(publicUser(await M[req.user.role].findById(req.user.id), req.user.role))));
app.put('/api/me', auth(), wrap(async (req, res) => {
  const u = await M[req.user.role].findById(req.user.id);
  const { name, phone, rollNo, department, hostel, password } = req.body;
  if (name !== undefined) { if (name.trim().length < 2) return bad(res, 'Enter your full name'); u.name = name.trim(); }
  Object.assign(u, Object.fromEntries(Object.entries({ phone, rollNo, department, hostel }).filter(([, v]) => v !== undefined)));
  if (password) { if (password.length < 8) return bad(res, 'Password must be at least 8 characters'); u.password = await bcrypt.hash(password, 10); }
  await u.save(); res.json(publicUser(u, req.user.role));
}));

// ---------- Complaints ----------
app.post('/api/complaints', auth('student'), upload.array('images', 4), wrap(async (req, res) => {
  const { title = '', description = '', category, block = '', floor = '', room = '' } = req.body;
  if (title.trim().length < 5) return bad(res, 'Title must be at least 5 characters');
  if (description.trim().length < 15) return bad(res, 'Describe the problem in at least 15 characters');
  if (!CATEGORIES.includes(category)) return bad(res, 'Choose a category');
  if (!block.trim()) return bad(res, 'Enter the block or hostel');
  const text = `${title}. ${description}`;
  const ai = await analyze(text);
  const open = await Complaint.find({ status: { $nin: ['Resolved', 'Rejected'] }, 'location.block': block.trim() }).limit(200);
  const dup = open.find((o) => similarity(`${o.title}. ${o.description}`, text) >= 0.5);
  const stu = await Student.findById(req.user.id);
  const c = await Complaint.create({
    complaintId: 'CMP-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    student: stu._id, studentName: stu.name, category, title: title.trim(), description: description.trim(),
    location: { block: block.trim(), floor, room }, images: (req.files || []).map((f) => '/uploads/' + f.filename),
    aiCategory: ai.category, aiPriority: ai.priority, priority: ai.priority, sentiment: ai.sentiment, summary: ai.summary, recommendation: ai.recommendation,
    duplicateOf: dup?.complaintId
  });
  await log(c, 'Submitted', req); await notify(null, 'admin', `New ${ai.priority} complaint ${c.complaintId}: ${c.title}`, c);
  await notify(stu._id, 'student', `Your complaint ${c.complaintId} was submitted`, c);
  res.status(201).json(c);
}));
app.get('/api/complaints', auth(), wrap(async (req, res) => {
  const { q, category, status, priority, from, to, limit } = req.query; const f = {};
  if (req.user.role === 'student') f.student = oid(req.user.id);
  if (req.user.role === 'staff') f.assignedStaff = oid(req.user.id);
  if (category) f.category = category; if (status) f.status = status; if (priority) f.priority = priority;
  if (from || to) f.createdAt = { ...(from && { $gte: new Date(from) }), ...(to && { $lte: new Date(to + 'T23:59:59') }) };
  if (q) { const r = new RegExp(esc(q), 'i'); f.$or = [{ complaintId: r }, { studentName: r }, { category: r }, { title: r }]; }
  res.json(await Complaint.find(f).populate('assignedStaff', 'name').sort('-createdAt').limit(Math.min(+limit || 500, 500)));
}));
app.get('/api/complaints/:id', auth(), wrap(async (req, res) => {
  const c = await Complaint.findById(req.params.id).populate('assignedStaff', 'name email');
  if (!c) return bad(res, 'Complaint not found', 404);
  if ((req.user.role === 'student' && String(c.student) !== req.user.id) || (req.user.role === 'staff' && String(c.assignedStaff?._id) !== req.user.id)) return bad(res, 'You do not have access to this complaint', 403);
  res.json({ complaint: c, history: await History.find({ complaint: c._id }).sort('createdAt') });
}));
app.patch('/api/complaints/:id', auth('admin', 'staff'), upload.fields([{ name: 'before', maxCount: 3 }, { name: 'after', maxCount: 3 }]), wrap(async (req, res) => {
  const c = await Complaint.findById(req.params.id); if (!c) return bad(res, 'Complaint not found', 404);
  const { status, adminRemarks, resolutionRemarks, assignedStaff, priority } = req.body; const before = c.status; let assigned;
  if (req.user.role === 'staff') {
    if (String(c.assignedStaff) !== req.user.id) return bad(res, 'This complaint is not assigned to you', 403);
    if (status && !['In Progress', 'Resolved'].includes(status)) return bad(res, 'Staff can only set In Progress or Resolved');
    if (status === 'Resolved' && !(resolutionRemarks || c.resolutionRemarks)) return bad(res, 'Add completion remarks before marking as resolved');
  } else {
    if (status && !STATUSES.includes(status)) return bad(res, 'Invalid status');
    if (priority) { if (!PRIORITIES.includes(priority)) return bad(res, 'Invalid priority'); c.priority = priority; }
    if (adminRemarks !== undefined) c.adminRemarks = adminRemarks;
  }
  if (status) c.status = status;
  if (req.user.role === 'admin' && assignedStaff) {
    assigned = await Staff.findById(assignedStaff); if (!assigned) return bad(res, 'Staff member not found', 404);
    c.assignedStaff = assigned._id; if (['Submitted', 'Under Review'].includes(c.status)) c.status = 'Assigned';
  }
  if (resolutionRemarks !== undefined) c.resolutionRemarks = resolutionRemarks;
  c.beforeImages.push(...(req.files?.before || []).map((x) => '/uploads/' + x.filename));
  c.afterImages.push(...(req.files?.after || []).map((x) => '/uploads/' + x.filename));
  if (c.status === 'Resolved' && !c.resolvedAt) c.resolvedAt = new Date();
  await c.save();
  if (assigned) { await log(c, 'Assigned', req, assigned.name); await notify(assigned._id, 'staff', `New task assigned: ${c.complaintId} - ${c.title}`, c); }
  if (c.status !== before) {
    await log(c, 'Status: ' + c.status, req, adminRemarks || resolutionRemarks || '');
    await notify(c.student, 'student', `Complaint ${c.complaintId} is now ${c.status}`, c);
    if (req.user.role === 'staff') await notify(null, 'admin', `${req.user.name} marked ${c.complaintId} as ${c.status}`, c);
  }
  res.json(await c.populate('assignedStaff', 'name'));
}));
app.delete('/api/complaints/:id', auth('admin'), wrap(async (req, res) => {
  const c = await Complaint.findByIdAndDelete(req.params.id); if (!c) return bad(res, 'Complaint not found', 404);
  await Promise.all([History.deleteMany({ complaint: c._id }), Feedback.deleteMany({ complaint: c._id }), Notification.deleteMany({ complaint: c._id })]);
  res.json({ ok: true });
}));
app.post('/api/complaints/:id/feedback', auth('student'), wrap(async (req, res) => {
  const c = await Complaint.findById(req.params.id);
  if (!c || String(c.student) !== req.user.id) return bad(res, 'Complaint not found', 404);
  if (c.status !== 'Resolved') return bad(res, 'You can give feedback once the complaint is resolved');
  if (c.rating) return bad(res, 'Feedback was already submitted', 409);
  const rating = +req.body.rating; if (!(rating >= 1 && rating <= 5)) return bad(res, 'Choose a rating from 1 to 5');
  await Feedback.create({ complaint: c._id, student: c.student, rating, comment: req.body.comment });
  c.rating = rating; c.feedback = req.body.comment; await c.save(); await log(c, 'Feedback given', req, `${rating}/5`);
  await notify(null, 'admin', `${c.complaintId} rated ${rating}/5`, c); res.json(c);
}));

// ---------- Notifications, stats, reports ----------
const nScope = (u) => (u.role === 'admin' ? { role: 'admin' } : { user: oid(u.id) });
app.get('/api/notifications', auth(), wrap(async (req, res) => {
  const items = await Notification.find(nScope(req.user)).sort('-createdAt').limit(100);
  res.json({ items, unread: items.filter((n) => !n.read).length });
}));
app.patch('/api/notifications/read', auth(), wrap(async (req, res) => { await Notification.updateMany(nScope(req.user), { read: true }); res.json({ ok: true }); }));

app.get('/api/stats', auth(), wrap(async (req, res) => {
  const { id, role } = req.user;
  const scope = role === 'student' ? { student: oid(id) } : role === 'staff' ? { assignedStaff: oid(id) } : {};
  const rows = await Complaint.aggregate([{ $match: scope }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
  const status = Object.fromEntries(rows.map((r) => [r._id, r.n])); const out = { status, total: Object.values(status).reduce((a, b) => a + b, 0) };
  if (role === 'admin') {
    out.students = await Student.countDocuments(); out.staff = await Staff.countDocuments();
    out.byCategory = (await Complaint.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }, { $sort: { n: -1 } }])).map((x) => ({ name: x._id, value: x.n }));
    out.trend = (await Complaint.aggregate([{ $match: { createdAt: { $gte: new Date(Date.now() - 14 * 864e5) } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } }, { $sort: { _id: 1 } }])).map((x) => ({ date: x._id.slice(5), count: x.n }));
    out.frequent = (await Complaint.aggregate([{ $group: { _id: { c: '$category', b: '$location.block' }, n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 5 }])).map((x) => ({ category: x._id.c, block: x._id.b, count: x.n }));
  }
  res.json(out);
}));
app.get('/api/admin/report', auth('admin'), wrap(async (req, res) => {
  const period = ['daily', 'weekly', 'monthly'].includes(req.query.period) ? req.query.period : 'daily';
  const since = new Date(Date.now() - { daily: 1, weekly: 7, monthly: 30 }[period] * 864e5);
  const list = await Complaint.find({ createdAt: { $gte: since } }).populate('assignedStaff', 'name').sort('-createdAt');
  const count = (k) => Object.entries(list.reduce((a, c) => ((a[c[k]] = (a[c[k]] || 0) + 1), a), {})).map(([name, value]) => ({ name, value }));
  const done = list.filter((c) => c.resolvedAt);
  res.json({ period, since, total: list.length, resolved: done.length, byCategory: count('category'), byStatus: count('status'),
    avgResolutionHours: done.length ? +(done.reduce((s, c) => s + (c.resolvedAt - c.createdAt), 0) / done.length / 36e5).toFixed(1) : null, complaints: list });
}));

// ---------- User management ----------
const T = { students: Student, staff: Staff };
app.get('/api/staff', auth('admin'), wrap(async (req, res) => res.json(await Staff.find({ active: true }).select('name specialty'))));
app.get('/api/admin/users/:type', auth('admin'), wrap(async (req, res) => T[req.params.type] ? res.json(await T[req.params.type].find().select('-password').sort('-createdAt')) : bad(res, 'Unknown user type', 404)));
app.post('/api/admin/users/staff', auth('admin'), wrap(async (req, res) => {
  const { name, email, password, phone, specialty } = req.body;
  if (!name || name.trim().length < 2) return bad(res, 'Enter the staff name');
  if (!/^\S+@\S+\.\S+$/.test(email || '')) return bad(res, 'Enter a valid email address');
  if ((password || '').length < 8) return bad(res, 'Password must be at least 8 characters');
  if (await Staff.findOne({ email: email.toLowerCase() })) return bad(res, 'This email is already registered', 409);
  const s = await Staff.create({ name: name.trim(), email, phone, specialty, password: await bcrypt.hash(password, 10) });
  res.status(201).json(publicUser(s, 'staff'));
}));
app.patch('/api/admin/users/:type/:id', auth('admin'), wrap(async (req, res) => { const M2 = T[req.params.type]; if (!M2) return bad(res, 'Unknown user type', 404); res.json(await M2.findByIdAndUpdate(req.params.id, { active: !!req.body.active }, { new: true }).select('-password')); }));
app.delete('/api/admin/users/:type/:id', auth('admin'), wrap(async (req, res) => { const M2 = T[req.params.type]; if (!M2) return bad(res, 'Unknown user type', 404); await M2.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

// ---------- AI chatbot ----------
app.post('/api/ai/chat', auth('student'), wrap(async (req, res) => {
  const message = (req.body.message || '').slice(0, 500); if (!message.trim()) return bad(res, 'Type a question first');
  const recent = await Complaint.find({ student: oid(req.user.id) }).sort('-createdAt').limit(5);
  res.json({ reply: await chat(message, recent.map((c) => `- ${c.complaintId} "${c.title}": ${c.status}`).join('\n')) });
}));

app.use((req, res) => bad(res, 'Not found', 404));
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') return bad(res, 'Each image must be under 5 MB');
  if (err.code === 11000) return bad(res, 'That record already exists', 409);
  if (['ValidationError', 'CastError'].includes(err.name)) return bad(res, 'Invalid data');
  bad(res, 'Something went wrong on the server', 500);
});

if (!process.env.JWT_SECRET) throw new Error('Set JWT_SECRET in server/.env');
if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI in server/.env');

const port = Number(process.env.PORT || 5000);
try {
  await mongoose.connect(process.env.MONGO_URI);
  app.listen(port, () => console.log('API running on port', port));
} catch (error) {
  console.error('Failed to connect to MongoDB:', error);
  process.exit(1);
}
