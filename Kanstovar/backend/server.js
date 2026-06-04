import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from './models/index.js';

const { User, Product, Order, Review, CartItem, sequelize } = db;

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'kanstovar_secret_2024';

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for images
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// =================== COMPANY DETAILS ===================
const COMPANY = {
  name: "Alif24 AI Texnologiyes",
  inn: "312821712",
  mfo: "00083",
  account: "2020 8000 7074 1275 5001",
  bank: "Kapitalbank",
  address: "Toshkent shahri, Olmazor tumani, Miskin MFY, Yangi Olmazor ko'chasi, 10-uy, 1-xonadon",
  phone: "+998 90 000 00 00",
  email: "info@kanstovar.uz"
};

// =================== DELIVERY FEE LOGIC ===================
const calcDeliveryFee = (totalSum) => {
  if (totalSum >= 2000000) return 0;
  if (totalSum >= 1000000) return 30000;
  return 50000;
};

// =================== DB INIT & SEED DATA ===================
const seedData = async () => {
  const userCount = await User.count();
  if (userCount > 0) return; // Already seeded

  console.log("Seeding initial data...");

  const seller1Id = uuidv4();
  const seller2Id = uuidv4();

  await User.bulkCreate([
    {
      id: seller1Id,
      name: 'Kanstovar Markazi',
      email: 'seller@kanstovar.uz',
      password: bcrypt.hashSync('password123', 8),
      role: 'seller',
      avatar: '🏪',
      rating: 4.9,
      totalSales: 1245,
      joinedAt: '2023-01-15',
      bio: 'Eng sifatli kanstovar mahsulotlari'
    },
    {
      id: seller2Id,
      name: 'Ofis Savdo',
      email: 'ofis@savdo.uz',
      password: bcrypt.hashSync('password123', 8),
      role: 'seller',
      avatar: '🗂️',
      rating: 4.7,
      totalSales: 893,
      joinedAt: '2023-05-10',
      bio: 'Ofis uchun barcha mahsulotlar'
    }
  ]);

  const custId = uuidv4();
  await User.create({
    id: custId,
    name: 'Abdulloh Karimov',
    email: 'user@gmail.com',
    password: bcrypt.hashSync('password123', 8),
    role: 'customer',
    avatar: '👤',
    joinedAt: '2024-01-10',
    phone: '+998 90 123 45 67',
    company: 'Karimov Savdo'
  });

  const products = [
    {
      id: uuidv4(), sellerId: seller1Id,
      name: 'Daftar A4 (96 varaq)',
      category: 'Daftarlar',
      price: 8500,
      originalPrice: 10000,
      stock: 5000,
      image: '📓',
      images: [],
      description: 'A4 formatdagi 96 varaqli chiziqli daftar. Yaxshi sifatli qog\'oz, mustahkam muqova.',
      tags: ['daftar', 'a4', 'chiziqli'],
      priceTiers: [
        { minQty: 50, maxQty: 100, price: 8500 },
        { minQty: 101, maxQty: 500, price: 8200 },
        { minQty: 501, maxQty: 1000, price: 8000 },
        { minQty: 1001, maxQty: null, price: 7800 }
      ],
      rating: 4.8, reviews: 124, sold: 3500,
      minOrder: 50
    },
    {
      id: uuidv4(), sellerId: seller1Id,
      name: 'Sharplanadigan Qalam (12 li)',
      category: 'Qalamlar',
      price: 18000,
      originalPrice: 22000,
      stock: 2000,
      image: '✏️',
      images: [],
      description: 'HB o\'lchamdagi sharplanadigan qalam to\'plami. 12 ta qalam bir qutida.',
      tags: ['qalam', 'hb', 'sharplanadigan'],
      priceTiers: [
        { minQty: 30, maxQty: 100, price: 18000 },
        { minQty: 101, maxQty: 500, price: 17500 },
        { minQty: 501, maxQty: null, price: 17000 }
      ],
      rating: 4.9, reviews: 89, sold: 1200,
      minOrder: 30
    },
    {
      id: uuidv4(), sellerId: seller1Id,
      name: 'Shayxontohur Ruchka (50 li)',
      category: 'Ruchkalar',
      price: 45000,
      originalPrice: 55000,
      stock: 3000,
      image: '🖊️',
      description: 'Ko\'k rangli ballpoint ruchka. Yengil yoziladi, uzoq xizmat qiladi. 50 ta bir qutida.',
      tags: ['ruchka', 'ballpoint', 'ko\'k'],
      rating: 4.7, reviews: 203, sold: 5600,
      minOrder: 20
    },
    {
      id: uuidv4(), sellerId: seller1Id,
      name: 'Plastik Papka A4',
      category: 'Papkalar',
      price: 12000,
      originalPrice: 15000,
      stock: 1500,
      image: '📁',
      description: 'Shaffof plastik papka A4 formatda. Hujjatlarni saqlash uchun ideal.',
      tags: ['papka', 'plastik', 'a4'],
      rating: 4.6, reviews: 67, sold: 890,
      minOrder: 20
    },
    {
      id: uuidv4(), sellerId: seller2Id,
      name: 'Flomaster To\'plami (12 rang)',
      category: 'Flomaster',
      price: 35000,
      originalPrice: 42000,
      stock: 800,
      image: '🖍️',
      description: '12 xil rangli flomaster. Bolalar va dizaynerlar uchun. Yuviluvchi.',
      tags: ['flomaster', 'rang', 'chizish'],
      rating: 4.5, reviews: 145, sold: 670,
      minOrder: 10
    },
    {
      id: uuidv4(), sellerId: seller2Id,
      name: 'Skotch (24mm × 50m)',
      category: 'Yopishqoqlar',
      price: 6500,
      originalPrice: 8000,
      stock: 3000,
      image: '📦',
      description: 'Shaffof skotch 24mm kenglikda, 50 metr uzunlikda. Yaxshi yopishish xususiyati.',
      tags: ['skotch', 'yopishqoq'],
      rating: 4.4, reviews: 93, sold: 2100,
      minOrder: 100
    },
    {
      id: uuidv4(), sellerId: seller2Id,
      name: 'Qog\'oz A4 (500 varaq)',
      category: 'Qog\'oz',
      price: 65000,
      originalPrice: 78000,
      stock: 2000,
      image: '📄',
      description: 'A4 formatlagi ofis qog\'ozi. 80 g/m². Printer va nusxa ko\'chirish uchun.',
      tags: ['qog\'oz', 'a4', 'printer'],
      rating: 4.9, reviews: 312, sold: 4500,
      minOrder: 10
    },
    {
      id: uuidv4(), sellerId: seller2Id,
      name: 'Stiker Eslatma (100 varaq)',
      category: 'Stikerlar',
      price: 9000,
      originalPrice: 12000,
      stock: 2500,
      image: '📌',
      description: 'Sariq rangli yopishqoq eslatma stikerlari. 75×75mm. 100 ta bir blokda.',
      tags: ['stiker', 'eslatma', 'post-it'],
      rating: 4.6, reviews: 78, sold: 1340,
      minOrder: 20
    },
  ];

  await Product.bulkCreate(products);
  console.log("Seed data created.");
};

