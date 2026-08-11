// 1. تشغيل وضع الأوفلاين
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
    });
}

// 2. بيانات الأصناف (مؤقتاً لحد ما نربط بـ Firebase)
const menuItems = [
    { id: 1, name: 'برجر لحم', price: 120 },
    { id: 2, name: 'برجر دجاج', price: 90 },
    { id: 3, name: 'بيتزا مارجريتا', price: 150 },
    { id: 4, name: 'بيتزا بيبروني', price: 180 },
    { id: 5, name: 'بطاطس مقلية', price: 35 },
    { id: 6, name: 'كولا', price: 20 },
    { id: 7, name: 'عصير برتقال', price: 40 },
    { id: 8, name: 'قهوة اسبريسو', price: 30 }
];

let cart = [];

// 3. رسم الأصناف في الشاشة
function renderMenu() {
    const menuGrid = document.getElementById('menuGrid');
    menuGrid.innerHTML = '';
    
    menuItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'menu-item';
        div.onclick = () => addToCart(item);
        div.innerHTML = `
            <h4>${item.name}</h4>
            <p>${item.price} ج.م</p>
        `;
        menuGrid.appendChild(div);
    });
}

// 4. إضافة صنف للفاتورة
function addToCart(item) {
    // التحقق لو الصنف موجود نزود الكمية، لو مش موجود نضيفه
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({ ...item, qty: 1 });
    }
    updateCartUI();
}

// 5. حذف صنف من الفاتورة
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
}

// 6. تحديث شاشة الفاتورة وحساب الإجمالي
function updateCartUI() {
    const cartItemsDiv = document.getElementById('cartItems');
    const totalPriceSpan = document.getElementById('totalPrice');
    
    cartItemsDiv.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p style="color: gray; text-align: center; margin-top: 50px;">لم يتم إضافة أصناف</p>';
    } else {
        cart.forEach(item => {
            const itemTotal = item.price * item.qty;
            total += itemTotal;
            
            const row = document.createElement('div');
            row.className = 'cart-row';
            row.innerHTML = `
                <div>
                    <strong>${item.name}</strong> <br>
                    <small>${item.qty} x ${item.price} ج.م</small>
                </div>
                <div>
                    <span style="font-weight:bold; margin-left:10px;">${itemTotal} ج.م</span>
                    <button onclick="removeFromCart(${item.id})">X</button>
                </div>
            `;
            cartItemsDiv.appendChild(row);
        });
    }

    totalPriceSpan.innerText = total;
}

// 7. زر طباعة الفاتورة (مبدئي)
function printInvoice() {
    if (cart.length === 0) {
        alert("الفاتورة فارغة!");
        return;
    }
    alert("تم تأكيد الطلب بنجاح! سيتم تفريغ الفاتورة الآن.");
    cart = [];
    updateCartUI();
}

// تشغيل دالة رسم الأصناف أول ما الصفحة تحمل
renderMenu();
