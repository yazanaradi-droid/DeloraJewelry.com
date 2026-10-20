// إدارة السلة عبر localStorage (خاصة بكل زائر على متصفحه)
const Cart = {
  KEY: 'delora_cart',

  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },

  save(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.updateBadge();
  },

  add(product) {
    const items = this.get();
    const existing = items.find(i => i.id === product.id);
    if (existing) existing.qty += 1;
    else items.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty: 1 });
    this.save(items);
  },

  setQty(id, qty) {
    let items = this.get();
    if (qty <= 0) items = items.filter(i => i.id !== id);
    else items = items.map(i => i.id === id ? { ...i, qty } : i);
    this.save(items);
  },

  remove(id) {
    this.save(this.get().filter(i => i.id !== id));
  },

  clear() {
    this.save([]);
  },

  total() {
    return this.get().reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  count() {
    return this.get().reduce((sum, i) => sum + i.qty, 0);
  },

  updateBadge() {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = this.count();
  }
};

document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());
