// ტესტური პროდუქტების სია (შემდეგ ეტაპზე ამას Google Sheets-ით ჩავანაცვლებთ)
const products = [
    { id: 1, title: "სპორტული ფეხსაცმელი", price: 150, image: "https://via.placeholder.com/200" },
    { id: 2, title: "მაისური ELEVEN", price: 45, image: "https://via.placeholder.com/200" },
    { id: 3, title: "ზურგჩანთა", price: 80, image: "https://via.placeholder.com/200" }
];

let cart = [];

// 1. პროდუქტების გამოჩენა საიტზე
function renderProducts() {
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    products.forEach(product => {
        const cardHTML = `
            <div class="product-card">
                <img src="${product.image}" alt="${product.title}">
                <h3>${product.title}</h3>
                <div class="price">${product.price} ₾</div>
                <button onclick="addToCart(${product.id})">კალათაში დამატება</button>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}

// 2. კალათაში დამატების ფუნქცია
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    cart.push(product);
    updateCartUI();
}

// 3. კალათის განახლება საიტზე
function updateCartUI() {
    // რაოდენობა და ჯამური თანხა
    document.getElementById('cart-count').innerText = cart.length;
    
    const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);
    document.getElementById('cart-total').innerText = totalPrice;

    // კალათის სიის განახლება
    const list = document.getElementById('cart-items-list');
    list.innerHTML = '';
    
    cart.forEach((item, index) => {
        list.innerHTML += `<li>${item.title} - ${item.price} ₾</li>`;
    });
}

// 4. შეკვეთის გაფორმება
function checkout() {
    if (cart.length === 0) {
        alert("კალათა ცარიელია!");
        return;
    }
    
    const total = document.getElementById('cart-total').innerText;
    alert(`გადასახდელი თანხა: ${total} ₾. გადადიხართ გადახდის გვერდზე...`);
    // აქ მიებასება ბანკის გადახდის ბმული ან API
}

// საიტის ჩატვირთვისას გაეშვას პროდუქტების გამოჩენა
renderProducts();