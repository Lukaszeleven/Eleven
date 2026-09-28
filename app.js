const SHEET_ID = '1UHjLOQkVkDI1Y8qmJLHHwRbcRfpc3WSY2iKNpIvWnUY';
const SHEET_TITLE = 'ELEVEN Products';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_TITLE)}`;
const WHATSAPP_NUMBER = '995598717075';
const NO_IMAGE = 'https://placehold.co/400x400?text=No+Image';
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

let products = [];
let cart = JSON.parse(localStorage.getItem('eleven-cart-v2') || '[]'); // [{id,size,qty}]
const f = { club: '', types: new Set(), sizes: new Set(), sort: '' };

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uniq = a => [...new Set(a)].filter(Boolean);
const num = v => Number(String(v).replace(/[^0-9.]/g, '')) || 0;

async function fetchProducts() {
    try {
        const text = await (await fetch(SHEET_URL)).text();
        const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
        let rows = json.table.rows;
        if (json.table.cols.every(c => !c.label)) rows = rows.slice(1);
        const val = (r, i) => (r.c[i] && r.c[i].v !== null ? r.c[i].v : '');
        products = rows.map((r, i) => ({
            id: val(r, 0) || i + 1,
            title: val(r, 1) || 'პროდუქტი',
            price: num(val(r, 2)),
            image: val(r, 3) || NO_IMAGE,
            description: val(r, 4),
            club: String(val(r, 5)).trim(),
            type: String(val(r, 6)).trim(),
            oldPrice: num(val(r, 7)),
            sizes: String(val(r, 8)).split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
            badge: String(val(r, 9)).trim()
        }));
        buildClubNav();
        readHash();
    } catch (e) {
        console.error(e);
        $('products-container').innerHTML = '<p class="loading-text">პროდუქტების ჩატვირთვა ვერ მოხერხდა. სცადე გვერდის განახლება.</p>';
    }
    updateCartUI();
}

// კლუბის არჩევა ინახება მისამართში (#club=Chelsea), ამიტომ უკან ღილაკი მუშაობს
function readHash() {
    const m = location.hash.match(/club=([^&]*)/);
    f.club = m ? decodeURIComponent(m[1]) : '';
    f.types.clear();
    f.sizes.clear();
    render();
}

function buildClubNav() {
    const clubs = uniq(products.map(p => p.club));
    $('club-nav').innerHTML = '<div class="container club-list">' +
        `<a href="#" data-club="">ყველა</a>` +
        clubs.map(c => `<a href="#club=${encodeURIComponent(c)}" data-club="${esc(c)}">${esc(c)}</a>`).join('') + '</div>';
}

function render() {
    const inClub = products.filter(p => !f.club || p.club === f.club);
    const q = $('search').value.trim().toLowerCase();
    let list = inClub.filter(p =>
        (!f.types.size || f.types.has(p.type)) &&
        (!f.sizes.size || p.sizes.some(s => f.sizes.has(s))) &&
        p.title.toLowerCase().includes(q));
    if (f.sort) list.sort((a, b) => f.sort === 'asc' ? a.price - b.price : b.price - a.price);

    document.querySelectorAll('#club-nav a').forEach(a => a.classList.toggle('active', a.dataset.club === f.club));
    $('hero').classList.toggle('compact', !!f.club);
    $('hero-title').textContent = f.club || 'საუკეთესო საფეხბურთო მაისურები';
    $('hero-sub').textContent = f.club ? 'ოფიციალური პროდუქცია' : 'აირჩიე კლუბი, ზომა და შეკვეთა WhatsApp-ით გააფორმე.';
    $('result-count').textContent = `${f.club || 'ყველა პროდუქცია'} (${list.length})`;

    // ფილტრები აიგება მხოლოდ არჩეული კლუბის პროდუქტებიდან
    const types = uniq(inClub.map(p => p.type));
    const sizes = uniq(inClub.flatMap(p => p.sizes)).sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
    $('filters').innerHTML =
        (types.length ? `<div class="f-group"><h4>ტიპი</h4>${types.map(t =>
            `<label><input type="checkbox" data-type="${esc(t)}" ${f.types.has(t) ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div>` : '') +
        (sizes.length ? `<div class="f-group"><h4>ზომა</h4><div class="chips">${sizes.map(s =>
            `<button data-fsize="${esc(s)}" class="${f.sizes.has(s) ? 'on' : ''}">${esc(s)}</button>`).join('')}</div></div>` : '') +
        '<button class="f-clear" data-clear>ფილტრის გასუფთავება</button>';

    $('products-container').innerHTML = list.length ? list.map(p => `
        <div class="product-card" data-id="${esc(p.id)}">
            <div>
                <div class="pimg">
                    ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : (p.oldPrice > p.price ? '<span class="badge sale">SALE</span>' : '')}
                    <img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" data-fallback>
                </div>
                <h3>${esc(p.title)}</h3>
                <p>${esc([p.club, p.type].filter(Boolean).join(' · '))}</p>
            </div>
            <div>
                <div class="price">${p.price} ₾ ${p.oldPrice > p.price ? `<s>${p.oldPrice} ₾</s>` : ''}</div>
                ${p.sizes.length ? `<div class="sizes">${p.sizes.map(s => `<button data-size="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
                <button data-add="${esc(p.id)}">კალათაში დამატება</button>
            </div>
        </div>`).join('') : '<p class="loading-text">ამ პარამეტრებით პროდუქტი ვერ მოიძებნა.</p>';
}

function addToCart(id, size) {
    const line = cart.find(l => l.id == id && l.size == size);
    line ? line.qty++ : cart.push({ id, size, qty: 1 });
    updateCartUI();
    const b = document.querySelector('.cart-badge');
    b.classList.add('bump');
    setTimeout(() => b.classList.remove('bump'), 300);
}

function changeQty(i, d) {
    if (!cart[i]) return;
    cart[i].qty += d;
    if (cart[i].qty <= 0) cart.splice(i, 1);
    updateCartUI();
}

const cartDetails = () => cart.map((l, i) => ({ ...l, i, p: products.find(p => p.id == l.id) })).filter(l => l.p);

function updateCartUI() {
    const lines = cartDetails();
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const total = lines.reduce((s, l) => s + l.qty * l.p.price, 0);
    localStorage.setItem('eleven-cart-v2', JSON.stringify(cart));
    $('cart-count').textContent = count;
    $('cart-total').textContent = total;
    $('modal-cart-total').textContent = total;
    $('cart-items-list').innerHTML = lines.length ? lines.map(l => `
        <li>
            <span class="ci-title">${esc(l.p.title)}${l.size ? ` <small>(${esc(l.size)})</small>` : ''}</span>
            <span class="qty">
                <button data-qty="${l.i}" data-d="-1" aria-label="ერთით ნაკლები">−</button>
                <b>${l.qty}</b>
                <button data-qty="${l.i}" data-d="1" aria-label="ერთით მეტი">+</button>
            </span>
            <strong>${l.qty * l.p.price} ₾</strong>
        </li>`).join('') : '<li class="empty">კალათა ცარიელია</li>';
}

function toggleCartModal() { $('cart-modal').classList.toggle('open'); }

function checkout() {
    const lines = cartDetails();
    if (!lines.length) return alert('კალათა ცარიელია!');
    const name = $('order-name').value.trim(), phone = $('order-phone').value.trim(), address = $('order-address').value.trim();
    if (!name || !phone || !address) return alert('შეავსე სახელი, ტელეფონი და მისამართი.');
    const total = lines.reduce((s, l) => s + l.qty * l.p.price, 0);
    const msg = ['ახალი შეკვეთა ELEVEN-ზე:', '',
        ...lines.map(l => `• ${l.p.title}${l.size ? ' (' + l.size + ')' : ''} × ${l.qty} = ${l.qty * l.p.price} ₾`), '',
        `სულ: ${total} ₾`, `სახელი: ${name}`, `ტელეფონი: ${phone}`, `მისამართი: ${address}`].join('\n');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

document.addEventListener('click', e => {
    const t = e.target;
    if (t.dataset.size) { // ზომის არჩევა ბარათზე
        t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b === t));
        t.parentElement.classList.remove('need');
    }
    if (t.dataset.add) {
        const card = t.closest('.product-card');
        const sizes = card.querySelector('.sizes');
        const sel = sizes && sizes.querySelector('.sel');
        if (sizes && !sel) return sizes.classList.add('need');
        addToCart(t.dataset.add, sel ? sel.dataset.size : '');
    }
    if (t.dataset.qty) changeQty(Number(t.dataset.qty), Number(t.dataset.d));
    if (t.dataset.fsize) { f.sizes.has(t.dataset.fsize) ? f.sizes.delete(t.dataset.fsize) : f.sizes.add(t.dataset.fsize); render(); }
    if (t.dataset.clear !== undefined) { f.types.clear(); f.sizes.clear(); render(); }
    if (t.id === 'cart-modal') toggleCartModal();
    if (t.id === 'filter-toggle') document.querySelector('.shop').classList.toggle('show-filters');
});
document.addEventListener('change', e => {
    if (e.target.dataset.type) { e.target.checked ? f.types.add(e.target.dataset.type) : f.types.delete(e.target.dataset.type); render(); }
    if (e.target.id === 'sort') { f.sort = e.target.value; render(); }
});
document.addEventListener('error', e => {
    if (e.target.dataset && e.target.dataset.fallback !== undefined && e.target.src !== NO_IMAGE) e.target.src = NO_IMAGE;
}, true);
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('cart-modal').classList.contains('open')) toggleCartModal();
});
$('search').addEventListener('input', render);
window.addEventListener('hashchange', readHash);

fetchProducts();
