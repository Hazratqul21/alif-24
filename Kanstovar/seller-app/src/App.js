import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

// Format so'm
const formatSum = (n) => {
  if (!n && n !== 0) return '0';
  return Number(n).toLocaleString('uz-UZ') + ' so\'m';
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

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

const Toast = ({ toasts, remove }) => (
  <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
    {toasts.map(t => (
      <div key={t.id} onClick={() => remove(t.id)} style={{ background: t.type === 'success' ? 'var(--accent3)' : t.type === 'error' ? 'var(--accent2)' : 'var(--accent)', color: 'white', padding: '12px 20px', borderRadius: 12, fontWeight: 600, cursor: 'pointer', animation: 'slideIn 0.3s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', maxWidth: 300, fontSize: 14 }}>
        {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'} {t.message}
      </div>
    ))}
  </div>
);

const NAV = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'products', icon: '📦', label: 'Mahsulotlar' },
  { id: 'orders', icon: '🛍️', label: 'Buyurtmalar' },
  { id: 'add-product', icon: '➕', label: 'Mahsulot qo\'shish' },
  { id: 'profile', icon: '👤', label: 'Profil' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('seller_token'));
  const [page, setPage] = useState('dashboard');
  const [toasts, setToasts] = useState([]);
  const [editProduct, setEditProduct] = useState(null);

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const removeToast = (id) => setToasts(t => t.filter(x => x.id !== id));

  useEffect(() => {
    if (token) {
      api.get('/api/auth/me', token).then(u => {
        if (!u.error && u.role === 'seller') setUser(u);
        else { localStorage.removeItem('seller_token'); setToken(null); }
      });
    }
  }, [token]);

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    if (data.error) { toast(data.error, 'error'); return false; }
    if (data.user.role !== 'seller') { toast('Bu panel faqat sotuvchilar uchun!', 'error'); return false; }
    localStorage.setItem('seller_token', data.token);
    setToken(data.token);
    setUser(data.user);
    toast(`Xush kelibsiz, ${data.user.name}!`);
    return true;
  };

  const logout = () => {
    localStorage.removeItem('seller_token');
    setToken(null);
    setUser(null);
    toast('Chiqib ketdingiz');
  };

  const ctx = { user, token, page, setPage, login, logout, toast, editProduct, setEditProduct };

  if (!token || !user) return (
    <AppCtx.Provider value={ctx}>
      <SellerLogin />
      <Toast toasts={toasts} remove={removeToast} />
    </AppCtx.Provider>
  );

  return (
    <AppCtx.Provider value={ctx}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ flex: 1, marginLeft: 260, minHeight: '100vh' }}>
          {page === 'dashboard' && <Dashboard />}
          {page === 'products' && <ProductsPage />}
          {page === 'orders' && <OrdersPage />}
          {page === 'add-product' && <ProductForm />}
          {page === 'edit-product' && <ProductForm isEdit />}
          {page === 'profile' && <ProfilePage />}
        </main>
      </div>
      <Toast toasts={toasts} remove={removeToast} />
    </AppCtx.Provider>
  );
}

// =================== SIDEBAR ===================
function Sidebar() {
  const { user, page, setPage, logout } = useApp();
  return (
    <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 260, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏪</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent)' }}>KANSTOVAR</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>Sotuvchi Paneli</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '16px 12px', flex: 1 }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{ width: '100%', textAlign: 'left', padding: '11px 14px', borderRadius: 12, background: page === n.id ? 'rgba(79,70,229,0.1)' : 'transparent', color: page === n.id ? 'var(--accent)' : 'var(--text2)', fontSize: 14, fontWeight: page === n.id ? 700 : 500, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2, transition: 'all 0.2s', border: page === n.id ? '1px solid rgba(79,70,229,0.2)' : '1px solid transparent' }} onMouseEnter={e => { if (page !== n.id) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)'; } }} onMouseLeave={e => { if (page !== n.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; } }}>
            <span style={{ fontSize: 18 }}>{n.icon}</span> {n.label}
          </button>
        ))}
      </div>
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 12, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{user?.avatar}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Sotuvchi</div>
          </div>
        </div>
        <button onClick={logout} style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'rgba(225,29,72,0.08)', color: 'var(--accent2)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>🚪 Chiqish</button>
      </div>
    </aside>
  );
}

