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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// تفعيل العمل بدون إنترنت
db.enablePersistence().catch(err => console.log(err));

// ==========================================
// قسم الكاشير (المنيو والفاتورة)
// ==========================================
let menuItems = [];
let cart = [];
let orderType = 'تيك أواي'; // نوع الطلب الافتراضي

// تحديد نوع الطلب (تيك أواي، صالة، دليفري)
document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        orderType = e.currentTarget.innerText.trim();
    });
});

// سحب المنتجات من Firebase
function fetchMenu() {
    db.collection("menu").onSnapshot((snapshot) => {
        menuItems = [];
        snapshot.forEach((doc) => {
            menuItems.push({ id: doc.id, ...doc.data() });
        });
        renderMenu();
    });
}

// رسم المنتجات في الشاشة
function renderMenu() {
    const menuGrid = document.getElementById('menuGrid');
    menuGrid.innerHTML = '';
    
    if (menuItems.length === 0) {
        menuGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">لا يوجد أصناف. يرجى إضافتها من Firebase.</p>';
        return;
    }

    menuItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.onclick = () => addToCart(item);
        // لو مفيش صورة للمنتج، هنحط مكان رمادي فاضي مؤقتاً
        div.innerHTML = `
            <div class="product-image"></div>
            <div class="product-name">${item.name}</div>
            <div class="product-price"><span>${item.price}</span> <span>ج.م</span></div>
        `;
        menuGrid.appendChild(div);
    });
}

// إضافة للفاتورة
function addToCart(item) {
    const existing = cart.find(c => c.id === item.id);
    if (existing) existing.qty += 1;
    else cart.push({ ...item, qty: 1 });
    updateCartUI();
}

// حذف من الفاتورة
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
}

// تحديث الفاتورة
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
                        <div style="font-weight:bold; color:#334155;">${item.name}</div>
                        <div style="font-size:12px;">${item.qty} x ${item.price} ج.م</div>
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

// إتمام البيع (وإرسال الطلب للمطبخ)
function checkout() {
    if (cart.length === 0) { alert("السلة فارغة!"); return; }

    const orderNumber = Math.floor(100000 + Math.random() * 900000); // رقم عشوائي للطلب
    
    const orderData = {
        orderNumber: "INV-" + orderNumber,
        type: orderType,
        items: cart,
        totalAmount: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
        status: "new", // حالة الطلب: جديد (للمطبخ)
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("orders").add(orderData).then(() => {
        cart = []; updateCartUI();
    }).catch(err => {
        alert("تم الحفظ أوفلاين سيتم الرفع عند عودة الإنترنت");
        cart = []; updateCartUI();
    });
}

// ==========================================
// قسم المطبخ (Kitchen Display System)
// ==========================================

function fetchKitchenOrders() {
    // هنجيب بس الطلبات اللي لسه متسلمتش للعميل
    db.collection("orders")
      .where("status", "in", ["new", "preparing", "ready"])
      .onSnapshot((snapshot) => {
        
        // تفريغ العواميد
        const colNew = document.getElementById('colNew');
        const colPrep = document.getElementById('colPrep');
        const colReady = document.getElementById('colReady');
        
        colNew.innerHTML = ''; colPrep.innerHTML = ''; colReady.innerHTML = '';
        let countNew = 0, countPrep = 0, countReady = 0;

        snapshot.forEach((doc) => {
            const order = { id: doc.id, ...doc.data() };
            
            // تجهيز كارت الطلب
            let itemsHtml = '';
            order.items.forEach(item => {
                itemsHtml += `<div class="order-item-row"><span>${item.name}</span> <span>x${item.qty}</span></div>`;
            });

            // تحديد شكل الزرار بناءً على الحالة
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
                    <div class="order-card-items">
                        ${itemsHtml}
                    </div>
                    ${actionBtn}
                </div>
            `;

            // وضع الكارت في العمود المناسب
            if (order.status === 'new') colNew.innerHTML += cardHtml;
            else if (order.status === 'preparing') colPrep.innerHTML += cardHtml;
            else if (order.status === 'ready') colReady.innerHTML += cardHtml;
        });

        // تحديث العدادات
        document.getElementById('countNew').innerText = countNew;
        document.getElementById('countPrep').innerText = countPrep;
        document.getElementById('countReady').innerText = countReady;

        // لو العواميد فاضية، نحط الرسالة الافتراضية
        if(countNew === 0) colNew.innerHTML = '<div class="empty-column"><i class="fa-solid fa-utensils fa-2x"></i><p>لا توجد طلبات</p></div>';
        if(countPrep === 0) colPrep.innerHTML = '<div class="empty-column"><i class="fa-solid fa-utensils fa-2x"></i><p>لا توجد طلبات</p></div>';
        if(countReady === 0) colReady.innerHTML = '<div class="empty-column"><i class="fa-solid fa-utensils fa-2x"></i><p>لا توجد طلبات</p></div>';
    });
}

// تغيير حالة الطلب في قاعدة البيانات
function changeOrderStatus(orderId, newStatus) {
    db.collection("orders").doc(orderId).update({
        status: newStatus
    }).catch(err => alert("حدث خطأ يرجى التحقق من الاتصال"));
}

// تشغيل الوظائف عند فتح السيستم
fetchMenu();
fetchKitchenOrders();
