const SHEET_ID = '1UHjLOQkVkDI1Y8qmJLHHwRbcRfpc3WSY2iKNpIvWnUY';
const SHEET_TITLE = 'ELEVEN Products';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_TITLE)}`;

// ჩაწერე შენი WhatsApp ნომერი საერთაშორისო ფორმატით, + და ინტერვალების გარეშე (მაგ: 995555123456)
const WHATSAPP_NUMBER = '995598717075';
const NO_IMAGE = 'https://placehold.co/200x200?text=No+Image';

let products = [];
let cart = JSON.parse(localStorage.getItem('eleven-cart') || '[]'); // [{id, qty}]

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function fetchProducts() {
    try {
        const text = await (await fetch(SHEET_URL)).text();
        const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
        let rows = json.table.rows;
        // თუ Google-მა სათაურები თავად ამოიცნო, პირველი სტრიქონი პროდუქტია და არ უნდა გამოვტოვოთ
        if (json.table.cols.every(c => !c.label)) rows = rows.slice(1);

        const val = (row, i) => (row.c[i] && row.c[i].v !== null ? row.c[i].v : '');
        products = rows.map((row, i) => ({
            id: val(row, 0) || i + 1,
            title: val(row, 1) || 'პროდუქტი',
            price: Number(String(val(row, 2)).replace(/[^0-9.]/g, '')) || 0,
            image: val(row, 3) || NO_IMAGE,
            description: val(row, 4)
        }));
        renderProducts();
    } catch (e) {
        console.error(e);
        $('products-container').innerHTML = '<p class="loading-text">პროდუქტების ჩატვირთვა ვერ მოხერხდა. სცადე გვერდის განახლება.</p>';
    }
    updateCartUI();
}

function renderProducts() {
    const q = $('search').value.trim().toLowerCase();
    const list = products.filter(p => p.title.toLowerCase().includes(q));
    $('products-container').innerHTML = list.length
        ? list.map(p => `
            <div class="product-card">
                <div>
                    <img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" data-fallback>
                    <h3>${esc(p.title)}</h3>
                    <p>${esc(p.description)}</p>
                </div>
                <div>
                    <div class="price">${p.price} ₾</div>
                    <button data-add="${esc(p.id)}">კალათაში დამატება</button>
                </div>
            </div>`).join('')
        : '<p class="loading-text">პროდუქტი ვერ მოიძებნა.</p>';
}

function addToCart(id) {
    const line = cart.find(l => l.id == id);
    line ? line.qty++ : cart.push({ id, qty: 1 });
    updateCartUI();
    const badge = document.querySelector('.cart-badge');
    badge.classList.add('bump');
    setTimeout(() => badge.classList.remove('bump'), 300);
}

function changeQty(id, d) {
    const line = cart.find(l => l.id == id);
    if (!line) return;
    line.qty += d;
    if (line.qty <= 0) cart = cart.filter(l => l !== line);
    updateCartUI();
}

function cartDetails() {
    return cart.map(l => ({ ...l, p: products.find(p => p.id == l.id) })).filter(l => l.p);
}

function updateCartUI() {
    const lines = cartDetails();
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const total = lines.reduce((s, l) => s + l.qty * l.p.price, 0);
    localStorage.setItem('eleven-cart', JSON.stringify(cart));

    $('cart-count').textContent = count;
    $('cart-total').textContent = total;
    $('modal-cart-total').textContent = total;
    $('cart-items-list').innerHTML = lines.length
        ? lines.map(l => `
            <li>
                <span class="ci-title">${esc(l.p.title)}</span>
                <span class="qty">
                    <button data-qty="${esc(l.id)}" data-d="-1" aria-label="ერთით ნაკლები">−</button>
                    <b>${l.qty}</b>
                    <button data-qty="${esc(l.id)}" data-d="1" aria-label="ერთით მეტი">+</button>
                </span>
                <strong>${l.qty * l.p.price} ₾</strong>
            </li>`).join('')
        : '<li class="empty">კალათა ცარიელია</li>';
}

function toggleCartModal() {
    $('cart-modal').classList.toggle('open');
}

function checkout() {
    const lines = cartDetails();
    if (!lines.length) return alert('კალათა ცარიელია!');
    const name = $('order-name').value.trim();
    const phone = $('order-phone').value.trim();
    const address = $('order-address').value.trim();
    if (!name || !phone || !address) return alert('შეავსე სახელი, ტელეფონი და მისამართი.');
    if (!WHATSAPP_NUMBER) return alert('შეკვეთის მიღების ნომერი ჯერ არ არის მითითებული (app.js → WHATSAPP_NUMBER).');

    const total = lines.reduce((s, l) => s + l.qty * l.p.price, 0);
    const msg = ['ახალი შეკვეთა ELEVEN-ზე:', '',
        ...lines.map(l => `• ${l.p.title} × ${l.qty} = ${l.qty * l.p.price} ₾`), '',
        `სულ: ${total} ₾`, `სახელი: ${name}`, `ტელეფონი: ${phone}`, `მისამართი: ${address}`].join('\n');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ივენთები (onclick ატრიბუტების ნაცვლად)
document.addEventListener('click', e => {
    const t = e.target;
    if (t.dataset.add) addToCart(t.dataset.add);
    if (t.dataset.qty) changeQty(t.dataset.qty, Number(t.dataset.d));
    if (t.id === 'cart-modal') toggleCartModal(); // დაკლიკება ფონზე
});
document.addEventListener('error', e => {
    if (e.target.dataset && e.target.dataset.fallback !== undefined && e.target.src !== NO_IMAGE) e.target.src = NO_IMAGE;
}, true);
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('cart-modal').classList.contains('open')) toggleCartModal();
});
$('search').addEventListener('input', renderProducts);

fetchProducts();
