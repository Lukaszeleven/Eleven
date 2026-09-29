const SHEET_ID = '1UHjLOQkVkDI1Y8qmJLHHwRbcRfpc3WSY2iKNpIvWnUY';
const SHEET_TITLE = 'ELEVEN Products';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_TITLE)}`;
const WHATSAPP_NUMBER = '995598717075';
const NO_IMAGE = 'https://placehold.co/600x600?text=No+Image';
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', '4XL', '5XL'];

let products = [];
let cart = JSON.parse(localStorage.getItem('eleven-cart-v2') || '[]'); // [{id,size,qty}]
let sel = { size: '', qty: 1 };
const f = { club: '', types: new Set(), sizes: new Set(), sort: '' };

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = encodeURIComponent;
const uniq = a => [...new Set(a)].filter(Boolean);
const num = v => Number(String(v).replace(/[^0-9.]/g, '')) || 0;

// სურათი: ან სრული ბმული (https://...), ან GitHub-ზე ატვირთული ფაილი (მაგ: Chelsea/che1.jpg)
const imgSrc = v => {
    v = String(v).trim();
    if (!v) return NO_IMAGE;
    if (/^(https?:)?\/\//.test(v)) return v;
    return v.split('/').map(encodeURIComponent).join('/');
};

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
            image: imgSrc(val(r, 3)),
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

// მისამართი: #club=Chelsea (კლუბი) ან #product=CHE1 (პროდუქტის გვერდი)
function readHash() {
    if (!products.length) return;
    const pm = location.hash.match(/product=([^&]*)/);
    const cm = location.hash.match(/club=([^&]*)/);
    f.club = cm ? decodeURIComponent(cm[1]) : '';
    if (pm) showProduct(decodeURIComponent(pm[1]));
    else { f.types.clear(); f.sizes.clear(); showShop(); }
    window.scrollTo(0, 0);
}

function buildClubNav() {
    const clubs = uniq(products.map(p => p.club));
    $('club-nav').innerHTML = '<div class="container club-list">' +
        `<a href="#" data-club="">ყველა</a>` +
        clubs.map(c => `<a href="#club=${enc(c)}" data-club="${esc(c)}">${esc(c)}</a>`).join('') + '</div>';
}

const priceHTML = p => `${p.price} ₾ ${p.oldPrice > p.price ? `<s>${p.oldPrice} ₾</s>` : ''}`;

function showShop() {
    $('shop-view').hidden = false;
    $('product-view').hidden = true;
    document.title = 'ELEVEN — Sports Store';
    render();
}

function render() {
    const inClub = products.filter(p => !f.club || p.club === f.club);
    const q = $('search').value.trim().toLowerCase();
    const list = inClub.filter(p =>
        (!f.types.size || f.types.has(p.type)) &&
        (!f.sizes.size || p.sizes.some(s => f.sizes.has(s))) &&
        p.title.toLowerCase().includes(q));
    if (f.sort) list.sort((a, b) => f.sort === 'asc' ? a.price - b.price : b.price - a.price);

    document.querySelectorAll('#club-nav a').forEach(a => a.classList.toggle('active', a.dataset.club === f.club));
    $('hero').classList.toggle('compact', !!f.club);
    $('hero-title').textContent = f.club || 'საუკეთესო ონლაინ მაღაზია საქართველოში';
    $('hero-sub').textContent = f.club ? '' : 'ამაყად ატარე.';
    $('result-count').textContent = `${f.club || 'ყველა პროდუქტი'} (${list.length})`;

    const types = uniq(inClub.map(p => p.type));
    const sizes = uniq(inClub.flatMap(p => p.sizes)).sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
    $('filters').innerHTML =
        (types.length ? `<div class="f-group"><h4>ტიპი</h4>${types.map(t =>
            `<label><input type="checkbox" data-type="${esc(t)}" ${f.types.has(t) ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div>` : '') +
        (sizes.length ? `<div class="f-group"><h4>ზომა</h4><div class="chips">${sizes.map(s =>
            `<button data-fsize="${esc(s)}" class="${f.sizes.has(s) ? 'on' : ''}">${esc(s)}</button>`).join('')}</div></div>` : '') +
        '<button class="f-clear" data-clear>ფილტრის გასუფთავება</button>';

    $('products-container').innerHTML = list.length ? list.map(p => `
        <a class="product-card" href="#product=${enc(p.id)}">
            <div class="pimg">
                ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : (p.oldPrice > p.price ? '<span class="badge sale">SALE</span>' : '')}
                <img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" data-fallback>
            </div>
            <h3>${esc(p.title)}</h3>
            <div class="price">${priceHTML(p)}</div>
        </a>`).join('') : '<p class="loading-text">ამ პარამეტრებით პროდუქტი ვერ მოიძებნა.</p>';
}

