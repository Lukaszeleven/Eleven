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
        
        const jsonData = JSON.parse(text.substring(47, text.length - 2));
        const rows = jsonData.table.rows;

        // გამოვტოვოთ პირველი სტრიქონი (headers)
        const dataRows = rows.slice(1);

        products = dataRows.map((row, index) => {
            let rawPrice = (row.c[2] && row.c[2].v !== null) ? String(row.c[2].v) : '0';
            let cleanPrice = rawPrice.replace(/[^0-9.-]+/g, '');

            return {
                id: (row.c[0] && row.c[0].v !== null) ? row.c[0].v : index + 1,
                title: (row.c[1] && row.c[1].v) ? row.c[1].v : 'პროდუქტი',
                price: cleanPrice || '0',
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
        container.innerHTML = '<p class="loading-text">პროდუქტები ვერ მოიძებნა...</p>';
        return;
    }

    products.forEach(product => {
        const cardHTML = `
            <div class="product-card">
                <div>
                    <img src="${product.image}" alt="${product.title}" onerror="this.src='https://placehold.co/200x200?text=No+Image'">
                    <h3>${product.title}</h3>
                    <p>${product.description}</p>
                </div>
                <div>
                    <div class="price">${product.price} ₾</div>
                    <button onclick="addToCart(${product.id})">კალათაში დამატება</button>
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}

// კალათაში დამატება
function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (product) {
        cart.push(product);
        updateCartUI();
    }
}

// კალათის ინტერფეისის განახლება
function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    
    const totalPrice = cart.reduce((sum, item) => sum + Number(item.price), 0);
    document.getElementById('cart-total').innerText = totalPrice;
    
    const modalTotal = document.getElementById('modal-cart-total');
    if (modalTotal) modalTotal.innerText = totalPrice;

    const list = document.getElementById('cart-items-list');
    if (list) {
        list.innerHTML = '';
        if (cart.length === 0) {
            list.innerHTML = '<li style="justify-content: center; color: #888;">კალათა ცარიელია</li>';
        } else {
            cart.forEach(item => {
                list.innerHTML += `
                    <li>
                        <span>${item.title}</span>
                        <strong>${item.price} ₾</strong>
                    </li>
                `;
            });
        }
    }
}

// კალათის ფანჯრის გახსნა/დახურვა
function toggleCartModal() {
    const modal = document.getElementById('cart-modal');
    modal.classList.toggle('open');
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

// საიტის ჩატვირთვისას
fetchProductsFromGoogleSheets();
