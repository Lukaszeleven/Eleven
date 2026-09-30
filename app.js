const SHEET_ID = '1UHjLOQkVkDI1Y8qmJLHHwRbcRfpc3WSY2iKNpIvWnUY';
const SHEET_TITLE = 'ELEVEN Products';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_TITLE)}`;
const WHATSAPP_NUMBER = '995598717075';
const NO_IMAGE = 'https://placehold.co/600x600?text=No+Image';
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', '4XL', '5XL'];

const LEAGUE_ORDER = [
    'პრემიერ ლიგა',
    'ლა ლიგა',
    'ლიგა 1',
    'სერია A',
    'ბუნდესლიგა',
    'სხვა ლიგები',
    'ეროვნული ნაკრები'
];

let products = [];
let cart = JSON.parse(localStorage.getItem('eleven-cart-v2') || '[]');
const PERS_NAME_PRICE = 15;
const PERS_PATCH_PRICE = 10;
let sel = { size: '', qty: 1, name: '', patches: false };
const f = { league: '', club: '', types: new Set(), sizes: new Set(), sort: '' };

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = encodeURIComponent;
const uniq = a => [...new Set(a)].filter(Boolean);
const num = v => Number(String(v).replace(/[^0-9.]/g, '')) || 0;

function diversifyByClub(list) {
    const byClub = {};
    list.forEach(p => {
        const key = p.club || '_';
        if (!byClub[key]) byClub[key] = [];
        byClub[key].push(p);
    });
    const clubs = Object.keys(byClub);
    const result = [];
    let i = 0;
    let added = true;
    while (added) {
        added = false;
        for (const c of clubs) {
            if (byClub[c][i]) {
                result.push(byClub[c][i]);
                added = true;
            }
        }
        i++;
    }
    return result;
}

/* ===== სურათები: images/{ID}.{გაფართოება} ===== */
const IMG_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'JPEG', 'PNG', 'WEBP'];
const imgUrl = (id, n = 0) => `images/${enc(String(id).trim())}.${IMG_EXTS[n]}`;

function loadSheetJSONP() {
    return new Promise((resolve, reject) => {
        const cbName = '_gviz_cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Sheet load timeout'));
        }, 15000);

        function cleanup() {
            clearTimeout(timeout);
            try { delete window[cbName]; } catch (_) {}
            if (script && script.parentNode) script.parentNode.removeChild(script);
        }

        window[cbName] = function (data) {
            cleanup();
            if (!data || data.status !== 'ok') {
                reject(new Error((data && data.errors && data.errors[0] && data.errors[0].detailed_message) || 'Sheet error'));
                return;
            }
            resolve(data);
        };

        const script = document.createElement('script');
        script.src = SHEET_URL + '&tqx=responseHandler:' + cbName;
        script.onerror = () => {
            cleanup();
            reject(new Error('Script load failed'));
        };
        document.head.appendChild(script);
    });
}

async function fetchProducts() {
    try {
        const json = await loadSheetJSONP();
        let rows = json.table.rows || [];
        if (json.table.cols.every(c => !c.label)) rows = rows.slice(1);

        const val = (r, i) => (r.c && r.c[i] && r.c[i].v !== null && r.c[i].v !== undefined ? r.c[i].v : '');

        // სვეტები: 0 ID | 1 სათაური | 2 ფასი | 3 აღწერა | 4 კლუბი | 5 ტიპი | 6 ძველი ფასი | 7 ზომები | 8 ბეჯი | 9 ლიგა
        products = rows.map((r, i) => {
            const id = String(val(r, 0) || i + 1).trim().replace(/\.(jpe?g|png|webp)$/i, '');
            return {
                id,
                title: val(r, 1) || 'პროდუქტი',
                price: num(val(r, 2)),
                description: val(r, 3),
                club: String(val(r, 4)).trim(),
                type: String(val(r, 5)).trim(),
                oldPrice: num(val(r, 6)),
                sizes: String(val(r, 7)).split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
                badge: String(val(r, 8)).trim(),
                league: String(val(r, 9)).trim()
            };
        });

        buildLeagueNav();
        readHash();
    } catch (e) {
        console.error('ELEVEN products load error:', e);
        $('products-container').innerHTML =
            '<p class="loading-text">პროდუქტების ჩატვირთვა ვერ მოხერხდა. სცადე გვერდის განახლება.</p>';
    }
    updateCartUI();
}

function readHash() {
    if (!products.length) return;
    const pm = location.hash.match(/product=([^&]*)/);
    const lm = location.hash.match(/league=([^&]*)/);
    const cm = location.hash.match(/club=([^&]*)/);

    f.league = lm ? decodeURIComponent(lm[1]) : '';
    f.club = cm ? decodeURIComponent(cm[1]) : '';

    if (pm) showProduct(decodeURIComponent(pm[1]));
    else {
        f.types.clear();
        f.sizes.clear();
        showShop();
    }
    window.scrollTo(0, 0);
}

function buildLeagueNav() {
    document.querySelectorAll('#club-nav a').forEach(a => {
        a.classList.toggle('active', (a.dataset.league || '') === f.league);
    });
}

const priceHTML = p => `${p.price} ₾ ${p.oldPrice > p.price ? `<s>${p.oldPrice} ₾</s>` : ''}`;

function showShop() {
    $('shop-view').hidden = false;
    $('product-view').hidden = true;
    document.title = 'ELEVEN — Sports Store';
    render();
}

function render() {
    let pool = products.filter(p => !f.league || p.league === f.league);
    if (f.club) pool = pool.filter(p => p.club === f.club);

    const q = $('search').value.trim().toLowerCase();
    let list = pool.filter(
        p =>
            (!f.types.size || f.types.has(p.type)) &&
            (!f.sizes.size || p.sizes.some(s => f.sizes.has(s))) &&
            p.title.toLowerCase().includes(q)
    );

    if (f.sort) {
        list.sort((a, b) => (f.sort === 'asc' ? a.price - b.price : b.price - a.price));
    } else if (!f.league && !f.club && !q) {
        list = diversifyByClub(list);
    }

    buildLeagueNav();

    $('hero').classList.toggle('compact', !!f.league || !!f.club);

    if (f.league || f.club) {
        $('hero-title').textContent = 'ატარე სიამაყით';
    } else {
        $('hero-title').innerHTML = 'საუკეთესო<br>ონლაინ მაღაზია<br>საქართველოში';
    }

    const heroSub = $('hero-sub');
    if (heroSub) {
        if (f.club) heroSub.textContent = [f.league, f.club].filter(Boolean).join(' · ');
        else if (f.league) heroSub.textContent = f.league;
        else heroSub.textContent = '';
    }

    const titleParts = [];
    if (f.league) titleParts.push(f.league);
    if (f.club) titleParts.push(f.club);
    $('result-count').textContent = `${titleParts.length ? titleParts.join(' · ') : 'ყველა პროდუქტი'} (${list.length})`;

    const clubsInScope = uniq(
        products.filter(p => !f.league || p.league === f.league).map(p => p.club)
    ).sort();
    const types = uniq(pool.map(p => p.type));
    const sizes = uniq(pool.flatMap(p => p.sizes)).sort(
        (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)
    );

    let filtersHTML = '';

    if (clubsInScope.length) {
        filtersHTML += `<div class="f-group"><h4>გუნდი</h4><div class="chips">`;
        filtersHTML += `<button data-fclub="" class="${!f.club ? 'on' : ''}">ყველა</button>`;
        filtersHTML += clubsInScope
            .map(c => `<button data-fclub="${esc(c)}" class="${f.club === c ? 'on' : ''}">${esc(c)}</button>`)
            .join('');
        filtersHTML += `</div></div>`;
    }

    if (types.length) {
        filtersHTML += `<div class="f-group"><h4>ტიპი</h4>${types
            .map(
                t =>
                    `<label><input type="checkbox" data-type="${esc(t)}" ${
                        f.types.has(t) ? 'checked' : ''
                    }> ${esc(t)}</label>`
            )
            .join('')}</div>`;
    }

    if (sizes.length) {
        filtersHTML += `<div class="f-group"><h4>ზომა</h4><div class="chips">${sizes
            .map(s => `<button data-fsize="${esc(s)}" class="${f.sizes.has(s) ? 'on' : ''}">${esc(s)}</button>`)
            .join('')}</div></div>`;
    }

    filtersHTML += '<button class="f-clear" data-clear>ფილტრის გასუფთავება</button>';
    $('filters').innerHTML = filtersHTML;

    $('products-container').innerHTML = list.length
        ? list
              .map(
                  p => `
        <a class="product-card" href="#product=${enc(p.id)}">
            <div class="pimg">
                ${
                    p.badge
                        ? `<span class="badge">${esc(p.badge)}</span>`
                        : p.oldPrice > p.price
                        ? '<span class="badge sale">SALE</span>'
                        : ''
                }
                <img src="${imgUrl(p.id)}" alt="${esc(p.title)}" loading="lazy" data-fallback data-pid="${esc(p.id)}">
            </div>
            <h3>${esc(p.title)}</h3>
            <div class="price">${priceHTML(p)}</div>
        </a>`
              )
              .join('')
        : '<p class="loading-text">ამ პარამეტრებით პროდუქტი ვერ მოიძებნა.</p>';
}

function showProduct(id) {
    $('shop-view').hidden = true;
    $('product-view').hidden = false;
    const p = products.find(x => String(x.id) === String(id));
    if (!p) {
        $('product-view').innerHTML =
            '<div class="container"><p class="loading-text">პროდუქტი ვერ მოიძებნა. <a href="./">დაბრუნდი მაღაზიაში</a></p></div>';
        return;
    }
    sel = { size: '', qty: 1, name: '', patches: false };
    document.title = `${p.title} — ELEVEN`;

    document.querySelectorAll('#club-nav a').forEach(a => {
        a.classList.toggle('active', (a.dataset.league || '') === p.league);
    });

    const disc = p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const sizes = [...p.sizes].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
    const backHref = p.league ? `#league=${enc(p.league)}` : './';

    $('product-view').innerHTML = `
        <div class="container pdp">
            <a class="back" href="${backHref}">← ${esc(p.league || p.club || 'მაღაზია')}</a>
            <div class="pdp-grid">
                <div class="pdp-img"><img src="${imgUrl(p.id)}" alt="${esc(p.title)}" data-fallback data-pid="${esc(p.id)}"></div>
                <div class="pdp-info">
                    <div class="pdp-tags">${disc ? `<span class="tag sale">-${disc}%</span>` : ''}${
                        p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ''
                    }</div>
                    <h1>${esc(p.title)}</h1>
                    <p class="pdp-sub">${esc([p.league, p.club, p.type].filter(Boolean).join(' · '))}</p>
                    <div class="pdp-price">${priceHTML(p)}</div>
                    ${
                        sizes.length
                            ? `<h4>ზომა</h4><div class="psizes" id="psizes">${sizes
                                  .map(s => `<button data-psize="${esc(s)}">${esc(s)}</button>`)
                                  .join('')}</div>`
                            : ''
                    }
                    <button class="pers-btn" data-pers-open>✎ პერსონალიზაცია</button>
                    <p class="pers-summary" id="pers-summary" hidden></p>
                    <div class="pdp-buy">
                        <div class="pqty">
                            <button data-pqty="-1" aria-label="ერთით ნაკლები">−</button>
                            <b id="pqty">1</b>
                            <button data-pqty="1" aria-label="ერთით მეტი">+</button>
                        </div>
                        <button class="pdp-add ${sizes.length ? 'wait' : ''}" id="padd" data-padd="${esc(p.id)}">${
                            sizes.length ? 'აირჩიე ზომა' : 'კალათაში დამატება'
                        }</button>
                    </div>
                    ${p.description ? `<p class="pdp-desc">${esc(p.description)}</p>` : ''}
                </div>
            </div>
        </div>`;
}