function showProduct(id) {
    $('shop-view').hidden = true;
    $('product-view').hidden = false;
    const p = products.find(x => x.id == id);
    if (!p) {
        $('product-view').innerHTML = '<div class="container"><p class="loading-text">პროდუქტი ვერ მოიძებნა. <a href="#">დაბრუნდი მაღაზიაში</a></p></div>';
        return;
    }
    sel = { size: '', qty: 1 };
    document.title = `${p.title} — ELEVEN`;
    document.querySelectorAll('#club-nav a').forEach(a => a.classList.toggle('active', a.dataset.club === p.club));
    const disc = p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const sizes = [...p.sizes].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
    $('product-view').innerHTML = `
        <div class="container pdp">
            <a class="back" href="${p.club ? '#club=' + enc(p.club) : '#'}">← ${esc(p.club || 'მაღაზია')}</a>
            <div class="pdp-grid">
                <div class="pdp-img"><img src="${esc(p.image)}" alt="${esc(p.title)}" data-fallback></div>
                <div class="pdp-info">
                    <div class="pdp-tags">${disc ? `<span class="tag sale">-${disc}%</span>` : ''}${p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ''}</div>
                    <h1>${esc(p.title)}</h1>
                    <p class="pdp-sub">${esc([p.club, p.type].filter(Boolean).join(' · '))}</p>
                    <div class="pdp-price">${priceHTML(p)}</div>
                    ${sizes.length ? `<h4>ზომა</h4><div class="psizes" id="psizes">${sizes.map(s => `<button data-psize="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
                    <div class="pdp-buy">
                        <div class="pqty"><button data-pqty="-1" aria-label="ერთით ნაკლები">−</button><b id="pqty">1</b><button data-pqty="1" aria-label="ერთით მეტი">+</button></div>
                        <button class="pdp-add ${sizes.length ? 'wait' : ''}" id="padd" data-padd="${esc(p.id)}">${sizes.length ? 'აირჩიე ზომა' : 'კალათაში დამატება'}</button>
                    </div>
                    ${p.description ? `<p class="pdp-desc">${esc(p.description)}</p>` : ''}
                </div>
            </div>
        </div>`;
}

function addToCart(id, size, qty = 1) {
    const line = cart.find(l => l.id == id && l.size == size);
    line ? line.qty += qty : cart.push({ id, size, qty });
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
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${enc(msg)}`, '_blank');
}

document.addEventListener('click', e => {
    const t = e.target;
    if (t.dataset.psize) {
        sel.size = t.dataset.psize;
        document.querySelectorAll('.psizes button').forEach(b => b.classList.toggle('sel', b === t));
        $('psizes').classList.remove('need');
        const b = $('padd');
        b.classList.remove('wait');
        b.textContent = 'კალათაში დამატება';
    }
    if (t.dataset.pqty) {
        sel.qty = Math.max(1, sel.qty + Number(t.dataset.pqty));
        $('pqty').textContent = sel.qty;
    }
    if (t.dataset.padd) {
        const p = products.find(x => x.id == t.dataset.padd);
        if (p.sizes.length && !sel.size) return $('psizes').classList.add('need');
        addToCart(t.dataset.padd, sel.size, sel.qty);
        toggleCartModal();
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
$('search').addEventListener('input', () => {
    if (/product=/.test(location.hash)) location.hash = ''; // ძებნისას პროდუქტის გვერდიდან მაღაზიაში ბრუნდება
    else render();
});
window.addEventListener('hashchange', readHash);

fetchProducts();
