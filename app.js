// 1. إعدادات PWA (الأوفلاين)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
    });
}

// 2. إعدادات Firebase الخاصة بمشروعك
const firebaseConfig = {
    apiKey: "AIzaSyDqxogarptpWWEEP6Ow-Pnt-uyXDOdGGlM",
    authDomain: "angular-polygon-456319-i4.firebaseapp.com",
    projectId: "angular-polygon-456319-i4",
    storageBucket: "angular-polygon-456319-i4.firebasestorage.app",
    messagingSenderId: "330200844981",
    appId: "1:330200844981:web:e63b93f36163fd14c78cfc"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// تفعيل العمل بدون إنترنت
db.enablePersistence().catch(err => console.log(err));

// ==========================================
// المتغيرات العامة
// ==========================================
let menuItems = [];
let cart = [];
let orderType = 'تيك أواي';

// ==========================================
// قسم الكاشير (المنيو والفاتورة)
// ==========================================

function setOrderType(type, element) {
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    element.classList.add('active');
    orderType = type;
}

// سحب المنتجات من Firebase وتحديث شاشة الكاشير والمنتجات معاً
function fetchMenu() {
    db.collection("menu").onSnapshot((snapshot) => {
        menuItems = [];
        snapshot.forEach((doc) => {
            menuItems.push({ id: doc.id, ...doc.data() });
        });
        renderMenu(); // تحديث شاشة الكاشير
        renderProductsTable(); // تحديث جدول شاشة المنتجات
    });
}

function renderMenu() {
    const menuGrid = document.getElementById('menuGrid');
    menuGrid.innerHTML = '';
    
    if (menuItems.length === 0) {
        menuGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#94a3b8;">لا يوجد أصناف حالياً.</p>';
        return;
    }

    menuItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.onclick = () => addToCart(item);
        div.innerHTML = `
            <div class="product-image"><i class="fa-solid fa-image fa-2x"></i></div>
            <div class="product-name">${item.name}</div>
            <div class="product-price"><span>${item.price}</span> <span>ج.م</span></div>
        `;
        menuGrid.appendChild(div);
    });
}

function addToCart(item) {
    const existing = cart.find(c => c.id === item.id);
    if (existing) existing.qty += 1;
    else cart.push({ ...item, qty: 1 });
    updateCartUI();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
}

function clearCart() {
    if(confirm("هل تريد تفريغ السلة؟")) {
        cart = [];
        updateCartUI();
    }
}

function updateCartUI() {
    const cartItemsDiv = document.getElementById('cartItems');
    const totalPriceSpan = document.getElementById('totalPrice');
    
    cartItemsDiv.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<i class="fa-solid fa-cart-shopping" style="font-size:40px; margin-bottom:10px; opacity:0.5;"></i><p>السلة فارغة</p>';
    } else {
        cart.forEach(item => {
            const itemTotal = item.price * item.qty;
            total += itemTotal;
            cartItemsDiv.innerHTML += `
                <div style="width:100%; display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
                    <div>
                        <div style="font-weight:bold; color:#334155; font-size:14px;">${item.name}</div>
                        <div style="font-size:12px; color:#64748b;">${item.qty} x ${item.price} ج.م</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-weight:bold; color:#0f766e;">${itemTotal}</span>
                        <i class="fa-solid fa-xmark" style="color:#ef4444; cursor:pointer;" onclick="removeFromCart('${item.id}')"></i>
                    </div>
                </div>
            `;
        });
    }
    totalPriceSpan.innerText = total.toFixed(2);
}