function addToCart(id, size, qty = 1, name = '', patches = false) {
    const line = cart.find(
        l => l.id == id && l.size == size && (l.name || '') === name && !!l.patches === !!patches
    );
    line ? (line.qty += qty) : cart.push({ id, size, qty, name, patches: !!patches });
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

const extraOf = l => (l.name ? PERS_NAME_PRICE : 0) + (l.patches ? PERS_PATCH_PRICE : 0);

const persText = l => [l.name, l.patches ? 'პაჩები და ბეიჯები' : ''].filter(Boolean).join(' · ');

// p.price უკვე მოიცავს პერსონალიზაციის დანამატს, ამიტომ ჯამები ავტომატურად სწორია
const cartDetails = () =>
    cart
        .map((l, i) => {
            const base = products.find(p => p.id == l.id);
            return { ...l, i, p: base && { ...base, price: base.price + extraOf(l) } };
        })
        .filter(l => l.p);

function updateCartUI() {
    const lines = cartDetails();
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const total = lines.reduce((s, l) => s + l.qty * l.p.price, 0);
    localStorage.setItem('eleven-cart-v2', JSON.stringify(cart));
    $('cart-count').textContent = count;
    $('cart-total').textContent = total;
    $('modal-cart-total').textContent = total;
    $('cart-items-list').innerHTML = lines.length
        ? lines
              .map(
                  l => `
        <li>
            <span class="ci-title">${esc(l.p.title)}${l.size ? ` <small>(${esc(l.size)})</small>` : ''}${
                l.name || l.patches ? `<br><small>✎ ${esc(persText(l))}</small>` : ''
            }</span>
            <span class="qty">
                <button data-qty="${l.i}" data-d="-1" aria-label="ერთით ნაკლები">−</button>
                <b>${l.qty}</b>
                <button data-qty="${l.i}" data-d="1" aria-label="ერთით მეტი">+</button>
            </span>
            <strong>${l.qty * l.p.price} ₾</strong>
        </li>`
              )
              .join('')
        : '<li class="empty">კალათა ცარიელია</li>';
}

function toggleCartModal() {
    $('cart-modal').classList.toggle('open');
}

function checkout() {
    const lines = cartDetails();
    if (!lines.length) return alert('კალათა ცარიელია!');
    const name = $('order-name').value.trim(),
        phone = $('order-phone').value.trim(),
        address = $('order-address').value.trim();
    if (!name || !phone || !address) return alert('შეავსე სახელი, ტელეფონი და მისამართი.');
    const total = lines.reduce((s, l) => s + l.qty * l.p.price, 0);
    const msg = [
        'ახალი შეკვეთა ELEVEN-ზე:',
        '',
        ...lines.map(
            l =>
                `• ${l.p.title}${l.size ? ' (' + l.size + ')' : ''}${
                    l.name ? ' [გვარი და ნომერი: ' + l.name + ']' : ''
                }${l.patches ? ' [პაჩები და ბეიჯები]' : ''} × ${l.qty} = ${l.qty * l.p.price} ₾`
        ),
        '',
        `სულ: ${total} ₾`,
        `სახელი: ${name}`,
        `ტელეფონი: ${phone}`,
        `მისამართი: ${address}`
    ].join('\n');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${enc(msg)}`, '_blank');
}

/* ===== პერსონალიზაცია ===== */
const persClean = v => v.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s{2,}/g, ' ').slice(0, 15);

function ensurePersModal() {
    if ($('pers-modal')) return;
    const d = document.createElement('div');
    d.id = 'pers-modal';
    d.className = 'pers-modal';
    d.innerHTML = `
        <div class="pers-box" role="dialog" aria-modal="true" aria-labelledby="pers-title">
            <div class="pers-head">
                <h3 id="pers-title">პერსონალიზაცია</h3>
                <button class="close-btn" data-pers-close aria-label="დახურვა">&times;</button>
            </div>
            <div class="pers-row">
                <label for="pers-name">გვარი და ნომერი (მაქს. 15 სიმბოლო)</label>
                <span class="pers-pr">+${PERS_NAME_PRICE} ₾</span>
            </div>
            <input id="pers-name" type="text" maxlength="15" placeholder="მაგ. MESSI 10" autocomplete="off" autocapitalize="characters" spellcheck="false">
            <div class="pers-hint"><span>მხოლოდ ლათინური ასოები და ციფრები</span><span><b id="pers-cnt">0</b>/15</span></div>
            <label class="pers-opt">
                <input type="checkbox" id="pers-patch">
                <span class="pers-t">პაჩები და ბეიჯები</span>
                <span class="pers-pr">+${PERS_PATCH_PRICE} ₾</span>
            </label>
            <div class="pers-total"><span>პერსონალიზაცია</span><strong><span id="pers-sum">0</span> ₾</strong></div>
            <button class="checkout-btn" data-pers-ok>დადასტურება</button>
            <button class="f-clear pers-clear" data-pers-clear>გასუფთავება</button>
        </div>`;
    document.body.appendChild(d);
}

function persUpdate() {
    const input = $('pers-name');
    const clean = persClean(input.value);
    if (clean !== input.value) input.value = clean;
    $('pers-cnt').textContent = clean.length;
    $('pers-sum').textContent =
        (clean.trim() ? PERS_NAME_PRICE : 0) + ($('pers-patch').checked ? PERS_PATCH_PRICE : 0);
}

function openPers() {
    ensurePersModal();
    $('pers-name').value = sel.name;
    $('pers-patch').checked = sel.patches;
    persUpdate();
    $('pers-modal').classList.add('open');
    setTimeout(() => $('pers-name').focus(), 50);
}

function closePers() {
    const m = $('pers-modal');
    if (m) m.classList.remove('open');
}

function renderPers() {
    const box = $('pers-summary');
    if (!box) return;
    const extra = extraOf(sel);
    const text = persText(sel);
    box.hidden = !text;
    box.innerHTML = text ? `✎ ${esc(text)} <b>+${extra} ₾</b>` : '';
}

function savePers() {
    sel.name = persClean($('pers-name').value).trim();
    sel.patches = $('pers-patch').checked;
    renderPers();
    closePers();
}

function clearPers() {
    sel.name = '';
    sel.patches = false;
    renderPers();
    closePers();
}

function setLeague(league) {
    f.league = league || '';
    f.club = '';
    f.types.clear();
    f.sizes.clear();
    if (f.league) location.hash = 'league=' + enc(f.league);
    else location.hash = '';
}

function setClub(club) {
    f.club = club || '';
    if (f.league && f.club) location.hash = `league=${enc(f.league)}&club=${enc(f.club)}`;
    else if (f.league) location.hash = 'league=' + enc(f.league);
    else if (f.club) location.hash = 'club=' + enc(f.club);
    else location.hash = '';
    render();
}

document.addEventListener('click', e => {
    const t = e.target;

    if (t.dataset && t.dataset.league !== undefined && t.closest('#club-nav')) {
        e.preventDefault();
        setLeague(t.dataset.league);
        return;
    }

    if (t.dataset.fclub !== undefined) {
        setClub(t.dataset.fclub);
        return;
    }

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
        if (p && p.sizes.length && !sel.size) return $('psizes').classList.add('need');
        addToCart(t.dataset.padd, sel.size, sel.qty, sel.name, sel.patches);
        toggleCartModal();
    }
    if (t.dataset.persOpen !== undefined) openPers();
    if (t.dataset.persClose !== undefined || t.id === 'pers-modal') closePers();
    if (t.dataset.persOk !== undefined) savePers();
    if (t.dataset.persClear !== undefined) clearPers();
    if (t.dataset.qty) changeQty(Number(t.dataset.qty), Number(t.dataset.d));
    if (t.dataset.fsize) {
        f.sizes.has(t.dataset.fsize) ? f.sizes.delete(t.dataset.fsize) : f.sizes.add(t.dataset.fsize);
        render();
    }
    if (t.dataset.clear !== undefined) {
        f.types.clear();
        f.sizes.clear();
        f.club = '';
        render();
    }
    if (t.id === 'cart-modal') toggleCartModal();
    if (t.id === 'filter-toggle') document.querySelector('.shop').classList.toggle('show-filters');
});

document.addEventListener('change', e => {
    if (e.target.dataset.type) {
        e.target.checked ? f.types.add(e.target.dataset.type) : f.types.delete(e.target.dataset.type);
        render();
    }
    if (e.target.id === 'pers-patch') persUpdate();
    if (e.target.id === 'sort') {
        f.sort = e.target.value;
        render();
    }
});

// სურათის ფორმატის ავტომატური მიგნება: jpg → jpeg → png → webp → No Image
document.addEventListener(
    'error',
    e => {
        const img = e.target;
        if (!img.dataset || img.dataset.fallback === undefined || img.dataset.done) return;
        const n = Number(img.dataset.ext || 0) + 1;
        if (n < IMG_EXTS.length) {
            img.dataset.ext = n;
            img.src = imgUrl(img.dataset.pid, n);
        } else {
            img.dataset.done = '1';
            img.src = NO_IMAGE;
        }
    },
    true
);

document.addEventListener('input', e => {
    if (e.target.id === 'pers-name') persUpdate();
});

document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('pers-modal') && $('pers-modal').classList.contains('open')) closePers();
    else if ($('cart-modal').classList.contains('open')) toggleCartModal();
});

$('search').addEventListener('input', () => {
    if (/product=/.test(location.hash)) location.hash = f.league ? 'league=' + enc(f.league) : '';
    else render();
});

window.addEventListener('hashchange', readHash);

fetchProducts();
