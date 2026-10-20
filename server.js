require('dotenv').config();
const express = require('express');
const multer = require('multer');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ products: [], orders: [] }, null, 2));
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, genId() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('نوع الصورة غير مدعوم'));
  }
});

app.use(express.json());
// ملفات الموقع العامة فقط (بدون كشف server.js أو db.json)
const PUBLIC_FILES = ['index.html', 'checkout.html', 'admin.html', 'style.css', 'main.js', 'cart.js'];
app.use('/uploads', express.static(UPLOADS_DIR));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/:file', (req, res, next) => {
  if (PUBLIC_FILES.includes(req.params.file)) {
    return res.sendFile(path.join(__dirname, req.params.file));
  }
  next();
});
app.use(session({
  secret: process.env.SESSION_SECRET || 'delora-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }
}));

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'غير مصرح، الرجاء تسجيل الدخول' });
}

// ---------------- AUTH ----------------
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const correctPassword = process.env.ADMIN_PASSWORD || 'delora2026';
  if (password && password === correctPassword) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/session', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// ---------------- PRODUCTS ----------------
app.get('/api/products', (req, res) => {
  const db = readDB();
  res.json(db.products);
});

app.post('/api/products', requireAdmin, upload.single('image'), (req, res) => {
  try {
    const db = readDB();
    const { name, price, category, description, stock } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'الاسم والسعر مطلوبين' });
    const product = {
      id: genId(),
      name,
      price: Number(price),
      category: category || 'أخرى',
      description: description || '',
      stock: stock === undefined || stock === 'true',
      image: req.file ? '/uploads/' + req.file.filename : null,
      createdAt: new Date().toISOString()
    };
    db.products.push(product);
    writeDB(db);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', requireAdmin, upload.single('image'), (req, res) => {
  try {
    const db = readDB();
    const p = db.products.find(x => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'المنتج غير موجود' });
    const { name, price, category, description, stock } = req.body;
    if (name) p.name = name;
    if (price) p.price = Number(price);
    if (category) p.category = category;
    if (description !== undefined) p.description = description;
    if (stock !== undefined) p.stock = stock === 'true';
    if (req.file) p.image = '/uploads/' + req.file.filename;
    writeDB(db);
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const db = readDB();
  db.products = db.products.filter(p => p.id !== req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

// ---------------- ORDERS ----------------
app.post('/api/orders', (req, res) => {
  const { customer, items, paymentMethod, notes } = req.body;
  if (!customer || !customer.name || !customer.phone || !customer.address) {
    return res.status(400).json({ error: 'الرجاء تعبئة بيانات التوصيل كاملة' });
  }
  if (!items || !items.length) return res.status(400).json({ error: 'السلة فارغة' });

  const db = readDB();
  const total = items.reduce((sum, it) => sum + Number(it.price) * Number(it.qty), 0);
  const order = {
    id: genId(),
    customer,
    items,
    total,
    paymentMethod: paymentMethod || 'cod',
    notes: notes || '',
    status: 'قيد المراجعة',
    createdAt: new Date().toISOString()
  };
  db.orders.push(order);
  writeDB(db);
  res.json(order);
});

app.get('/api/orders', requireAdmin, (req, res) => {
  const db = readDB();
  res.json(db.orders.slice().reverse());
});

app.put('/api/orders/:id/status', requireAdmin, (req, res) => {
  const db = readDB();
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  order.status = req.body.status;
  writeDB(db);
  res.json(order);
});

app.listen(PORT, () => {
  console.log(`✔ متجر ديلورا يعمل على http://localhost:${PORT}`);
});