// =================== DASHBOARD ===================
function Dashboard() {
  const { token } = useApp();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/seller/stats', token).then(data => { setStats(data); setLoading(false); });
  }, [token]);

  const statCards = stats ? [
    { label: 'Jami daromad', value: formatSum(stats.totalRevenue), icon: '💰', color: '#4f46e5', bg: 'rgba(79,70,229,0.08)' },
    { label: 'Buyurtmalar', value: stats.totalOrders, icon: '🛍️', color: '#059669', bg: 'rgba(5,150,105,0.08)' },
    { label: 'Mahsulotlar', value: stats.totalProducts, icon: '📦', color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
    { label: 'Sotilgan (dona)', value: stats.totalSold, icon: '✅', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
  ] : [];

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6 }}>📊 Dashboard</h1>
        <p style={{ color: 'var(--text2)' }}>Do'koningiz holati haqida umumiy ma'lumot</p>
      </div>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 16 }} />)}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginBottom: 24 }}>
            {statCards.map(s => (
              <div key={s.label} className="fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '24px 20px', transition: 'all 0.2s', boxShadow: 'var(--shadow2)' }} onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow2)'}>
                <div style={{ width: 48, height: 48, background: s.bg, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 14 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Alerts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {stats?.lowStock > 0 && (
              <div style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>⚠️</span>
                <div><strong style={{ color: 'var(--accent4)' }}>{stats.lowStock} ta mahsulot</strong><span style={{ color: 'var(--text2)', marginLeft: 6 }}>zaxirasi kamligi (50 tadan kam)</span></div>
              </div>
            )}
            {stats?.pendingTransfers > 0 && (
              <div style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>🏦</span>
                <div><strong style={{ color: 'var(--accent)' }}>{stats.pendingTransfers} ta pul ko'chirish</strong><span style={{ color: 'var(--text2)', marginLeft: 6 }}>to'lov kutilmoqda</span></div>
              </div>
            )}
            {stats?.receiptsReceived > 0 && (
              <div style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>📎</span>
                <div><strong style={{ color: 'var(--accent3)' }}>{stats.receiptsReceived} ta chek</strong><span style={{ color: 'var(--text2)', marginLeft: 6 }}>tasdiqlash kutilmoqda</span></div>
              </div>
            )}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, boxShadow: 'var(--shadow2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>📈 So'nggi buyurtmalar</h3>
            {!stats?.recentOrders?.length ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text2)' }}>Hali buyurtma yo'q</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.recentOrders.map((o, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface2)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: 'var(--text2)', fontSize: 13 }}>{o.date}</span>
                      {o.contractNumber && <span style={{ fontSize: 12, color: 'var(--accent)', background: 'rgba(79,70,229,0.1)', padding: '2px 8px', borderRadius: 6 }}>{o.contractNumber}</span>}
                      <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, background: o.paymentMethod === 'transfer' ? 'rgba(5,150,105,0.1)' : 'rgba(108,99,255,0.1)', color: o.paymentMethod === 'transfer' ? 'var(--accent3)' : 'var(--accent)' }}>
                        {o.paymentMethod === 'transfer' ? '🏦 Ko\'chirma' : o.paymentMethod === 'click' ? '📱 Click' : '💳 Payme'}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>{formatSum(o.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// =================== PRODUCTS PAGE ===================
function ProductsPage() {
  const { token, toast, setPage, setEditProduct } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api.get('/api/seller/products', token).then(data => { setProducts(Array.isArray(data) ? data : []); setLoading(false); });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const deleteProduct = async (id, name) => {
    if (!window.confirm(`"${name}" ni o'chirmoqchimisiz?`)) return;
    await api.del(`/api/products/${id}`, token);
    toast('Mahsulot o\'chirildi');
    load();
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 4 }}>📦 Mahsulotlarim</h1>
          <p style={{ color: 'var(--text2)' }}>{products.length} ta mahsulot</p>
        </div>
        <button onClick={() => setPage('add-product')} style={{ background: 'linear-gradient(135deg, var(--accent), #7c3aed)', border: 'none', color: 'white', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(79,70,229,0.3)', transition: 'all 0.2s', cursor: 'pointer' }}>
          ➕ Mahsulot qo'shish
        </button>
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />)}
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
          <h3 style={{ fontSize: 24, marginBottom: 8 }}>Mahsulotlar yo'q</h3>
          <p style={{ color: 'var(--text2)', marginBottom: 20 }}>Birinchi mahsulotingizni qo'shing!</p>
          <button onClick={() => setPage('add-product')} style={{ background: 'var(--accent)', border: 'none', color: 'white', padding: '12px 28px', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>➕ Qo'shish</button>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 140px 100px 100px 80px 140px', padding: '12px 20px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', gap: 16 }}>
            {['', 'Mahsulot', 'Narx', 'Min.Buyurtma', 'Zaxira', 'Sotilgan', 'Amallar'].map(h => <div key={h} style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>)}
          </div>
          {products.map((p, idx) => (
            <div key={p.id} className="fade-in" style={{ display: 'grid', gridTemplateColumns: '60px 1fr 140px 100px 100px 80px 140px', padding: '16px 20px', gap: 16, alignItems: 'center', borderBottom: idx < products.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ fontSize: 32, textAlign: 'center' }}>{p.image}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.name}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 11, background: 'rgba(79,70,229,0.1)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{p.category}</span>
                  <span style={{ fontSize: 11, color: '#f7b731' }}>⭐ {p.rating}</span>
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 15 }}>{formatSum(p.price)}</div>
                {p.originalPrice && <div style={{ fontSize: 12, color: 'var(--text2)', textDecoration: 'line-through' }}>{formatSum(p.originalPrice)}</div>}
              </div>
              <div>
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent3)' }}>{p.minOrder || 1}</span>
                <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 4 }}>dona</span>
              </div>
              <div>
                <span style={{ fontWeight: 700, fontSize: 16, color: p.stock < 50 ? 'var(--accent2)' : p.stock < 100 ? 'var(--accent4)' : 'var(--accent3)' }}>{p.stock}</span>
                <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 4 }}>ta</span>
                {p.stock < 50 && <div style={{ fontSize: 11, color: 'var(--accent2)', fontWeight: 600 }}>⚠️ Kam!</div>}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{p.sold}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setEditProduct(p); setPage('edit-product'); }} style={{ background: 'rgba(79,70,229,0.1)', border: 'none', color: 'var(--accent)', padding: '8px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.target.style.background = 'rgba(79,70,229,0.2)'} onMouseLeave={e => e.target.style.background = 'rgba(79,70,229,0.1)'}>✏️ Tahrir</button>
                <button onClick={() => deleteProduct(p.id, p.name)} style={{ background: 'rgba(225,29,72,0.08)', border: 'none', color: 'var(--accent2)', padding: '8px 10px', borderRadius: 10, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =================== PRODUCT FORM ===================
function ProductForm({ isEdit }) {
  const { token, toast, setPage, editProduct } = useApp();
  const [form, setForm] = useState(isEdit && editProduct ? {
    name: editProduct.name,
    category: editProduct.category,
    price: editProduct.price,
    originalPrice: editProduct.originalPrice || '',
    stock: editProduct.stock,
    image: editProduct.image,
    description: editProduct.description,
    tags: editProduct.tags?.join(', '),
    minOrder: editProduct.minOrder || 1
  } : { name: '', category: 'Daftarlar', price: '', originalPrice: '', stock: '', image: '📦', description: '', tags: '', minOrder: 1 });
  const [saving, setSaving] = useState(false);

  const EMOJIS = ['📓', '✏️', '🖊️', '📁', '🗂️', '📎', '📌', '📄', '🖍️', '📐', '📏', '✂️', '📦', '🔍', '💼', '📋', '🗃️', '📝', '🖨️', '🖥️'];
  const CATEGORIES = ['Daftarlar', 'Qalamlar', 'Ruchkalar', 'Papkalar', 'Flomaster', 'Yopishqoqlar', 'Qog\'oz', 'Stikerlar', 'Ofis jihozlari', 'Boshqa'];

  const submit = async () => {
    if (!form.name || !form.price || !form.stock) { toast('Majburiy maydonlarni to\'ldiring', 'error'); return; }
    if (!form.minOrder || Number(form.minOrder) < 1) { toast('Minimal buyurtma kamida 1 bo\'lishi kerak', 'error'); return; }
    setSaving(true);
    const payload = {
      ...form,
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      stock: Number(form.stock),
      minOrder: Number(form.minOrder),
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : []
    };
    if (isEdit) {
      await api.put(`/api/products/${editProduct.id}`, payload, token);
      toast('Mahsulot yangilandi! ✅');
    } else {
      await api.post('/api/products', payload, token);
      toast('Mahsulot qo\'shildi! 🎉');
    }
    setSaving(false);
    setPage('products');
  };

  const field = (label, key, opts = {}) => (
    <div>
      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label} {!opts.optional && <span style={{ color: 'var(--accent2)' }}>*</span>}</label>
      {opts.textarea ? (
        <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={opts.placeholder} rows={4} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px 16px', borderRadius: 12, fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.6 }} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
      ) : opts.select ? (
        <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px 16px', borderRadius: 12, fontSize: 14, outline: 'none', cursor: 'pointer' }}>
          {opts.select.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} type={opts.type || 'text'} placeholder={opts.placeholder} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px 16px', borderRadius: 12, fontSize: 14, outline: 'none' }} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
      )}
    </div>
  );

  return (
    <div style={{ padding: '32px', maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <button onClick={() => setPage('products')} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', width: 40, height: 40, borderRadius: 10, fontSize: 18, cursor: 'pointer' }}>←</button>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>{isEdit ? '✏️ Mahsulotni tahrirlash' : '➕ Yangi mahsulot'}</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 2 }}>{isEdit ? 'Ma\'lumotlarni yangilang' : 'Yangi mahsulot qo\'shing'}</p>
        </div>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px', boxShadow: 'var(--shadow2)' }}>
        {/* Emoji Picker */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mahsulot ikonkasi</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setForm(f => ({ ...f, image: e }))} style={{ width: 44, height: 44, fontSize: 24, background: form.image === e ? 'rgba(79,70,229,0.15)' : 'var(--surface2)', border: form.image === e ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}>{e}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ gridColumn: '1 / -1' }}>{field('Mahsulot nomi', 'name', { placeholder: 'Masalan: Daftar A4 (96 varaq)' })}</div>
          {field('Kategoriya', 'category', { select: CATEGORIES })}
          {field('Zaxira (dona)', 'stock', { type: 'number', placeholder: '1000' })}
          {field('Narx (so\'m)', 'price', { type: 'number', placeholder: '8500' })}
          {field('Asl narx (so\'m)', 'originalPrice', { type: 'number', placeholder: '10000', optional: true })}

          {/* Minimal buyurtma */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Minimal buyurtma (dona) <span style={{ color: 'var(--accent2)' }}>*</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                value={form.minOrder}
                onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))}
                type="number"
                min="1"
                placeholder="10"
                style={{ width: 160, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px 16px', borderRadius: 12, fontSize: 14, outline: 'none' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <div style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.15)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: 'var(--text2)' }}>
                📦 Mijoz kamida <strong style={{ color: 'var(--accent)' }}>{form.minOrder || 1} dona</strong> buyurishi kerak bo'ladi
              </div>
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>{field('Tavsif', 'description', { textarea: true, placeholder: 'Mahsulot haqida batafsil ma\'lumot...' })}</div>
          <div style={{ gridColumn: '1 / -1' }}>{field('Teglar', 'tags', { placeholder: 'daftar, a4, chiziqli', optional: true })}</div>
        </div>
        <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={() => setPage('products')} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', padding: '13px 28px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Bekor qilish</button>
          <button onClick={submit} disabled={saving} style={{ background: 'linear-gradient(135deg, var(--accent), #7c3aed)', border: 'none', color: 'white', padding: '13px 32px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 16px rgba(79,70,229,0.3)', transition: 'all 0.2s' }}>
            {saving ? '⏳ Saqlanmoqda...' : isEdit ? '✅ Yangilash' : '➕ Qo\'shish'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =================== ORDERS PAGE ===================
function OrdersPage() {
  const { token, toast } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewReceipt, setViewReceipt] = useState(null);

  const load = useCallback(() => {
    api.get('/api/orders', token).then(data => { setOrders(Array.isArray(data) ? data : []); setLoading(false); });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    await api.put(`/api/orders/${id}/status`, { status }, token);
    toast('Status yangilandi!');
    load();
  };

  const statusColors = {
    pending: { bg: 'rgba(217,119,6,0.1)', color: '#d97706', label: '⏳ Kutilmoqda' },
    awaiting_payment: { bg: 'rgba(79,70,229,0.1)', color: 'var(--accent)', label: '🏦 To\'lov kutilmoqda' },
    awaiting_confirmation: { bg: 'rgba(124,58,237,0.1)', color: '#7c3aed', label: '📎 Chek tekshirilmoqda' },
    processing: { bg: 'rgba(79,70,229,0.1)', color: 'var(--accent)', label: '🔄 Jarayonda' },
    shipped: { bg: 'rgba(5,150,105,0.1)', color: 'var(--accent3)', label: '🚚 Yuborildi' },
    delivered: { bg: 'rgba(5,150,105,0.1)', color: 'var(--accent3)', label: '✅ Yetkazildi' },
    cancelled: { bg: 'rgba(225,29,72,0.1)', color: 'var(--accent2)', label: '❌ Bekor' }
  };

  const paymentLabels = {
    payme: { label: '💳 Payme', color: '#00a8e8' },
    click: { label: '📱 Click', color: '#f7941d' },
    transfer: { label: '🏦 Pul ko\'chirma', color: '#059669' }
  };

  const filtered = filter === 'all' ? orders : filter === 'transfer' ? orders.filter(o => o.paymentMethod === 'transfer') : orders.filter(o => o.status === filter);

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 4 }}>🛍️ Buyurtmalar</h1>
        <p style={{ color: 'var(--text2)' }}>{orders.length} ta buyurtma</p>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[['all', '📋 Barchasi'], ['pending', '⏳ Kutilmoqda'], ['awaiting_payment', '🏦 To\'lov kutiladi'], ['awaiting_confirmation', '📎 Chek keldi'], ['processing', '🔄 Jarayonda'], ['shipped', '🚚 Yuborildi'], ['transfer', '💸 Ko\'chirma']].map(([s, label]) => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: filter === s ? 'var(--accent)' : 'var(--surface)', border: filter === s ? 'none' : '1px solid var(--border)', color: filter === s ? 'white' : 'var(--text2)', transition: 'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <div className="skeleton" style={{ height: 200, borderRadius: 16 }} /> :
        filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', color: 'var(--text2)' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Buyurtmalar yo'q</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(o => {
              const sc = statusColors[o.status] || statusColors.pending;
              const pm = paymentLabels[o.paymentMethod] || paymentLabels.payme;
              const subtotal = o.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0;
              return (
                <div key={o.id} className="fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '22px', boxShadow: 'var(--shadow2)', transition: 'box-shadow 0.2s' }} onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow2)'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, fontSize: 16 }}>#{o.id.slice(0, 8)}</span>
                        {o.contractNumber && <span style={{ fontSize: 12, background: 'rgba(79,70,229,0.1)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 8, fontWeight: 700 }}>📋 {o.contractNumber}</span>}
                        <span style={{ fontSize: 12, background: `${pm.color}20`, color: pm.color, padding: '3px 10px', borderRadius: 8, fontWeight: 700 }}>{pm.label}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text2)' }}>{new Date(o.createdAt).toLocaleString('uz-UZ')}</div>
                      {o.buyerName && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>👤 {o.buyerName} {o.buyerCompany && `(${o.buyerCompany})`}</div>}
                      {o.buyerPhone && <div style={{ fontSize: 13, color: 'var(--text2)' }}>📞 {o.buyerPhone}</div>}
                      {o.address && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>📍 {o.address}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ background: sc.bg, color: sc.color, padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>{sc.label}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--accent)' }}>{formatSum(subtotal)}</div>
                        {o.deliveryFee > 0 && <div style={{ fontSize: 12, color: 'var(--text2)' }}>+ {formatSum(o.deliveryFee)} yetkazish</div>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    {o.items?.map(item => (
                      <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', padding: '7px 12px', borderRadius: 10, fontSize: 13 }}>
                        <span>{item.image}</span>
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                        <span style={{ color: 'var(--text2)' }}>×{item.quantity} dona</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{formatSum(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Transfer receipt */}
                  {o.paymentMethod === 'transfer' && (
                    <div style={{ background: o.transferReceipt ? 'rgba(5,150,105,0.05)' : 'rgba(217,119,6,0.05)', border: `1px solid ${o.transferReceipt ? 'rgba(5,150,105,0.2)' : 'rgba(217,119,6,0.2)'}`, borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                      {o.transferReceipt ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>📎</span>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--accent3)', fontSize: 14 }}>To'lov cheki yuklangan</div>
                              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{o.transferReceipt.fileName} • {new Date(o.transferReceipt.uploadedAt).toLocaleString('uz-UZ')}</div>
                            </div>
                          </div>
                          <button onClick={() => setViewReceipt(o.transferReceipt)} style={{ background: 'var(--accent3)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Ko'rish</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>⏳</span>
                          <div style={{ fontWeight: 600, color: '#d97706', fontSize: 14 }}>Mijoz to'lov chekini hali yuklamagan</div>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: 'var(--text2)', alignSelf: 'center', marginRight: 4, fontWeight: 600 }}>Status:</span>
                    {['pending', 'processing', 'shipped', 'delivered'].map(s => (
                      <button key={s} onClick={() => updateStatus(o.id, s)} disabled={o.status === s} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: o.status === s ? 'default' : 'pointer', background: o.status === s ? statusColors[s]?.bg : 'var(--surface2)', color: o.status === s ? statusColors[s]?.color : 'var(--text2)', border: o.status === s ? `1px solid ${statusColors[s]?.color}55` : '1px solid var(--border)', transition: 'all 0.2s', opacity: o.status === s ? 1 : 0.8 }}>
                        {statusColors[s]?.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      {/* Receipt Modal */}
      {viewReceipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setViewReceipt(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 24, maxWidth: 600, width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>📎 To'lov cheki</h3>
              <button onClick={() => setViewReceipt(null)} style={{ background: 'var(--surface2)', border: 'none', color: 'var(--text)', width: 36, height: 36, borderRadius: 10, fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>Fayl: {viewReceipt.fileName}</div>
            {viewReceipt.data && viewReceipt.data.startsWith('data:image') ? (
              <img src={viewReceipt.data} alt="To'lov cheki" style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)' }} />
            ) : (
              <div style={{ background: 'var(--surface2)', padding: 20, borderRadius: 12, textAlign: 'center', color: 'var(--text2)' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>📄</div>
                <div>PDF yoki boshqa fayl formati</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =================== PROFILE PAGE ===================
function ProfilePage() {
  const { user, logout } = useApp();
  return (
    <div style={{ padding: '32px', maxWidth: 580 }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 28 }}>👤 Profil</h1>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px', boxShadow: 'var(--shadow2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
          <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>{user?.avatar}</div>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{user?.name}</h2>
            <p style={{ color: 'var(--text2)' }}>{user?.email}</p>
            <span style={{ background: 'rgba(79,70,229,0.1)', color: 'var(--accent)', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>🏪 Sotuvchi</span>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
          {[['📅 A\'zo bo\'lgan', user?.joinedAt], ['📧 Email', user?.email], ['⭐ Reyting', user?.rating || 'N/A'], ['📝 Bio', user?.bio || '—']].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text2)', fontSize: 14, fontWeight: 500 }}>{l}</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={logout} style={{ marginTop: 28, width: '100%', background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.2)', color: 'var(--accent2)', padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>🚪 Chiqish</button>
      </div>
    </div>
  );
}

// =================== LOGIN ===================
function SellerLogin() {
  const { login } = useApp();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');

  const submit = async () => {
    setError(''); setLoading(true);
    if (mode === 'register') {
      const data = await fetch(`${API}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, role: 'seller', name: form.name || 'Yangi Sotuvchi' }) }).then(r => r.json());
      if (data.error) { setError(data.error); setLoading(false); return; }
    }
    await login(form.email, form.password);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f4f6fb 0%, #ede9fe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 16px' }}>🏪</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Kanstovar</h1>
          <p style={{ color: '#6b7280', marginTop: 6 }}>Sotuvchi boshqaruv paneli</p>
        </div>
        <div style={{ background: 'white', borderRadius: 24, padding: '40px', boxShadow: '0 8px 40px rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.1)' }}>
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 28 }}>
            {[['login', 'Kirish'], ['register', 'Ro\'yxat']].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setError(''); }} style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: mode === m ? 'white' : 'transparent', color: mode === m ? 'var(--accent)' : '#6b7280', boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s' }}>{l}</button>
            ))}
          </div>
          {error && <div style={{ background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.2)', color: '#dc2626', padding: '11px 16px', borderRadius: 11, marginBottom: 18, fontSize: 14 }}>❌ {error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Do'kon nomi" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111', padding: '13px 16px', borderRadius: 12, fontSize: 14, outline: 'none' }} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            )}
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" placeholder="Email manzil" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111', padding: '13px 16px', borderRadius: 12, fontSize: 14, outline: 'none' }} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} type="password" placeholder="Parol" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111', padding: '13px 16px', borderRadius: 12, fontSize: 14, outline: 'none' }} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} onKeyDown={e => e.key === 'Enter' && submit()} />
            <button onClick={submit} disabled={loading} style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none', color: 'white', padding: '15px', borderRadius: 13, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 16px rgba(79,70,229,0.3)', transition: 'all 0.2s' }}>
              {loading ? '⏳ Kutingiz...' : mode === 'login' ? '→ Kirish' : '→ Ro\'yxatdan o\'tish'}
            </button>
          </div>
          {mode === 'login' && (
            <div style={{ background: 'rgba(79,70,229,0.05)', border: '1px solid rgba(79,70,229,0.15)', borderRadius: 12, padding: '13px 16px', marginTop: 20, fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: '#4f46e5' }}>Test hisoblar:</div>
              <div style={{ color: '#6b7280' }}>📧 seller@kanstovar.uz / 🔑 password123</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
