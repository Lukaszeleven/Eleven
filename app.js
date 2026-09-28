// ჩასვი შენი Google Sheet ID ქვემოთ ბრჭყალებში:
const SHEET_ID = '1UHjLOQkVkDI1Y8qmJLHHwRbcRfpc3WSY2iKNpIvWnUY';
const SHEET_TITLE = 'ELEVEN Products'; // თუ ცხრილის ქვედა ტაბს სახელი შეუცვალე, ის ჩაწერე აქ

const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_TITLE}`;

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

        products = rows.map((row, index) => {
            return {
                id: row.c[0] ? row.c[0].v : index + 1,
                title: row.c[1] ? row.c[1].v : '',
                price: row.c[2] ? row.c[2].v : 0,
                image: row.c[3] ? row.c[3].v : 'https://via.placeholder.com/200',
                description: row.c[4] ? row.c[4].v : ''
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

    products.forEach(product => {
        const cardHTML = `
            <div class="product-card">
                <img src="${product.image}" alt="${product.title}">
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
