require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:4200' }));
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ---------- Plans (price in INR) ----------
const PLANS = [
  { id: 'basic', name: 'Basic', price: 99, days: 30, features: ['1 project', 'Email support'] },
  { id: 'standard', name: 'Standard', price: 299, days: 30, features: ['5 projects', 'Priority email'] },
  { id: 'pro', name: 'Pro', price: 599, days: 30, features: ['20 projects', 'Chat support'] },
  { id: 'premium', name: 'Premium', price: 999, days: 30, features: ['Unlimited projects', '24/7 support'] },
];

// ---------- Model ----------
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    loginCount: { type: Number, default: 0 },
    lastLogin: Date,
    subscription: {
      plan: String,
      amount: Number,
      paymentId: String,
      startedAt: Date,
      expiresAt: Date,
    },
  },
  { timestamps: true }
);
const User = mongoose.model('User', userSchema);

// ---------- Helpers / middleware ----------
const sign = (u) => jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
const safe = (u) => {
  const o = u.toObject();
  delete o.password;
  return o;
};

async function auth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id);
    if (!user) return res.status(401).json({ message: 'User no longer exists' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
const adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Admins only' });

// ---------- Auth ----------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6)
      return res.status(400).json({ message: 'Name, email and password (min 6 chars) are required' });
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(409).json({ message: 'Email already registered' });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
    res.status(201).json({ message: 'Registered successfully', user: safe(user) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(password || '', user.password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    user.loginCount += 1;
    user.lastLogin = new Date();
    await user.save();
    res.json({ token: sign(user), user: safe(user) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/me', auth, (req, res) => res.json(safe(req.user)));

// ---------- Plans & Razorpay ----------
app.get('/api/plans', (req, res) => res.json(PLANS));

app.post('/api/payment/order', auth, async (req, res) => {
  try {
    const plan = PLANS.find((p) => p.id === req.body.planId);
    if (!plan) return res.status(400).json({ message: 'Invalid plan' });
    const order = await razorpay.orders.create({
      amount: plan.price * 100, // paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { userId: String(req.user._id), planId: plan.id },
    });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (e) {
    res.status(500).json({ message: e.error?.description || e.message });
  }
});

app.post('/api/payment/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) return res.status(400).json({ message: 'Invalid plan' });
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expected !== razorpay_signature) return res.status(400).json({ message: 'Signature mismatch' });
    const now = new Date();
    req.user.subscription = {
      plan: plan.name,
      amount: plan.price,
      paymentId: razorpay_payment_id,
      startedAt: now,
      expiresAt: new Date(now.getTime() + plan.days * 86400000),
    };
    await req.user.save();
    res.json({ message: 'Subscription activated', user: safe(req.user) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ---------- Admin ----------
app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  res.json(await User.find().select('-password').sort('-createdAt'));
});

app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  if (String(req.user._id) === req.params.id)
    return res.status(400).json({ message: 'You cannot delete your own admin account' });
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
});

// ---------- Start ----------
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
    if (!(await User.findOne({ email }))) {
      await User.create({
        name: 'Admin',
        email,
        role: 'admin',
        password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 10),
      });
      console.log('Admin seeded:', email);
    }
    app.listen(process.env.PORT || 3000, () => console.log('API running on port', process.env.PORT || 3000));
  })
  .catch((e) => console.error('Mongo connection failed:', e.message));
