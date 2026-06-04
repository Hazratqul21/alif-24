import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// LocalStorage helpers
const LS = {
  get: (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
};
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

// =================== HELPERS ===================
const formatSum = (n) => {
  if (!n && n !== 0) return '0';
  return Number(n).toLocaleString('uz-UZ') + ' so\'m';
};

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

const calcDelivery = (total) => {
  if (total >= 2000000) return 0;
  if (total >= 1000000) return 30000;
  return 50000;
};

const api = {
  get: async (path, token) => {
    const res = await fetch(`${API}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return res.json();
  },
  post: async (path, body, token) => {
    const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    return res.json();
  },
  put: async (path, body, token) => {
    const res = await fetch(`${API}${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    return res.json();
  },
  del: async (path, token) => {
    const res = await fetch(`${API}${path}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return res.json();
  }
};

// =================== CONTEXT ===================
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// =================== TOAST ===================
const Toast = ({ toasts, remove }) => (
  <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
    {toasts.map(t => (
      <div key={t.id} onClick={() => remove(t.id)} style={{ background: t.type === 'success' ? '#22c55e' : t.type === 'error' ? '#ef4444' : '#6c63ff', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 600, cursor: 'pointer', animation: 'slideIn 0.3s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxWidth: 320, fontSize: 14 }}>
        {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'} {t.message}
      </div>
    ))}
  </div>
);

// =================== PDF GENERATOR ===================
const generateContractPDF = (order, buyer) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Fonts & colors
  const accentColor = [79, 70, 229];
  const darkColor = [17, 24, 39];
  const grayColor = [107, 114, 128];

  // Header bar
  doc.setFillColor(...accentColor);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('KANSTOVAR.UZ', 14, 13);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Optom Savdo Platformasi', 14, 22);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('OLDI-SOTTI SHARTNOMASI', 210 - 14, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Shartnoma: ${order.contractNumber}`, 210 - 14, 19, { align: 'right' });
  doc.text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, 210 - 14, 24, { align: 'right' });

  let y = 36;

  // Parties
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(10, y, 90, 56, 3, 3, 'F');
  doc.roundedRect(110, y, 90, 56, 3, 3, 'F');

  doc.setTextColor(...accentColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1-TOMON (SOTUVCHI)', 14, y + 7);

  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const sellerLines = [
    COMPANY.name,
    `INN: ${COMPANY.inn}`,
    `Bank: ${COMPANY.bank}`,
    `MFO: ${COMPANY.mfo}`,
    `H/r: ${COMPANY.account}`,
    `Tel: ${COMPANY.phone}`,
  ];
  sellerLines.forEach((line, i) => { doc.text(line, 14, y + 14 + i * 6); });

  doc.setTextColor(...accentColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('2-TOMON (XARIDOR)', 114, y + 7);

  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const buyerLines = [
    buyer.name || 'Xaridor',
    buyer.company ? `Tashkilot: ${buyer.company}` : '',
    buyer.phone ? `Tel: ${buyer.phone}` : '',
    `Email: ${buyer.email || '—'}`,
    `Manzil: ${order.address || '—'}`,
  ].filter(Boolean);
  buyerLines.forEach((line, i) => { doc.text(line, 114, y + 14 + i * 6); });

  y += 64;

  // Subject
  doc.setFillColor(...accentColor);
  doc.rect(10, y, 190, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SHARTNOMA PREDMETI', 14, y + 5);
  y += 11;

  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Ushbu shartnoma bo\'yicha Sotuvchi Xaridorga quyidagi mahsulotlarni yetkazib berish majburiyatini oladi:', 14, y);
  y += 8;

  // Items table
  const tableRows = order.items.map((item, i) => [
    i + 1,
    item.name,
    item.quantity + ' dona',
    formatSum(item.price),
    formatSum(item.price * item.quantity)
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Mahsulot nomi', 'Miqdor', 'Birlik narxi', 'Jami']],
    body: tableRows,
    margin: { left: 10, right: 10 },
    headStyles: {
      fillColor: accentColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: { fontSize: 8.5, textColor: darkColor },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 40, halign: 'right' },
      4: { cellWidth: 40, halign: 'right' }
    },
    theme: 'striped'
  });

  y = doc.lastAutoTable.finalY + 6;

  // Totals
  doc.setFillColor(240, 240, 250);
  doc.roundedRect(120, y, 80, 30, 2, 2, 'F');

  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Mahsulotlar summasi:', 124, y + 7);
  doc.text('Yetkazib berish:', 124, y + 14);

  doc.setTextColor(...darkColor);
  doc.text(formatSum(order.subtotal || order.total - (order.deliveryFee || 0)), 197, y + 7, { align: 'right' });
  doc.text(order.deliveryFee === 0 ? 'Bepul' : formatSum(order.deliveryFee), 197, y + 14, { align: 'right' });

  doc.setFillColor(...accentColor);
  doc.roundedRect(120, y + 19, 80, 9, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('JAMI:', 124, y + 25);
  doc.text(formatSum(order.total), 197, y + 25, { align: 'right' });

  y += 42;

  // Payment details
  doc.setFillColor(255, 249, 235);
  doc.roundedRect(10, y, 190, 40, 3, 3, 'F');
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(10, y, 190, 40, 3, 3, 'S');

  doc.setTextColor(180, 120, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('🏦 TO\'LOV REKVIZITLARI', 14, y + 7);

  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const reqLines = [
    [`Bank: ${COMPANY.bank}`, `MFO: ${COMPANY.mfo}`],
    [`Hisob raqam: ${COMPANY.account}`, `INN: ${COMPANY.inn}`],
    [`To'lov maqsadi: ${order.contractNumber} shartnoma bo'yicha to'lov`, ''],
    [`Kompaniya: ${COMPANY.name}`, ''],
  ];
  reqLines.forEach(([left, right], i) => {
    doc.text(left, 14, y + 14 + i * 6.5);
    if (right) doc.text(right, 120, y + 14 + i * 6.5);
  });

  y += 48;

  // Terms
  if (y < 230) {
    doc.setFillColor(240, 250, 244);
    doc.roundedRect(10, y, 190, 22, 3, 3, 'F');
    doc.setTextColor(22, 101, 52);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('SHARTLAR', 14, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text('• To\'lov amalga oshirilgandan so\'ng 3 ish kuni ichida yetkazib beriladi.', 14, y + 13);
    doc.text('• To\'lov cheki va imzolangan shartnomani platformaga yuklash shart.', 14, y + 19);
    y += 28;
  }

  // Signatures
  if (y < 240) {
    doc.setFillColor(248, 248, 255);
    doc.roundedRect(10, y, 86, 32, 3, 3, 'F');
    doc.roundedRect(114, y, 86, 32, 3, 3, 'F');

    doc.setTextColor(...accentColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('SOTUVCHI IMZOSI:', 14, y + 7);
    doc.text('XARIDOR IMZOSI:', 118, y + 7);

    doc.setDrawColor(...grayColor);
    doc.line(14, y + 22, 90, y + 22);
    doc.line(118, y + 22, 194, y + 22);

    doc.setTextColor(...grayColor);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(COMPANY.name, 14, y + 28);
    doc.text(buyer.name || 'Xaridor', 118, y + 28);
  }

  // Footer
  doc.setFillColor(245, 245, 250);
  doc.rect(0, 282, 210, 15, 'F');
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${COMPANY.name} | ${COMPANY.phone} | ${COMPANY.email}`, 105, 290, { align: 'center' });
  doc.text(`Manzil: ${COMPANY.address}`, 105, 295, { align: 'center' });

  doc.save(`shartnoma-${order.contractNumber}.pdf`);
};

// =================== MAIN APP ===================
export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [page, setPage] = useState('home');
  const [cartCount, setCartCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const removeToast = (id) => setToasts(t => t.filter(x => x.id !== id));

  useEffect(() => {
    if (token) {
      api.get('/api/auth/me', token).then(u => {
        if (!u.error) setUser(u);
        else { localStorage.removeItem('token'); setToken(null); }
      });
    }
  }, [token]);

  const refreshCart = useCallback(async () => {
    if (token) {
      const cart = await api.get('/api/cart', token);
      setCartCount(Array.isArray(cart) ? cart.reduce((s, i) => s + i.quantity, 0) : 0);
    }
  }, [token]);

  useEffect(() => { refreshCart(); }, [refreshCart]);

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    if (data.error) { toast(data.error, 'error'); return false; }
    if (data.user.role === 'seller') { toast('Sotuvchi panelini ishlating!', 'error'); return false; }
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    toast(`Xush kelibsiz, ${data.user.name}!`);
    setPage('home');
    return true;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setCartCount(0);
    setPage('home');
    toast('Chiqib ketdingiz');
  };

  const addToCart = async (productId, quantity) => {
    if (!token) { toast('Avval tizimga kiring', 'error'); setPage('login'); return; }
    const result = await api.post('/api/cart', { productId, quantity: quantity || 1 }, token);
    refreshCart();
    toast(`Savatga qo'shildi! 🛒`);
    return result;
  };

  const ctx = { user, token, page, setPage, cartCount, refreshCart, login, logout, addToCart, toast, selectedProduct, setSelectedProduct };

  return (
    <AppCtx.Provider value={ctx}>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Header />
        <main>
          {page === 'home' && <HomePage />}
          {page === 'products' && <ProductsPage />}
          {page === 'product' && <ProductDetailPage />}
          {page === 'cart' && <CartPage />}
          {page === 'orders' && <OrdersPage />}
          {page === 'login' && <AuthPage mode="login" />}
          {page === 'register' && <AuthPage mode="register" />}
          {page === 'profile' && <ProfilePage />}
        </main>
        <Toast toasts={toasts} remove={removeToast} />
      </div>
    </AppCtx.Provider>
  );
}

// =================== HEADER ===================
function Header() {
  const { user, page, setPage, cartCount, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', height: 64, gap: 24 }}>
        <div onClick={() => setPage('home')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 26 }}>📦</span>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, background: 'linear-gradient(135deg, #6c63ff, #ff6584)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>KANSTOVAR</span>
        </div>
        <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
          {[['home', '🏠 Bosh sahifa'], ['products', '🏪 Katalog']].map(([p, label]) => (
            <button key={p} onClick={() => setPage(p)} style={{ background: page === p ? 'var(--surface2)' : 'transparent', color: page === p ? 'var(--accent)' : 'var(--text2)', padding: '8px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500, transition: 'all 0.2s', border: page === p ? '1px solid var(--border)' : '1px solid transparent' }}>{label}</button>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setPage('cart')} style={{ position: 'relative', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 16px', borderRadius: 12, fontSize: 16, transition: 'all 0.2s' }}>
            🛒 {cartCount > 0 && <span style={{ position: 'absolute', top: -6, right: -6, background: 'var(--accent2)', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{cartCount}</span>}
          </button>
          {user ? (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'linear-gradient(135deg, var(--accent), #9b59b6)', border: 'none', color: 'white', padding: '10px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{user.avatar}</span> {user.name.split(' ')[0]} ▾
              </button>
              {menuOpen && (
                <div style={{ position: 'absolute', top: '110%', right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', minWidth: 180, boxShadow: 'var(--shadow)' }}>
                  {[['profile', '👤 Profil'], ['orders', '📦 Buyurtmalar']].map(([p, label]) => (
                    <button key={p} onClick={() => { setPage(p); setMenuOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 20px', background: 'none', color: 'var(--text)', fontSize: 14, transition: 'background 0.2s' }} onMouseEnter={e => e.target.style.background = 'var(--surface2)'} onMouseLeave={e => e.target.style.background = 'none'}>{label}</button>
                  ))}
                  <div style={{ height: 1, background: 'var(--border)' }} />
                  <button onClick={() => { logout(); setMenuOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 20px', background: 'none', color: 'var(--accent2)', fontSize: 14 }}>🚪 Chiqish</button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage('login')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', padding: '10px 18px', borderRadius: 12, fontSize: 14, fontWeight: 500 }}>Kirish</button>
              <button onClick={() => setPage('register')} style={{ background: 'linear-gradient(135deg, var(--accent), #9b59b6)', border: 'none', color: 'white', padding: '10px 18px', borderRadius: 12, fontSize: 14, fontWeight: 600 }}>Ro'yxatdan o'tish</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// =================== HOME PAGE ===================
function HomePage() {
  const { setPage, addToCart, setSelectedProduct } = useApp();
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/products?sort=rating&limit=8').then(data => {
      setFeatured(data.products || []);
      setLoading(false);
    });
  }, []);

  const categories = [
    ['📓', 'Daftarlar', '#6c63ff'],
    ['✏️', 'Qalamlar', '#ff6584'],
    ['📄', 'Qog\'oz', '#43e97b'],
    ['📁', 'Papkalar', '#f7b731'],
    ['🖍️', 'Flomaster', '#e056fd'],
    ['📌', 'Stikerlar', '#00d2d3']
  ];

  return (
    <div>
      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0a0a12 0%, #12082a 50%, #0a1212 100%)', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(108,99,255,0.18) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,101,132,0.12) 0%, transparent 50%)' }} />
        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', padding: '6px 18px', borderRadius: 30, fontSize: 13, color: '#a89bff', marginBottom: 28, fontWeight: 500 }}>
            📦 Optom kanstovar mahsulotlari
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 66px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 20, background: 'linear-gradient(135deg, #ffffff 0%, #a89bff 50%, #ff8fa3 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Kanstovar Optom Savdosi
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text2)', marginBottom: 36, lineHeight: 1.7 }}>
            Daftar, qalam, qog'oz va boshqa kanstovar mahsulotlarini<br />optom narxlarda xarid qiling. Toshkent bo'yicha yetkazib berish.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
            <button onClick={() => setPage('products')} style={{ background: 'linear-gradient(135deg, var(--accent), #9b59b6)', border: 'none', color: 'white', padding: '16px 36px', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 30px rgba(108,99,255,0.4)', transition: 'transform 0.2s' }} onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.target.style.transform = 'translateY(0)'}>Katalogni ko'rish →</button>
            <button onClick={() => setPage('register')} style={{ background: 'transparent', border: '2px solid rgba(255,255,255,0.2)', color: 'white', padding: '16px 36px', borderRadius: 14, fontSize: 16, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Ro'yxatdan o'tish</button>
          </div>

          {/* Delivery info */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            {[
              ['🚚', '0–999,999 so\'m', '50,000 so\'m yetkazish'],
              ['🏎️', '1,000,000–1,999,999 so\'m', '30,000 so\'m yetkazish'],
              ['🎁', '2,000,000+ so\'m', 'BEPUL yetkazish']
            ].map(([icon, range, label]) => (
              <div key={range} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 20px', textAlign: 'center', minWidth: 160 }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 11, color: '#a89bff', fontWeight: 600, marginBottom: 2 }}>{range}</div>
                <div style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 48 }}>
          {[['1000+', 'Mahsulot'], ['50+', 'Sotuvchi'], ['500+', 'Mijoz'], ['3 kun', 'Yetkazib berish']].map(([n, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)' }}>{n}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px' }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 20 }}>Kategoriyalar</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
          {categories.map(([icon, cat, color]) => (
            <div key={cat} onClick={() => setPage('products')} style={{ background: 'var(--surface)', border: `1px solid ${color}33`, borderRadius: 16, padding: '22px 16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', color }} onMouseEnter={e => { e.currentTarget.style.background = `${color}15`; e.currentTarget.style.transform = 'translateY(-4px)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{cat}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Products */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700 }}>🔥 Mashhur Mahsulotlar</h2>
          <button onClick={() => setPage('products')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', padding: '10px 20px', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>Barchasini ko'rish →</button>
        </div>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 320, borderRadius: 16 }} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {featured.map(p => <ProductCard key={p.id} product={p} onView={() => { setSelectedProduct(p); setPage('product'); }} onAdd={() => addToCart(p.id, p.minOrder || 1)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// =================== PRODUCT CARD ===================
function ProductCard({ product: p, onView, onAdd }) {
  const discount = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  return (
    <div className="fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', transition: 'all 0.3s', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)'; e.currentTarget.style.borderColor = 'var(--accent)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
      <div onClick={onView} style={{ background: 'linear-gradient(135deg, var(--surface2), var(--bg))', padding: '32px', textAlign: 'center', fontSize: 64, position: 'relative' }}>
        {p.image}
        {discount > 0 && <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--accent2)', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>-{discount}%</div>}
      </div>
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: 8 }}>
          <h3 onClick={onView} style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>{p.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 20 }}>{p.category}</span>
            <span style={{ fontSize: 11, color: '#f7b731' }}>⭐ {p.rating}</span>
          </div>
        </div>
        {/* Min order badge */}
        <div style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 8, padding: '5px 10px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12 }}>📦</span>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Minimal buyurtma: {p.minOrder || 1} dona</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent)' }}>{formatSum(p.price)}</div>
            {discount > 0 && <div style={{ fontSize: 12, color: 'var(--text2)', textDecoration: 'line-through' }}>{formatSum(p.originalPrice)}</div>}
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>1 dona narxi</div>
          </div>
          <button onClick={onAdd} style={{ background: 'linear-gradient(135deg, var(--accent), #9b59b6)', border: 'none', color: 'white', padding: '10px 16px', borderRadius: 12, fontSize: 16, fontWeight: 700, transition: 'all 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.target.style.transform = 'scale(1.1)'} onMouseLeave={e => e.target.style.transform = 'scale(1)'}>+</button>
        </div>
        {p.stock < 100 && p.stock > 0 && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent4)', fontWeight: 500 }}>⚠️ Faqat {p.stock} ta qoldi!</div>}
      </div>
    </div>
  );
}

// =================== PRODUCTS PAGE ===================
function ProductsPage() {
  const { addToCart, setSelectedProduct, setPage } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('rating');
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api.get('/api/categories').then(data => setCategories(Array.isArray(data) ? data : []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ sort, limit: 20 });
    if (search) params.set('search', search);
    if (category !== 'all') params.set('category', category);
    const data = await api.get(`/api/products?${params}`);
    setProducts(data.products || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [search, category, sort]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 6 }}>🏪 Katalog</h1>
        <p style={{ color: 'var(--text2)' }}>{total} ta mahsulot</p>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Mahsulot qidirish..." style={{ flex: 1, minWidth: 200, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px 18px', borderRadius: 12, fontSize: 14, outline: 'none' }} />
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px 18px', borderRadius: 12, fontSize: 14, outline: 'none', cursor: 'pointer' }}>
          <option value="all">Barcha kategoriyalar</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px 18px', borderRadius: 12, fontSize: 14, outline: 'none', cursor: 'pointer' }}>
          <option value="rating">⭐ Reyting bo'yicha</option>
          <option value="sold">🔥 Ko'p sotilgan</option>
          <option value="price_asc">💰 Arzondan qimmata</option>
          <option value="price_desc">💎 Qimmatdan arzonga</option>
        </select>
      </div>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 340, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {products.map(p => <ProductCard key={p.id} product={p} onView={() => { setSelectedProduct(p); setPage('product'); }} onAdd={() => addToCart(p.id, p.minOrder || 1)} />)}
        </div>
      )}
      {!loading && products.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text2)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
          <h3 style={{ fontSize: 22, marginBottom: 8 }}>Mahsulot topilmadi</h3>
        </div>
      )}
    </div>
  );
}

// =================== PRODUCT DETAIL ===================
function ProductDetailPage() {
  const { selectedProduct, addToCart, token, toast } = useApp();
  const [product, setProduct] = useState(selectedProduct);
  const [qty, setQty] = useState(selectedProduct?.minOrder || 1);
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
      api.get(`/api/products/${selectedProduct.id}`).then(p => {
        setProduct(p);
        setQty(p.minOrder || 1);
      });
    }
  }, [selectedProduct]);

  if (!product) return <div style={{ textAlign: 'center', padding: 80 }}>Yuklanmoqda...</div>;

  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const minOrder = product.minOrder || 1;

  const submitReview = async () => {
    if (!token) { toast('Avval tizimga kiring', 'error'); return; }
    setSubmitting(true);
    await api.post(`/api/products/${product.id}/reviews`, review, token);
    const updated = await api.get(`/api/products/${product.id}`);
    setProduct(updated);
    setReview({ rating: 5, comment: '' });
    toast('Sharh qo\'shildi!');
    setSubmitting(false);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--surface), var(--surface2))', borderRadius: 24, padding: '64px', textAlign: 'center', fontSize: 110, border: '1px solid var(--border)' }}>{product.image}</div>
        <div>
          <div style={{ background: 'var(--surface2)', display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>{product.category}</div>
          <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 12, lineHeight: 1.2 }}>{product.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{ color: '#f7b731', fontSize: 16 }}>{'⭐'.repeat(Math.round(product.rating))}</span>
            <span style={{ fontWeight: 700 }}>{product.rating}</span>
            <span style={{ color: 'var(--text2)', fontSize: 14 }}>({product.reviews} ta sharh)</span>
            <span style={{ color: 'var(--text2)', fontSize: 14 }}>• {product.sold} ta sotilgan</span>
          </div>

          {/* Min order highlight */}
          <div style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(108,99,255,0.05))', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>📦</span>
              <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>Minimal buyurtma: {minOrder} dona</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Kamida {minOrder} dona buyurtma berishingiz kerak</div>
          </div>

          <p style={{ color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20, fontSize: 15 }}>{product.description}</p>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>Sotuvchi</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{product.sellerName}</div>
            {product.sellerBio && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{product.sellerBio}</div>}
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: 'var(--accent)' }}>{formatSum(product.price)}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>1 dona narxi</div>
            {discount > 0 && <><span style={{ fontSize: 16, color: 'var(--text2)', textDecoration: 'line-through', marginRight: 8 }}>{formatSum(product.originalPrice)}</span><span style={{ background: 'var(--accent2)', color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>-{discount}%</span></>}
          </div>
          {qty >= minOrder && (
            <div style={{ background: 'rgba(67,233,123,0.08)', border: '1px solid rgba(67,233,123,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--accent3)' }}>
              💰 Jami narx: <strong>{formatSum(product.price * qty)}</strong>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <button onClick={() => setQty(q => Math.max(minOrder, q - 1))} style={{ background: 'none', color: 'var(--text)', width: 44, height: 48, fontSize: 20, cursor: 'pointer' }}>−</button>
              <span style={{ width: 52, textAlign: 'center', fontSize: 17, fontWeight: 700 }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} style={{ background: 'none', color: 'var(--text)', width: 44, height: 48, fontSize: 20, cursor: 'pointer' }}>+</button>
            </div>
            <button onClick={() => addToCart(product.id, qty)} disabled={product.stock === 0} style={{ flex: 1, background: product.stock === 0 ? 'var(--surface2)' : 'linear-gradient(135deg, var(--accent), #9b59b6)', border: 'none', color: product.stock === 0 ? 'var(--text2)' : 'white', padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: product.stock === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
              {product.stock === 0 ? '❌ Tugagan' : `🛒 Savatga qo'shish (${qty} dona)`}
            </button>
          </div>
          {qty < minOrder && <div style={{ fontSize: 12, color: 'var(--accent2)' }}>⚠️ Kamida {minOrder} dona tanlashingiz kerak</div>}
          {product.stock > 0 && product.stock < 100 && <div style={{ fontSize: 13, color: 'var(--accent4)', fontWeight: 500 }}>⚠️ Faqat {product.stock} ta qoldi!</div>}
        </div>
      </div>

      {/* Reviews */}
      <div style={{ marginTop: 60 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 20 }}>💬 Sharhlar</h2>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Sharh yozish</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setReview(r => ({ ...r, rating: n }))} style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', opacity: review.rating >= n ? 1 : 0.3, transition: 'opacity 0.2s' }}>⭐</button>
            ))}
          </div>
          <textarea value={review.comment} onChange={e => setReview(r => ({ ...r, comment: e.target.value }))} placeholder="Mahsulot haqida fikringizni yozing..." style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px 16px', borderRadius: 12, fontSize: 14, resize: 'vertical', minHeight: 90, outline: 'none', marginBottom: 12 }} />
          <button onClick={submitReview} disabled={submitting || !review.comment} style={{ background: 'linear-gradient(135deg, var(--accent), #9b59b6)', border: 'none', color: 'white', padding: '12px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: submitting || !review.comment ? 0.6 : 1 }}>Yuborish</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(product.reviewsList || []).map(r => (
            <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700 }}>{r.userName}</span>
                <span style={{ color: '#f7b731' }}>{'⭐'.repeat(r.rating)}</span>
              </div>
              <p style={{ color: 'var(--text2)', fontSize: 14 }}>{r.comment}</p>
              <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4 }}>{new Date(r.createdAt).toLocaleDateString('uz-UZ')}</p>
            </div>
          ))}
          {(!product.reviewsList || product.reviewsList.length === 0) && (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text2)' }}>Hali sharh yo'q. Birinchi bo'ling!</div>
          )}
        </div>
      </div>
    </div>
  );
}

// =================== MAP MODAL ===================
const TASHKENT_DISTRICTS = ["Chilonzor", "Yunusobod", "Mirobod", "Mirzo Ulug'bek", "Yashnobod", "Yakkasaroy", "Uchtepa", "Olmazor", "Shayxontohur", "Sergeli", "Bektemir", "Yangihayot"];

function MapModal({ onClose, onSelect, initialAddress }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [district, setDistrict] = useState(initialAddress || '');
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Toshkent default center
  const TASHKENT = [41.2995, 69.2401];

  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView(TASHKENT, 12);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(map);

    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      await resolveLocation(lat, lng);
    });

    return () => { map.remove(); mapInstanceRef.current = null; };
  // eslint-disable-next-line
  }, []);

  const placeMarker = (lat, lng) => {
    if (!mapInstanceRef.current) return;
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);
    mapInstanceRef.current.setView([lat, lng], 14);
  };

  const resolveLocation = async (lat, lng) => {
    placeMarker(lat, lng);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=uz`);
      const data = await res.json();
      const addr = data.display_name || '';
      
      // Check if it's in Tashkent
      if (!addr.toLowerCase().includes('toshkent')) {
        alert('Faqat Toshkent shahridan manzil tanlashingiz mumkin!');
        return;
      }

      // Find matching district
      const matched = TASHKENT_DISTRICTS.find(d => addr.toLowerCase().includes(d.toLowerCase()));
      if (matched) {
        setDistrict(matched);
        setSelectedCoords({ lat, lng });
      } else {
        alert('Toshkent shahri tumanini aniqlab bo\'lmadi. Iltimos tuman markaziga yaqinroq joy tanlang.');
      }
    } catch {
      alert('Manzilni aniqlashda xatolik yuz berdi.');
    }
  };

  const doGPS = () => {
    if (!navigator.geolocation) {
      alert('Brauzeringiz GPS ni qollab-quvvatlamaydi');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await resolveLocation(pos.coords.latitude, pos.coords.longitude);
        setGpsLoading(false);
      },
      (err) => {
        alert('Joylashuvni aniqlab bo\'lmadi: ' + err.message);
        setGpsLoading(false);
      }
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} onClick={onClose} />
      <div style={{ position: 'relative', margin: 'auto', width: '90%', maxWidth: 720, background: 'var(--surface)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 22 }}>🗺️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Manzilni belgilang (Faqat Toshkent)</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Xaritaga bosing yoki GPS dan foydalaning</div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface2)', border: 'none', color: 'var(--text)', width: 34, height: 34, borderRadius: 10, fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <select
            value={district}
            onChange={e => setDistrict(e.target.value)}
            style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 14px', borderRadius: 10, fontSize: 13, outline: 'none', cursor: 'pointer' }}
          >
            <option value="">Tuman tanlang</option>
            {TASHKENT_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button
            onClick={doGPS}
            disabled={gpsLoading}
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', color: 'white', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {gpsLoading ? '⏳' : '📍 GPS orqali topish'}
          </button>
        </div>

        <div ref={mapRef} style={{ flex: 1, minHeight: 380 }} />

        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          {district ? (
            <div style={{ marginBottom: 10, background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--text2)' }}>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>📍 Tanlangan tuman:</span> {district}
            </div>
          ) : (
            <div style={{ marginBottom: 10, fontSize: 13, color: 'var(--text2)', textAlign: 'center' }}>Xaritaga bosib manzil belgilang yoki tumanni tanlang</div>
          )}
          <button
            onClick={() => onSelect(district, selectedCoords)}
            disabled={!district}
            style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent), #9b59b6)', border: 'none', color: 'white', padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (!district) ? 0.5 : 1 }}
          >
            ✅ Manzilni tasdiqlash
          </button>
        </div>
      </div>
    </div>
  );
}

// =================== CART PAGE ===================
function CartPage() {
  const { token, toast, setPage, refreshCart, user } = useApp();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState(() => LS.get('kanstovar_address') || '');
  const [coords, setCoords] = useState(null);
  const [showMap, setShowMap] = useState(false);
  // Phone saved in localStorage
  const [phone, setPhone] = useState(() => LS.get('kanstovar_phone') || user?.phone || '');
  // First + last name separate
  const [firstName, setFirstName] = useState(() => LS.get('kanstovar_firstName') || '');
  const [lastName, setLastName] = useState(() => LS.get('kanstovar_lastName') || '');
  const [buyerCompany, setBuyerCompany] = useState(() => LS.get('kanstovar_company') || user?.company || '');
  const [paymentMethod, setPaymentMethod] = useState('payme');
  const [ordering, setOrdering] = useState(false);
  const [minOrderErrors, setMinOrderErrors] = useState([]);
  const [lastOrder, setLastOrder] = useState(null);
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const fileInputRef = useRef();

  const buyerName = `${firstName} ${lastName}`.trim();

  // Save phone & name to localStorage on change
  const handlePhone = (v) => { setPhone(v); LS.set('kanstovar_phone', v); };
  const handleFirstName = (v) => { setFirstName(v); LS.set('kanstovar_firstName', v); };
  const handleLastName = (v) => { setLastName(v); LS.set('kanstovar_lastName', v); };
  const handleCompany = (v) => { setBuyerCompany(v); LS.set('kanstovar_company', v); };
  const handleAddress = (v) => { setAddress(v); LS.set('kanstovar_address', v); };

  const loadCart = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    const data = await api.get('/api/cart', token);
    setCart(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [token]);

  useEffect(() => { loadCart(); }, [loadCart]);
  // Pre-fill from user profile if localStorage is empty
  useEffect(() => {
    if (user) {
      if (!phone && user.phone) handlePhone(user.phone);
      if (!firstName && user.name) {
        const parts = user.name.split(' ');
        handleFirstName(parts[0] || '');
        handleLastName(parts.slice(1).join(' ') || '');
      }
      if (!buyerCompany && user.company) handleCompany(user.company);
    }
  // eslint-disable-next-line
  }, [user]);

  const updateQty = async (itemId, qty, minOrder) => {
    const finalQty = Math.max(qty, minOrder || 1);
    await api.put(`/api/cart/${itemId}`, { quantity: finalQty }, token);
    loadCart(); refreshCart();
  };

  const removeItem = async (itemId) => {
    await api.del(`/api/cart/${itemId}`, token);
    loadCart(); refreshCart();
  };

  const subtotal = cart.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0);
  const deliveryFee = calcDelivery(subtotal);
  const totalAmount = subtotal + deliveryFee;

  // Validate min orders
  const validateMinOrders = () => {
    const errors = cart.filter(item => {
      const min = item.product?.minOrder || 1;
      return item.quantity < min;
    });
    setMinOrderErrors(errors.map(e => e.id));
    return errors.length === 0;
  };

  const placeOrder = async () => {
    if (!validateMinOrders()) { toast('Minimal buyurtma miqdorini tekshiring', 'error'); return; }
    if (!firstName.trim()) { toast('Ismingizni kiriting', 'error'); return; }
    if (!lastName.trim()) { toast('Familiyangizni kiriting', 'error'); return; }
    if (!phone.trim()) { toast('Telefon raqamni kiriting', 'error'); return; }
    if (!address.trim()) { toast('Manzilni kiriting yoki xaritada belgilang', 'error'); return; }
    setOrdering(true);
    const data = await api.post('/api/orders', {
      address, coords, paymentMethod, phone, buyerName, buyerCompany
    }, token);
    if (data.error) { toast(data.error, 'error'); setOrdering(false); return; }

    setLastOrder(data);

    if (paymentMethod === 'transfer') {
      generateContractPDF(data, { name: buyerName, company: buyerCompany, phone, email: user?.email });
      toast('Shartnoma yuklab olindi! Imzolab, chekni yuboring 📋', 'success');
      setShowReceiptUpload(true);
    } else {
      toast('To\'lov tizimiga yo\'naltirilmoqda... 💳', 'info');
      setTimeout(() => {
        toast(`Buyurtma qabul qilindi! 3 kun ichida yetkazib beriladi 🎉`);
        loadCart(); refreshCart();
        setOrdering(false);
        setPage('orders');
      }, 2000);
      return;
    }

    loadCart(); refreshCart();
    setOrdering(false);
  };

  const uploadReceipt = async () => {
    if (!receiptFile || !lastOrder) return;
    setUploadingReceipt(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      const res = await api.post(`/api/orders/${lastOrder.id}/receipt`, {
        receipt: base64,
        fileName: receiptFile.name
      }, token);
      if (res.success) {
        toast('Chek muvaffaqiyatli yuklandi! Tez orada siz bilan bog\'lanamiz 🎉');
        setShowReceiptUpload(false);
        setLastOrder(null);
        setPage('orders');
      } else {
        toast('Xatolik yuz berdi', 'error');
      }
      setUploadingReceipt(false);
    };
    reader.readAsDataURL(receiptFile);
  };

  if (!token) return (
    <div style={{ textAlign: 'center', padding: '100px 24px' }}>
      <div style={{ fontSize: 80, marginBottom: 20 }}>🛒</div>
      <h2 style={{ fontSize: 26, marginBottom: 12 }}>Savatni ko'rish uchun kiring</h2>
      <button onClick={() => setPage('login')} style={{ background: 'linear-gradient(135deg, var(--accent), #9b59b6)', border: 'none', color: 'white', padding: '14px 32px', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Kirish</button>
    </div>
  );

  // Receipt upload screen
  if (showReceiptUpload && lastOrder) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Shartnoma yuklab olindi!</h2>
          <div style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 14, padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>📋 {lastOrder.contractNumber}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
              1. Shartnomani yuklab oling (avtomatik yuklab olindi)<br />
              2. Shartnomani imzolang<br />
              3. Quyidagi rekvizitlarga pul o'tkazing:<br />
            </div>
          </div>

          {/* Requisites */}
          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 14, padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: '#d97706', marginBottom: 10, fontSize: 14 }}>🏦 TO'LOV REKVIZITLARI</div>
            {[
              ['Kompaniya', lastOrder.company?.name || COMPANY.name],
              ['Bank', lastOrder.company?.bank || COMPANY.bank],
              ['Hisob raqam', lastOrder.company?.account || COMPANY.account],
              ['MFO', lastOrder.company?.mfo || COMPANY.mfo],
              ['INN', lastOrder.company?.inn || COMPANY.inn],
              ['To\'lov maqsadi', `${lastOrder.contractNumber} shartnoma bo'yicha`],
              ['Summa', formatSum(lastOrder.total)]
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(251,191,36,0.1)', fontSize: 13 }}>
                <span style={{ color: 'var(--text2)', minWidth: 100 }}>{k}:</span>
                <span style={{ fontWeight: 600, textAlign: 'right', flex: 1, marginLeft: 12 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 15 }}>📎 To'lov chekini yuklang</div>
            <div
              style={{ border: '2px dashed var(--border)', borderRadius: 14, padding: '32px 20px', cursor: 'pointer', transition: 'all 0.2s', background: receiptFile ? 'rgba(67,233,123,0.05)' : 'var(--surface2)' }}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              {receiptFile ? (
                <>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                  <div style={{ fontWeight: 600, color: 'var(--accent3)' }}>{receiptFile.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{(receiptFile.size / 1024).toFixed(0)} KB</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
                  <div style={{ fontWeight: 600, color: 'var(--text2)' }}>Fayl tanlash uchun bosing</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>JPG, PNG yoki PDF (max 5MB)</div>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setReceiptFile(e.target.files[0])} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => generateContractPDF(lastOrder, { name: buyerName, company: buyerCompany, phone, email: user?.email })}
              style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              📥 Shartnomani qayta yuklab olish
            </button>
            <button
              onClick={uploadReceipt}
              disabled={!receiptFile || uploadingReceipt}
              style={{ flex: 1, background: receiptFile ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'var(--surface2)', border: 'none', color: receiptFile ? 'white' : 'var(--text2)', padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: receiptFile ? 'pointer' : 'not-allowed', opacity: uploadingReceipt ? 0.7 : 1 }}
            >
              {uploadingReceipt ? '⏳ Yuklanmoqda...' : '📤 Chekni yuborish'}
            </button>
          </div>
          <button onClick={() => { setShowReceiptUpload(false); setPage('orders'); }} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text2)', marginTop: 14, fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}>
            Keyinroq yuklash
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 28 }}>🛒 Savat</h1>
      {loading ? <div className="skeleton" style={{ height: 200, borderRadius: 16 }} /> :
        cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🛒</div>
            <h3 style={{ fontSize: 22, marginBottom: 8 }}>Savat bo'sh</h3>
            <button onClick={() => setPage('products')} style={{ background: 'linear-gradient(135deg, var(--accent), #9b59b6)', border: 'none', color: 'white', padding: '14px 32px', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 16 }}>Xarid qilish</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
            {/* Cart items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cart.map(item => {
                const minOrder = item.product?.minOrder || 1;
                const hasError = minOrderErrors.includes(item.id);
                return (
                  <div key={item.id} style={{ background: 'var(--surface)', border: `1px solid ${hasError ? 'var(--accent2)' : 'var(--border)'}`, borderRadius: 16, padding: 18, display: 'flex', gap: 16, alignItems: 'center', transition: 'border-color 0.2s' }}>
                    <div style={{ fontSize: 44, width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)', borderRadius: 12, flexShrink: 0 }}>{item.product?.image}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product?.name}</h4>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>{formatSum(item.product?.price)}<span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 400, marginLeft: 4 }}>/ dona</span></div>
                      {minOrder > 1 && <div style={{ fontSize: 11, color: hasError ? 'var(--accent2)' : 'var(--text2)', marginTop: 2 }}>📦 Min: {minOrder} dona</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                        <button onClick={() => updateQty(item.id, item.quantity - 1, minOrder)} style={{ background: 'none', color: 'var(--text)', width: 36, height: 36, fontSize: 17, cursor: 'pointer' }}>−</button>
                        <span style={{ width: 40, textAlign: 'center', fontWeight: 700, fontSize: 14 }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1, minOrder)} style={{ background: 'none', color: 'var(--text)', width: 36, height: 36, fontSize: 17, cursor: 'pointer' }}>+</button>
                      </div>
                      <button onClick={() => removeItem(item.id)} style={{ background: 'rgba(255,101,132,0.15)', border: '1px solid rgba(255,101,132,0.3)', color: 'var(--accent2)', width: 36, height: 36, borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>✕</button>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, minWidth: 120, textAlign: 'right', flexShrink: 0 }}>{formatSum(item.product?.price * item.quantity)}</div>
                  </div>
                );
              })}
            </div>

            {/* Order summary */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, position: 'sticky', top: 80 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Buyurtma</h3>

              {/* Delivery fee info */}
              <div style={{ background: deliveryFee === 0 ? 'rgba(67,233,123,0.08)' : 'rgba(247,183,49,0.08)', border: `1px solid ${deliveryFee === 0 ? 'rgba(67,233,123,0.2)' : 'rgba(247,183,49,0.2)'}`, borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
                {deliveryFee === 0 ? (
                  <div style={{ color: 'var(--accent3)', fontWeight: 600 }}>🎁 Yetkazib berish bepul!</div>
                ) : deliveryFee === 30000 ? (
                  <>
                    <div style={{ color: '#d97706', fontWeight: 600 }}>🏎️ Yetkazib berish: {formatSum(30000)}</div>
                    <div style={{ color: 'var(--text2)', marginTop: 4 }}>{formatSum(2000000 - subtotal)} ga yetsa — bepul!</div>
                  </>
                ) : (
                  <>
                    <div style={{ color: '#d97706', fontWeight: 600 }}>🚚 Yetkazib berish: {formatSum(50000)}</div>
                    <div style={{ color: 'var(--text2)', marginTop: 4 }}>{formatSum(1000000 - subtotal)} dan ortsa — 30,000 so'm</div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, color: 'var(--text2)', fontSize: 14 }}><span>Mahsulotlar</span><span>{formatSum(subtotal)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, color: 'var(--text2)', fontSize: 14 }}>
                <span>Yetkazib berish</span>
                <span style={{ color: deliveryFee === 0 ? 'var(--accent3)' : 'var(--text)' }}>{deliveryFee === 0 ? 'Bepul' : formatSum(deliveryFee)}</span>
              </div>
              <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontWeight: 700, fontSize: 17 }}>Jami</span>
                <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--accent)' }}>{formatSum(totalAmount)}</span>
              </div>

              {/* Buyer info */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>👤</span> Xaridor ma'lumotlari
                  {phone && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent3)', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 20 }}>✓ Saqlangan</span>}
                </div>

                {/* Ism va Familiya — 2 ustun */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input
                    value={firstName}
                    onChange={e => handleFirstName(e.target.value)}
                    placeholder="👤 Ism *"
                    style={{ background: 'var(--surface2)', border: `1px solid ${!firstName ? 'var(--border)' : 'rgba(34,197,94,0.4)'}`, color: 'var(--text)', padding: '10px 12px', borderRadius: 10, fontSize: 13, outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = firstName ? 'rgba(34,197,94,0.4)' : 'var(--border)'}
                  />
                  <input
                    value={lastName}
                    onChange={e => handleLastName(e.target.value)}
                    placeholder="👤 Familiya *"
                    style={{ background: 'var(--surface2)', border: `1px solid ${!lastName ? 'var(--border)' : 'rgba(34,197,94,0.4)'}`, color: 'var(--text)', padding: '10px 12px', borderRadius: 10, fontSize: 13, outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = lastName ? 'rgba(34,197,94,0.4)' : 'var(--border)'}
                  />
                </div>

                {/* Telefon — bir marta kiritiladi va saqlanadi */}
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <input
                    value={phone}
                    onChange={e => handlePhone(e.target.value)}
                    placeholder="📞 Telefon raqam * (+998 90 123 45 67)"
                    style={{ width: '100%', background: 'var(--surface2)', border: `1px solid ${phone ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`, color: 'var(--text)', padding: '10px 14px', paddingRight: phone ? '80px' : '14px', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = phone ? 'rgba(34,197,94,0.4)' : 'var(--border)'}
                  />
                  {phone && (
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--accent3)', fontWeight: 600, pointerEvents: 'none' }}>✓ Saqlandi</span>
                  )}
                </div>

                {/* Tashkilot */}
                <input
                  value={buyerCompany}
                  onChange={e => handleCompany(e.target.value)}
                  placeholder="🏢 Tashkilot nomi (ixtiyoriy)"
                  style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 14px', borderRadius: 10, fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />

                {/* Manzil + Xarita tugmasi */}
                <div style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <select
                        value={address}
                        onChange={e => handleAddress(e.target.value)}
                        style={{ width: '100%', background: 'var(--surface2)', border: `1px solid ${address ? 'rgba(108,99,255,0.4)' : 'var(--border)'}`, color: 'var(--text)', padding: '10px 14px', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', cursor: 'pointer', appearance: 'none' }}
                        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={e => e.target.style.borderColor = address ? 'rgba(108,99,255,0.4)' : 'var(--border)'}
                      >
                        <option value="">📍 Toshkent shahri tumanini tanlang *</option>
                        {TASHKENT_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text2)' }}>▼</div>
                    </div>
                    <button
                      onClick={() => setShowMap(true)}
                      title="Xaritada yoki GPS orqali belgilash"
                      style={{ flexShrink: 0, background: address ? 'linear-gradient(135deg, var(--accent), #9b59b6)' : 'var(--surface2)', border: `1px solid ${address ? 'transparent' : 'var(--border)'}`, color: address ? 'white' : 'var(--text2)', padding: '10px 14px', borderRadius: 10, fontSize: 18, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      🗺️ GPS
                    </button>
                  </div>
                  {address && coords && (
                    <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>📍</span>
                      <span>Koordinatalar saqlandi: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
                    </div>
                  )}
                  {!address && (
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>🗺️ Tugmani bosib xaritada manzil belgilang</div>
                  )}
                </div>
              </div>

              {/* Payment method */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--text2)' }}>💳 To'lov usuli</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { id: 'payme', icon: '💳', label: 'Payme', desc: 'Online to\'lov', color: '#00a8e8' },
                    { id: 'click', icon: '📱', label: 'Click', desc: 'Click orqali to\'lov', color: '#f7941d' },
                    { id: 'transfer', icon: '🏦', label: 'Pul ko\'chirish', desc: 'Bank orqali + shartnoma', color: '#22c55e' }
                  ].map(pm => (
                    <div
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, cursor: 'pointer', border: `2px solid ${paymentMethod === pm.id ? pm.color : 'var(--border)'}`, background: paymentMethod === pm.id ? `${pm.color}10` : 'var(--surface2)', transition: 'all 0.2s' }}
                    >
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${pm.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {paymentMethod === pm.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: pm.color }} />}
                      </div>
                      <span style={{ fontSize: 20 }}>{pm.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: paymentMethod === pm.id ? pm.color : 'var(--text)' }}>{pm.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>{pm.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {paymentMethod === 'transfer' && (
                  <div style={{ marginTop: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
                    📋 <strong>Pul ko'chirish jarayoni:</strong><br />
                    1. Shartnoma avtomatik PDF da yuklab olinadi<br />
                    2. Rekvizitlarga pul o'tkazing<br />
                    3. Chekni platformaga yuklang<br />
                    4. 3 kunda yetkazib beramiz
                  </div>
                )}

                {(paymentMethod === 'payme' || paymentMethod === 'click') && (
                  <div style={{ marginTop: 12, background: 'rgba(0,168,232,0.08)', border: '1px solid rgba(0,168,232,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }}>
                    💳 To'lov sahifasiga yo'naltirilasiz. To'lovdan so'ng 3 kunda yetkazib beriladi.
                  </div>
                )}
              </div>

              <button onClick={placeOrder} disabled={ordering} style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent), #9b59b6)', border: 'none', color: 'white', padding: '16px', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: ordering ? 'not-allowed' : 'pointer', opacity: ordering ? 0.7 : 1, transition: 'all 0.2s' }}>
                {ordering ? '⏳ Yuborilmoqda...' :
                  paymentMethod === 'transfer' ? '📋 Shartnoma olish va buyurtma berish' :
                    paymentMethod === 'click' ? '📱 Click orqali to\'lash' :
                      '💳 Payme orqali to\'lash'}
              </button>
            </div>
          </div>
        )
      }

      {/* Map Modal */}
      {showMap && (
        <MapModal
          initialAddress={address}
          onClose={() => setShowMap(false)}
          onSelect={(addr, c) => {
            handleAddress(addr);
            if (c) setCoords(c);
            setShowMap(false);
          }}
        />
      )}
    </div>
  );
}

// =================== ORDERS PAGE ===================
function OrdersPage() {
  const { token, setPage, user } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) api.get('/api/orders', token).then(data => { setOrders(Array.isArray(data) ? data : []); setLoading(false); });
    else setLoading(false);
  }, [token]);

  const statusColors = {
    pending: '#f7b731',
    awaiting_payment: '#6c63ff',
    awaiting_confirmation: '#7c3aed',
    processing: '#6c63ff',
    shipped: '#43e97b',
    delivered: '#43e97b',
    cancelled: '#ff6584'
  };
  const statusLabels = {
    pending: '⏳ Kutilmoqda',
    awaiting_payment: '🏦 To\'lov kutilmoqda',
    awaiting_confirmation: '📎 Chek tekshirilmoqda',
    processing: '🔄 Jarayonda',
    shipped: '🚚 Yo\'lda',
    delivered: '✅ Yetkazildi',
    cancelled: '❌ Bekor'
  };
  const paymentLabels = { payme: '💳 Payme', click: '📱 Click', transfer: '🏦 Ko\'chirma' };

  if (!token) return <div style={{ textAlign: 'center', padding: 80 }}><button onClick={() => setPage('login')} style={{ background: 'var(--accent)', border: 'none', color: 'white', padding: '14px 32px', borderRadius: 14, cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>Kirish kerak</button></div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 28 }}>📦 Buyurtmalarim</h1>
      {loading ? <div className="skeleton" style={{ height: 200, borderRadius: 16 }} /> :
        orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text2)' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
            <h3 style={{ fontSize: 22, marginBottom: 8 }}>Buyurtmalar yo'q</h3>
            <button onClick={() => setPage('products')} style={{ background: 'var(--accent)', border: 'none', color: 'white', padding: '12px 28px', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 700, marginTop: 12 }}>Xarid qilish</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orders.map(o => (
              <div key={o.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>#{o.id.slice(0, 8)}</div>
                      {o.contractNumber && <span style={{ fontSize: 12, background: 'rgba(108,99,255,0.1)', color: 'var(--accent)', padding: '2px 10px', borderRadius: 8 }}>📋 {o.contractNumber}</span>}
                      <span style={{ fontSize: 12, background: 'var(--surface2)', color: 'var(--text2)', padding: '2px 10px', borderRadius: 8 }}>{paymentLabels[o.paymentMethod] || '—'}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>{new Date(o.createdAt).toLocaleString('uz-UZ')}</div>
                    {o.address && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>📍 {o.address}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ background: `${statusColors[o.status]}22`, color: statusColors[o.status], padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>{statusLabels[o.status] || o.status}</span>
                    <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>{formatSum(o.total)}</span>
                    {o.deliveryFee > 0 && <div style={{ fontSize: 11, color: 'var(--text2)' }}>+ {formatSum(o.deliveryFee)} yetkazish</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: o.paymentMethod === 'transfer' ? 14 : 0 }}>
                  {o.items?.map(item => (
                    <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', padding: '8px 14px', borderRadius: 10 }}>
                      <span style={{ fontSize: 20 }}>{item.image}</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</span>
                      <span style={{ fontSize: 13, color: 'var(--text2)' }}>×{item.quantity} dona</span>
                    </div>
                  ))}
                </div>
                {o.paymentMethod === 'transfer' && (
                  <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: o.transferReceipt ? 'rgba(34,197,94,0.08)' : 'rgba(251,191,36,0.08)', border: `1px solid ${o.transferReceipt ? 'rgba(34,197,94,0.2)' : 'rgba(251,191,36,0.2)'}`, fontSize: 13 }}>
                    {o.transferReceipt ? (
                      <span style={{ color: 'var(--accent3)', fontWeight: 600 }}>✅ To'lov cheki yuklangan — tekshirilmoqda</span>
                    ) : (
                      <span style={{ color: '#d97706', fontWeight: 600 }}>⏳ To'lov cheki kutilmoqda</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// =================== AUTH PAGE ===================
function AuthPage({ mode }) {
  const { login, setPage } = useApp();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', company: '', district: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError(''); setLoading(true);
    if (mode === 'login') {
      await login(form.email, form.password);
    } else {
      if (!form.district) {
        setError('Iltimos, tumanni tanlang (Faqat Toshkent)');
        setLoading(false);
        return;
      }
      const addressStr = `Toshkent shahri, ${form.district} tumani`;
      const data = await api.post('/api/auth/register', { ...form, role: 'customer', address: addressStr });
      if (data.error) { setError(data.error); setLoading(false); return; }
      await login(form.email, form.password);
      LS.set('kanstovar_address', addressStr);
    }
    setLoading(false);
  };

  const inp = (key, placeholder, type = 'text') => (
    <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} type={type} placeholder={placeholder} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '14px 18px', borderRadius: 14, fontSize: 15, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} onKeyDown={e => e.key === 'Enter' && submit()} />
  );

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 460, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: '48px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{mode === 'login' ? '👋' : '🎉'}</div>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>{mode === 'login' ? 'Xush kelibsiz!' : 'Ro\'yxatdan o\'tish'}</h2>
          <p style={{ color: 'var(--text2)', marginTop: 8 }}>{mode === 'login' ? 'Hisobingizga kiring' : 'Yangi hisob yarating'}</p>
        </div>
        {error && <div style={{ background: 'rgba(255,101,132,0.15)', border: '1px solid rgba(255,101,132,0.3)', color: 'var(--accent2)', padding: '12px 16px', borderRadius: 12, marginBottom: 18, fontSize: 14 }}>❌ {error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && inp('name', '👤 To\'liq ism')}
          {inp('email', '📧 Email', 'email')}
          {mode === 'register' && inp('phone', '📞 Telefon raqam')}
          {mode === 'register' && inp('company', '🏢 Tashkilot nomi (ixtiyoriy)')}
          {mode === 'register' && (
            <div style={{ position: 'relative' }}>
              <select
                value={form.district}
                onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '14px 18px', borderRadius: 14, fontSize: 15, outline: 'none', transition: 'border-color 0.2s', cursor: 'pointer', appearance: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              >
                <option value="">📍 Toshkent shahri tumanini tanlang *</option>
                {TASHKENT_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text2)' }}>▼</div>
            </div>
          )}
          {inp('password', '🔑 Parol', 'password')}
          <button onClick={submit} disabled={loading} style={{ background: 'linear-gradient(135deg, var(--accent), #9b59b6)', border: 'none', color: 'white', padding: '16px', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4, opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}>
            {loading ? '⏳ Kutingiz...' : mode === 'login' ? 'Kirish →' : 'Ro\'yxatdan o\'tish →'}
          </button>
        </div>
        {mode === 'login' ? (
          <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text2)', fontSize: 14 }}>Hisobingiz yo'qmi? <span onClick={() => setPage('register')} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>Ro'yxatdan o'ting</span></p>
        ) : (
          <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text2)', fontSize: 14 }}>Allaqachon hisobingiz bormi? <span onClick={() => setPage('login')} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>Kirish</span></p>
        )}
        {mode === 'login' && (
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginTop: 20, fontSize: 13 }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text2)' }}>Test hisob:</div>
            <div style={{ color: 'var(--text2)' }}>📧 user@gmail.com / 🔑 password123</div>
          </div>
        )}
      </div>
    </div>
  );
}

// =================== PROFILE PAGE ===================
function ProfilePage() {
  const { user, logout, setPage } = useApp();
  if (!user) return <div style={{ textAlign: 'center', padding: 80 }}><button onClick={() => setPage('login')} style={{ background: 'var(--accent)', border: 'none', color: 'white', padding: '14px 32px', borderRadius: 14, cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>Kirish kerak</button></div>;
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--accent), #9b59b6)', padding: '40px', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 16px' }}>{user.avatar}</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 4 }}>{user.name}</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{user.email}</p>
        </div>
        <div style={{ padding: '24px 28px' }}>
          {[['📅 A\'zo bo\'lgan', user.joinedAt], ['📧 Email', user.email], ['📞 Telefon', user.phone || '—'], ['🏢 Tashkilot', user.company || '—']].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text2)', fontSize: 14 }}>{l}</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{v}</span>
            </div>
          ))}
          <button onClick={() => setPage('orders')} style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent), #9b59b6)', border: 'none', color: 'white', padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 20, marginBottom: 10 }}>📦 Buyurtmalarim</button>
          <button onClick={logout} style={{ width: '100%', background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.2)', color: 'var(--accent2)', padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>🚪 Chiqish</button>
        </div>
      </div>
    </div>
  );
}
