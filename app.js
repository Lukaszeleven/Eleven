const SHEET_ID = '1UHjLOQkVkDI1Y8qmJLHHwRbcRfpc3WSY2iKNpIvWnUY';
const SHEET_TITLE = 'ELEVEN Products';

const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_TITLE)}`;

let products = [];
let cart = [];

// Google Sheets-იდან მონაცემების წამოღება
async function fetchProductsFromGoogleSheets() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        
        // Google-ის JSON პასუხის გასუფთავება
        const jsonData = JSON.parse(text.substring(47, text.length - 2));
        const rows = jsonData.table.rows;

        // თუ პირველი სტრიქონი სათაურებია (id, title...), გამოვტოვოთ
        const dataRows = (rows[0] && rows[0].c[0] && (rows[0].c[0].v === 'id' || rows[0].c[0].v === 'Id')) ? rows.slice(1) : rows;

        products = dataRows.map((row, index) => {
            return {
                id: (row.c[0] && row.c[0].v !== null) ? row.c[0].v : index + 1,
                title: (row.c[1] && row.c[1].v) ? row.c[1].v : 'პროდუქტი',
                price: (row.c[2] && row.c[2].v !== null) ? row.c[2].v : 0,
                image: (row.c[3] && row.c[3].v) ? row.c[3].v : 'https://placehold.co/200x200?text=No+Image',
                description: (row.c[4] && row.c[4].v) ? row.c[4].v : ''
            };
        });

        renderProducts();
    } catch (error) {
        console.error('შეცდომა მონაცემების წამოღებისას:', error);
    }
}

// პროდუქტების გამოჩენა საიტზე
function renderProducts() {
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    if (products.length === 0) {
        container.innerHTML = '<p>პროდუქტები ვერ მოიძებნა...</p>';
        return;
    }

    products.forEach(product => {
        const cardHTML = `
            <div class="product-card">
                <img src="${product.image}" alt="${product.title}" onerror="this.src='https://placehold.co/200x200?text=No+Image'">
                <h3>${product.title}</h3>
                <p>${product.description}</p>
                <div class="price">${product.price} ₾</div>
                <button onclick="addToCart(${product.id})">კალათაში დამატება</button>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}

// კალათაში დამატების ფუნქცია
function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (product) {
        cart.push(product);
        updateCartUI();
    }
}

// კალათის განახლება
function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    
    const totalPrice = cart.reduce((sum, item) => sum + Number(item.price), 0);
    document.getElementById('cart-total').innerText = totalPrice;

    const list = document.getElementById('cart-items-list');
    list.innerHTML = '';
    
    cart.forEach(item => {
        list.innerHTML += `<li>${item.title} - ${item.price} ₾</li>`;
    });
}

// შეკვეთის გაფორმება
function checkout() {
    if (cart.length === 0) {
        alert("კალათა ცარიელია!");
        return;
    }
    const total = document.getElementById('cart-total').innerText;
    alert(`გადასახდელი თანხა: ${total} ₾. შეკვეთა მიღებულია!`);
}

// საიტის ჩატვირთვისას წამოიღოს მონაცემები Google Sheets-იდან
fetchProductsFromGoogleSheets();