sequelize.sync({ alter: true }).then(async () => {
  await seedData();
  const superadminEmail = 'superadmin@alif.uz';
  const existingAdmin = await User.findOne({ where: { email: superadminEmail } });
  if (!existingAdmin) {
    await User.create({
      id: uuidv4(),
      name: 'Super Admin',
      email: superadminEmail,
      password: bcrypt.hashSync('Rahbariyar2026_uz', 8),
      role: 'superadmin',
      avatar: '👑',
      joinedAt: new Date().toISOString().split('T')[0]
    });
    console.log('Superadmin created!');
  }
}).catch(console.error);

// =================== MIDDLEWARE ===================
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token kerak' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token noto\'g\'ri' });
  }
};

const sellerAuth = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.role !== 'seller') return res.status(403).json({ error: 'Faqat sotuvchilar uchun' });
    next();
  });
};

const superadminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Faqat superadminlar uchun' });
    next();
  });
};

// =================== UPLOAD ROUTE ===================
app.post('/api/upload', auth, upload.array('images', 3), (req, res) => {
  try {
    const urls = req.files.map(f => `/uploads/${f.filename}`);
    res.json({ urls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =================== AUTH ROUTES ===================
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role = 'customer', phone, company } = req.body;
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email band' });
    
    const user = await User.create({
      id: uuidv4(),
      name, email,
      password: bcrypt.hashSync(password, 8),
      role,
      avatar: role === 'seller' ? '🏪' : '👤',
      joinedAt: new Date().toISOString().split('T')[0],
      phone: phone || '',
      company: company || ''
    });
    
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user.toJSON();
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ error: 'Email yoki parol noto\'g\'ri' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user.toJSON();
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Topilmadi' });
    const { password: _, ...safeUser } = user.toJSON();
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Topilmadi' });
    const { password, role, id, ...allowed } = req.body;
    await user.update(allowed);
    const { password: _, ...safeUser } = user.toJSON();
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =================== PRODUCT ROUTES ===================
app.get('/api/products', async (req, res) => {
  const { category, search, sort, minPrice, maxPrice, page = 1, limit = 12 } = req.query;
  try {
    let where = {};
    if (category && category !== 'all') where.category = category;
    if (search) {
      where[sequelize.Sequelize.Op.or] = [
        { name: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { description: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }
    if (minPrice) where.price = { ...where.price, [sequelize.Sequelize.Op.gte]: Number(minPrice) };
    if (maxPrice) where.price = { ...where.price, [sequelize.Sequelize.Op.lte]: Number(maxPrice) };

    let order = [];
    if (sort === 'price_asc') order = [['price', 'ASC']];
    else if (sort === 'price_desc') order = [['price', 'DESC']];
    else if (sort === 'rating') order = [['rating', 'DESC']];
    else if (sort === 'sold') order = [['sold', 'DESC']];
    else order = [['createdAt', 'DESC']];

    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      where,
      order,
      limit: Number(limit),
      offset: Number(offset),
      include: [{ model: User, as: 'seller', attributes: ['name', 'rating'] }]
    });

    const products = rows.map(p => {
      const plain = p.toJSON();
      return { ...plain, sellerName: plain.seller?.name, sellerRating: plain.seller?.rating };
    });

    res.json({ products, total: count, pages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: User, as: 'seller', attributes: ['name', 'rating', 'bio'] },
        { model: Review, as: 'reviewsList' }
      ]
    });
    if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });
    const plain = product.toJSON();
    res.json({ ...plain, sellerName: plain.seller?.name, sellerRating: plain.seller?.rating, sellerBio: plain.seller?.bio });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', sellerAuth, async (req, res) => {
  try {
    const product = await Product.create({
      ...req.body,
      id: uuidv4(),
      sellerId: req.user.id
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', sellerAuth, async (req, res) => {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, sellerId: req.user.id } });
    if (!product) return res.status(404).json({ error: 'Topilmadi yoki ruxsat yo\'q' });
    await product.update(req.body);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', sellerAuth, async (req, res) => {
  try {
    const deleted = await Product.destroy({ where: { id: req.params.id, sellerId: req.user.id } });
    if (!deleted) return res.status(404).json({ error: 'Topilmadi yoki ruxsat yo\'q' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/seller/products', sellerAuth, async (req, res) => {
  try {
    const products = await Product.findAll({ where: { sellerId: req.user.id } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =================== CATEGORIES ===================
app.get('/api/categories', async (req, res) => {
  try {
    const cats = await Product.findAll({ attributes: ['category'], group: ['category'] });
    res.json(cats.map(c => c.category).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =================== DELIVERY FEE ===================
app.get('/api/delivery-fee', (req, res) => {
  const { amount } = req.query;
  const fee = calcDeliveryFee(Number(amount) || 0);
  res.json({ fee, amount: Number(amount), isFree: fee === 0 });
});

// =================== CART ROUTES ===================
app.get('/api/cart', auth, async (req, res) => {
  try {
    const cart = await CartItem.findAll({
      where: { userId: req.user.id },
      include: [{ model: Product, as: 'product' }]
    });
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cart', auth, async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  try {
    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });
    const minOrder = product.minOrder || 1;
    
    let item = await CartItem.findOne({ where: { userId: req.user.id, productId } });
    if (item) {
      await item.update({ quantity: item.quantity + quantity });
    } else {
      await CartItem.create({
        id: uuidv4(),
        userId: req.user.id,
        productId,
        quantity: Math.max(quantity, minOrder)
      });
    }
    res.json({ success: true, minOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/cart/:itemId', auth, async (req, res) => {
  const { quantity } = req.body;
  try {
    const item = await CartItem.findOne({ where: { id: req.params.itemId, userId: req.user.id }, include: ['product'] });
    if (!item) return res.status(404).json({ error: 'Topilmadi' });
    const minOrder = item.product?.minOrder || 1;
    if (quantity <= 0) {
      await item.destroy();
    } else {
      await item.update({ quantity: Math.max(quantity, minOrder) });
    }
    res.json({ success: true, minOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cart/:itemId', auth, async (req, res) => {
  try {
    await CartItem.destroy({ where: { id: req.params.itemId, userId: req.user.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =================== ORDER ROUTES ===================
const getPriceForQuantity = (product, quantity) => {
  if (product.priceTiers && product.priceTiers.length > 0) {
    const tier = product.priceTiers.find(t => quantity >= t.minQty && (t.maxQty === null || quantity <= t.maxQty));
    if (tier) return tier.price;
  }
  return product.price;
};

app.post('/api/orders', auth, async (req, res) => {
  try {
    const cart = await CartItem.findAll({ where: { userId: req.user.id }, include: ['product'] });
    if (!cart.length) return res.status(400).json({ error: 'Savat bo\'sh' });

    const { address, coords, paymentMethod = 'payme', phone, buyerName, buyerCompany } = req.body;

    const items = cart.map(item => ({
      productId: item.productId,
      name: item.product?.name,
      price: getPriceForQuantity(item.product, item.quantity),
      image: (item.product?.images && item.product.images[0]) || item.product?.image,
      quantity: item.quantity,
      sellerId: item.product?.sellerId,
      minOrder: item.product?.minOrder || 1
    }));

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryFee = calcDeliveryFee(subtotal);
    const total = subtotal + deliveryFee;

    const orderCount = await Order.count();
    const contractNumber = `KNS-${new Date().getFullYear()}-${String(1000 + orderCount + 1).padStart(4, '0')}`;

    const order = await Order.create({
      id: uuidv4(),
      contractNumber,
      customerId: req.user.id,
      buyerName: buyerName || (await User.findByPk(req.user.id))?.name,
      buyerCompany: buyerCompany || '',
      buyerPhone: phone || '',
      items,
      subtotal,
      deliveryFee,
      total,
      address,
      coords,
      paymentMethod,
      status: paymentMethod === 'transfer' ? 'awaiting_payment' : 'pending'
    });

    await CartItem.destroy({ where: { userId: req.user.id } });

    // Update stock & sold
    for (const item of items) {
      const prod = await Product.findByPk(item.productId);
      if (prod) {
        await prod.update({
          sold: prod.sold + item.quantity,
          stock: Math.max(0, prod.stock - item.quantity)
        });
      }
    }

    res.status(201).json({ ...order.toJSON(), company: COMPANY });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', auth, async (req, res) => {
  try {
    let orders;
    if (req.user.role === 'seller') {
      const allOrders = await Order.findAll({ order: [['createdAt', 'DESC']] });
      orders = allOrders.filter(o => o.items.some(i => i.sellerId === req.user.id))
                        .map(o => {
                          const plain = o.toJSON();
                          return { ...plain, items: plain.items.filter(i => i.sellerId === req.user.id) };
                        });
    } else {
      orders = await Order.findAll({ where: { customerId: req.user.id }, order: [['createdAt', 'DESC']] });
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', auth, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Topilmadi' });
    res.json({ ...order.toJSON(), company: COMPANY });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id/status', sellerAuth, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Topilmadi' });
    await order.update({ status: req.body.status });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders/:id/receipt', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ where: { id: req.params.id, customerId: req.user.id } });
    if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });
    const { receipt, fileName } = req.body;
    await order.update({
      transferReceipt: { data: receipt, fileName, uploadedAt: new Date().toISOString() },
      status: 'awaiting_confirmation'
    });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/company', (req, res) => {
  res.json(COMPANY);
});

// =================== REVIEW ROUTES ===================
app.post('/api/products/:id/reviews', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const user = await User.findByPk(req.user.id);
    const review = await Review.create({
      id: uuidv4(),
      productId: req.params.id,
      userId: req.user.id,
      userName: user?.name,
      rating, comment
    });
    
    // Update product rating
    const product = await Product.findByPk(req.params.id);
    if (product) {
      const reviews = await Review.findAll({ where: { productId: req.params.id } });
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await product.update({ rating: +avg.toFixed(1), reviews: reviews.length });
    }
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =================== STATS ROUTES ===================
app.get('/api/seller/stats', sellerAuth, async (req, res) => {
  try {
    const products = await Product.findAll({ where: { sellerId: req.user.id } });
    const allOrders = await Order.findAll();
    const sellerOrders = allOrders.filter(o => o.items.some(i => i.sellerId === req.user.id));
    
    const revenue = sellerOrders.reduce((sum, o) =>
      sum + o.items.filter(i => i.sellerId === req.user.id).reduce((s, i) => s + i.price * i.quantity, 0), 0);
    
    const recentOrders = sellerOrders.slice(-10).map(o => ({
      date: new Date(o.createdAt).toISOString().split('T')[0],
      amount: o.items.filter(i => i.sellerId === req.user.id).reduce((s, i) => s + i.price * i.quantity, 0),
      paymentMethod: o.paymentMethod,
      contractNumber: o.contractNumber
    }));
    
    const pendingTransfers = sellerOrders.filter(o => o.paymentMethod === 'transfer' && !o.transferReceipt).length;
    const receiptsReceived = sellerOrders.filter(o => o.paymentMethod === 'transfer' && o.transferReceipt).length;
    
    res.json({
      totalProducts: products.length,
      totalOrders: sellerOrders.length,
      totalRevenue: revenue,
      totalSold: products.reduce((s, p) => s + p.sold, 0),
      recentOrders,
      lowStock: products.filter(p => p.stock < 50).length,
      pendingTransfers,
      receiptsReceived
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =================== SUPERADMIN ROUTES ===================
app.get('/api/superadmin/stats', superadminAuth, async (req, res) => {
  try {
    const totalUsers = await User.count({ where: { role: 'customer' } });
    const totalSellers = await User.count({ where: { role: 'seller' } });
    const totalOrders = await Order.count();
    const sumOrders = await Order.sum('total') || 0;
    
    const platformCommission = sumOrders * 0.05; // 5% commission

    res.json({
      totalUsers,
      totalSellers,
      totalOrders,
      totalRevenue: sumOrders,
      platformCommission
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/superadmin/users', superadminAuth, async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] }, order: [['createdAt', 'DESC']] });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/superadmin/orders', superadminAuth, async (req, res) => {
  try {
    const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => console.log(`✅ Kanstovar Backend http://localhost:${PORT}`));
