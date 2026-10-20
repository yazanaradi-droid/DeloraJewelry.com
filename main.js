let ALL_PRODUCTS = [];
let ACTIVE_CAT = 'الكل';

async function loadProducts() {
  const grid = document.getElementById('grid');
  try {
    const res = await fetch('/api/products');
    ALL_PRODUCTS = await res.json();
    renderGrid();
  } catch {
    grid.innerHTML = '<div class="empty-state">تعذّر تحميل المنتجات، حاولي تحديث الصفحة.</div>';
  }
}

function renderGrid() {
  const grid = document.getElementById('grid');
  const list = ALL_PRODUCTS.filter(p => ACTIVE_CAT === 'الكل' || p.category === ACTIVE_CAT);

  if (!list.length) {
    grid.innerHTML = '<div class="empty-state">لا توجد منتجات في هذا التصنيف حاليًا.</div>';
    return;
  }

  grid.innerHTML = list.map(p => `
    <div class="card">
      <div class="card-img">
        ${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}">` : `<span class="ph">لا توجد صورة</span>`}
      </div>
      <div class="card-body">
        <span class="card-cat">${escapeHtml(p.category)}</span>
        <span class="card-name">${escapeHtml(p.name)}</span>
        <span class="card-price">${p.price.toFixed(2)} د.أ</span>
      </div>
      <div class="card-actions">
        <button class="btn btn-primary" ${p.stock === false ? 'disabled' : ''} onclick='addToCart(${JSON.stringify(p)})'>
          ${p.stock === false ? 'غير متوفر' : 'أضيفي للسلة'}
        </button>
      </div>
    </div>
  `).join('');
}

function addToCart(product) {
  Cart.add(product);
  renderDrawer();
  openDrawer();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// tabs
document.getElementById('tabs').addEventListener('click', e => {
  if (!e.target.matches('.tab')) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  e.target.classList.add('active');
  ACTIVE_CAT = e.target.dataset.cat;
  renderGrid();
});

// drawer
const overlay = document.getElementById('overlay');
const drawer = document.getElementById('drawer');

function openDrawer() { overlay.classList.add('open'); drawer.classList.add('open'); }
function closeDrawer() { overlay.classList.remove('open'); drawer.classList.remove('open'); }

document.getElementById('cartBtn').addEventListener('click', () => { renderDrawer(); openDrawer(); });
document.getElementById('drawerClose').addEventListener('click', closeDrawer);
overlay.addEventListener('click', closeDrawer);

function renderDrawer() {
  const items = Cart.get();
  const wrap = document.getElementById('drawerItems');
  if (!items.length) {
    wrap.innerHTML = '<p style="color:var(--cream-dim); text-align:center; padding:30px 0;">سلتك فارغة حاليًا.</p>';
  } else {
    wrap.innerHTML = items.map(i => `
      <div class="d-item">
        ${i.image ? `<img src="${i.image}" alt="">` : `<div style="width:64px;height:64px;background:var(--panel-2);border-radius:3px;"></div>`}
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

function changeQty(id, qty) {
  Cart.setQty(id, qty);
  renderDrawer();
}

loadProducts();
