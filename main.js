let ALL_PRODUCTS = [];
let ACTIVE_CAT = 'الكل';

async function loadProducts() {
  const grid = document.getElementById('grid');
  try {
    const res = await fetch('/api/products');
    ALL_PRODUCTS = await res.json();
    renderGrid();
    fillTileImages();
  } catch {
    grid.innerHTML = '<div class="empty-state">تعذّر تحميل المنتجات، حاولي تحديث الصفحة.</div>';
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function renderGrid() {
  const grid = document.getElementById('grid');
  const list = ALL_PRODUCTS.filter(p => ACTIVE_CAT === 'الكل' || p.category === ACTIVE_CAT);

  if (!list.length) {
    grid.innerHTML = '<div class="empty-state">لا توجد منتجات في هذا التصنيف حاليًا.</div>';
    return;
  }

  grid.innerHTML = list.map((p, idx) => `
    <div class="card reveal" style="--i:${idx % 4}">
      <div class="card-img">
        ${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy">` : `<span class="ph">DELORA</span>`}
      </div>
      <div class="card-body">
        <span class="card-cat">${escapeHtml(p.category)}</span>
        <span class="card-name">${escapeHtml(p.name)}</span>
        <span class="card-price">${p.price.toFixed(2)} د.أ</span>
      </div>
      <div class="card-actions">
        <button class="btn" ${p.stock === false ? 'disabled' : ''} onclick="addToCart('${p.id}')">
          ${p.stock === false ? 'غير متوفر' : 'أضيفي للسلة'}
        </button>
      </div>
    </div>
  `).join('');
  observeReveals();
}

// صور بطاقات المجموعات تؤخذ تلقائيًا من أول منتج فيه صورة بكل تصنيف
function fillTileImages() {
  document.querySelectorAll('.tile-wrap').forEach(wrap => {
    const p = ALL_PRODUCTS.find(x => x.category === wrap.dataset.cat && x.image);
    if (p) {
      wrap.querySelector('.tile-bg').style.backgroundImage = `url('${p.image}')`;
      wrap.querySelector('.tile').classList.add('has-img');
    }
  });
}

function setCategory(cat) {
  ACTIVE_CAT = cat;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.cat === cat));
  renderGrid();
}

document.querySelectorAll('.tile-wrap').forEach(wrap => {
  wrap.addEventListener('click', () => {
    setCategory(wrap.dataset.cat);
    document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
  });
});

document.getElementById('tabs').addEventListener('click', e => {
  if (e.target.matches('.tab')) setCategory(e.target.dataset.cat);
});

// ---------- السلة ----------
function addToCart(id) {
  const product = ALL_PRODUCTS.find(p => p.id === id);
  if (!product) return;
  Cart.add(product);
  renderDrawer();
  showToast('أُضيفت «' + product.name + '» إلى السلة');
  const b = document.getElementById('cartBtn');
  b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

const overlay = document.getElementById('overlay');
const drawer = document.getElementById('drawer');
function openDrawer() { overlay.classList.add('open'); drawer.classList.add('open'); }
function closeDrawer() { overlay.classList.remove('open'); drawer.classList.remove('open'); }
document.getElementById('cartBtn').addEventListener('click', () => { renderDrawer(); openDrawer(); });
document.getElementById('drawerClose').addEventListener('click', closeDrawer);
overlay.addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

function renderDrawer() {
  const items = Cart.get();
  const wrap = document.getElementById('drawerItems');
  if (!items.length) {
    wrap.innerHTML = '<p style="color:var(--cream-dim); text-align:center; padding:40px 0;">سلتك فارغة حاليًا.</p>';
  } else {
    wrap.innerHTML = items.map(i => `
      <div class="d-item">
        ${i.image ? `<img src="${i.image}" alt="">` : `<div style="width:78px;height:98px;background:var(--panel-2);"></div>`}
        <div class="info">
          <div class="name">${escapeHtml(i.name)}</div>
          <div class="price">${i.price.toFixed(2)} د.أ</div>
          <div class="qty-ctrl">
            <button onclick="changeQty('${i.id}', ${i.qty - 1})">−</button>
            <span>${i.qty}</span>
            <button onclick="changeQty('${i.id}', ${i.qty + 1})">+</button>
          </div>
          <div class="remove-link" onclick="Cart.remove('${i.id}'); renderDrawer();">إزالة</div>
        </div>
      </div>
    `).join('');
  }
  document.getElementById('drawerTotal').textContent = Cart.total().toFixed(2) + ' د.أ';
}
function changeQty(id, qty) { Cart.setQty(id, qty); renderDrawer(); }

// ---------- حركات ----------
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

function observeReveals() {
  document.querySelectorAll('.reveal:not(.in)').forEach(el => revealObserver.observe(el));
}
observeReveals();

const siteHeader = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  siteHeader.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

loadProducts();