function checkout() {
    if (cart.length === 0) { alert("السلة فارغة!"); return; }

    const orderNumber = Math.floor(100000 + Math.random() * 900000);
    
    const orderData = {
        orderNumber: "INV-" + orderNumber,
        type: orderType,
        items: cart,
        totalAmount: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
        status: "new", 
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("orders").add(orderData).then(() => {
        cart = []; updateCartUI();
    }).catch(err => {
        alert("تم الحفظ محلياً.. سيتم الرفع عند عودة الإنترنت");
        cart = []; updateCartUI();
    });
}

// ==========================================
// قسم المطبخ (Kitchen Display System)
// ==========================================

function fetchKitchenOrders() {
    db.collection("orders")
      .where("status", "in", ["new", "preparing", "ready"])
      .onSnapshot((snapshot) => {
        
        const colNew = document.getElementById('colNew');
        const colPrep = document.getElementById('colPrep');
        const colReady = document.getElementById('colReady');
        
        colNew.innerHTML = ''; colPrep.innerHTML = ''; colReady.innerHTML = '';
        let countNew = 0, countPrep = 0, countReady = 0;

        snapshot.forEach((doc) => {
            const order = { id: doc.id, ...doc.data() };
            
            let itemsHtml = '';
            order.items.forEach(item => {
                itemsHtml += `<div class="order-item-row"><span>${item.name}</span> <span>x${item.qty}</span></div>`;
            });

            let actionBtn = '';
            if (order.status === 'new') {
                actionBtn = `<button class="order-action-btn btn-start" onclick="changeOrderStatus('${order.id}', 'preparing')">بدء التحضير</button>`;
                countNew++;
            } else if (order.status === 'preparing') {
                actionBtn = `<button class="order-action-btn btn-ready" onclick="changeOrderStatus('${order.id}', 'ready')">جاهز للتسليم</button>`;
                countPrep++;
            } else if (order.status === 'ready') {
                actionBtn = `<button class="order-action-btn btn-deliver" onclick="changeOrderStatus('${order.id}', 'delivered')"><i class="fa-solid fa-check"></i> تم التسليم</button>`;
                countReady++;
            }

            const cardHtml = `
                <div class="order-card">
                    <div class="order-card-header">
                        <span>${order.orderNumber}</span>
                        <span style="color:#0f766e; font-weight:bold;"><i class="fa-solid fa-bell"></i> ${order.type}</span>
                    </div>
                    <div class="order-card-items">${itemsHtml}</div>
                    ${actionBtn}
                </div>
            `;

            if (order.status === 'new') colNew.innerHTML += cardHtml;
            else if (order.status === 'preparing') colPrep.innerHTML += cardHtml;
            else if (order.status === 'ready') colReady.innerHTML += cardHtml;
        });

        document.getElementById('countNew').innerText = countNew;
        document.getElementById('countPrep').innerText = countPrep;
        document.getElementById('countReady').innerText = countReady;

        if(countNew === 0) colNew.innerHTML = '<div class="empty-column"><i class="fa-solid fa-utensils fa-2x"></i><p>لا توجد طلبات</p></div>';
        if(countPrep === 0) colPrep.innerHTML = '<div class="empty-column"><i class="fa-solid fa-utensils fa-2x"></i><p>لا توجد طلبات</p></div>';
        if(countReady === 0) colReady.innerHTML = '<div class="empty-column"><i class="fa-solid fa-utensils fa-2x"></i><p>لا توجد طلبات</p></div>';
    });
}

function changeOrderStatus(orderId, newStatus) {
    db.collection("orders").doc(orderId).update({
        status: newStatus
    }).catch(err => alert("حدث خطأ يرجى التحقق من الاتصال"));
}

// ==========================================
// قسم إدارة المنتجات
// ==========================================

function renderProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return; 
    
    tbody.innerHTML = '';
    if (menuItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">لا توجد منتجات حالياً</td></tr>';
        return;
    }

    menuItems.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td style="font-weight: bold; text-align: right;">${item.name}</td>
                <td style="color: #0f766e; font-weight: bold; text-align: center;">${item.price} ج.م</td>
                <td style="text-align: center;"><span style="background: #dcfce7; color: #15803d; padding: 5px 15px; border-radius: 15px; font-size: 12px;">مفعل</span></td>
                <td style="text-align: center;">
                    <i class="fa-solid fa-trash-can" style="color: #ef4444; cursor: pointer;" onclick="deleteProduct('${item.id}')"></i>
                </td>
            </tr>
        `;
    });
}

function addNewProduct() {
    const name = prompt("أدخل اسم المنتج الجديد:");
    if (!name) return;
    
    const price = prompt("أدخل سعر المنتج:");
    if (!price || isNaN(price)) {
        alert("سعر غير صحيح!");
        return;
    }

    db.collection("menu").add({
        name: name,
        price: Number(price)
    }).then(() => {
        alert("تم إضافة المنتج بنجاح!");
    }).catch(err => alert("تم الحفظ محلياً.. سيتم الرفع عند توفر الإنترنت."));
}

function deleteProduct(id) {
    if (confirm("هل أنت متأكد من حذف هذا المنتج نهائياً؟")) {
        db.collection("menu").doc(id).delete();
    }
}

// ==========================================
// التشغيل التلقائي عند فتح التطبيق
// ==========================================
fetchMenu();
fetchKitchenOrders();
