// 1. إعدادات PWA (الأوفلاين)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(err => console.log(err)); });
}

// 2. إعدادات Firebase
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
db.enablePersistence().catch(err => console.log(err));

// ==========================================
// المتغيرات العامة
// ==========================================
let menuItems = [];
let cart = [];
let orderType = 'تيك أواي';
let customers = [];

// ==========================================
// قسم الكاشير
// ==========================================
function setOrderType(type, element) {
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    element.classList.add('active');
    orderType = type;
}

function fetchMenu() {
    db.collection("menu").onSnapshot((snapshot) => {
        menuItems = [];
        snapshot.forEach((doc) => { menuItems.push({ id: doc.id, ...doc.data() }); });
        renderMenu(); 
        renderProductsTable(); 
    });
}

function renderMenu() {
    const menuGrid = document.getElementById('menuGrid');
    if(!menuGrid) return;
    menuGrid.innerHTML = '';
    menuItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.onclick = () => addToCart(item);
        div.innerHTML = `<div class="product-image"><i class="fa-solid fa-image"></i></div><div class="product-name">${item.name}</div><div class="product-price"><span>${item.price}</span> <span>ج.م</span></div>`;
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
    if(confirm("هل تريد تفريغ السلة؟")) { cart = []; updateCartUI(); }
}

function updateCartUI() {
    const cartItemsDiv = document.getElementById('cartItems');
    const totalPriceSpan = document.getElementById('totalPrice');
    if(!cartItemsDiv) return;
    cartItemsDiv.innerHTML = '';
    let total = 0;
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p>السلة فارغة</p>';
    } else {
        cart.forEach(item => {
            total += (item.price * item.qty);
            cartItemsDiv.innerHTML += `<div style="width:100%; display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee;"><div><div style="font-weight:bold;">${item.name}</div><div style="font-size:12px;">${item.qty} x ${item.price} ج.م</div></div><i class="fa-solid fa-xmark" style="color:#ef4444; cursor:pointer;" onclick="removeFromCart('${item.id}')"></i></div>`;
        });
    }
    totalPriceSpan.innerText = total.toFixed(2);
}

function checkout() {
    if (cart.length === 0) { alert("السلة فارغة!"); return; }
    const orderData = {
        orderNumber: "INV-" + Math.floor(100000 + Math.random() * 900000),
        type: orderType,
        items: cart,
        totalAmount: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
        status: "new", 
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    db.collection("orders").add(orderData).then((docRef) => {
        if(confirm("تم تسجيل الطلب! هل تود طباعة الفاتورة؟")) { printOrder(orderData); }
        cart = []; updateCartUI();
    }).catch(err => alert("خطأ في الاتصال"));
}

function printOrder(orderData) {
    let itemsHtml = orderData.items.map(i => `<div style="display:flex; justify-content:space-between;"><span>${i.qty} x ${i.name}</span><span>${(i.price * i.qty).toFixed(2)}</span></div>`).join('');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html dir="rtl"><body style="font-family:sans-serif; padding:20px; width:300px;"><h2>Coffee 101</h2><p>فاتورة: ${orderData.orderNumber}</p><hr>${itemsHtml}<hr><h3>الإجمالي: ${orderData.totalAmount.toFixed(2)} ج.م</h3></body></html>`);
    printWindow.document.close();
    printWindow.print();
}

// ==========================================
// قسم المطبخ
// ==========================================
function fetchKitchenOrders() {
    db.collection("orders").where("status", "in", ["new", "preparing", "ready"]).onSnapshot((snapshot) => {
        const colNew = document.getElementById('colNew'), colPrep = document.getElementById('colPrep'), colReady = document.getElementById('colReady');
        if(!colNew) return;
        colNew.innerHTML = ''; colPrep.innerHTML = ''; colReady.innerHTML = '';
        let cN=0, cP=0, cR=0;
        snapshot.forEach((doc) => {
            const order = { id: doc.id, ...doc.data() };
            let itemsHtml = order.items.map(i => `<div class="order-item-row"><span>${i.name}</span> <span>x${i.qty}</span></div>`).join('');
            let btn = order.status === 'new' ? `<button class="order-action-btn btn-start" onclick="changeOrderStatus('${order.id}', 'preparing')">بدء التحضير</button>` : 
                      order.status === 'preparing' ? `<button class="order-action-btn btn-ready" onclick="changeOrderStatus('${order.id}', 'ready')">جاهز للتسليم</button>` :
                      `<button class="order-action-btn btn-deliver" onclick="changeOrderStatus('${order.id}', 'delivered')">تم التسليم</button>`;
            const card = `<div class="order-card"><div class="order-card-header"><span>${order.orderNumber}</span><span>${order.type}</span></div><div class="order-card-items">${itemsHtml}</div>${btn}</div>`;
            if (order.status === 'new') { colNew.innerHTML += card; cN++; }
            else if (order.status === 'preparing') { colPrep.innerHTML += card; cP++; }
            else if (order.status === 'ready') { colReady.innerHTML += card; cR++; }
        });
        document.getElementById('countNew').innerText = cN; document.getElementById('countPrep').innerText = cP; document.getElementById('countReady').innerText = cR;
    });
}

function changeOrderStatus(orderId, newStatus) {
    db.collection("orders").doc(orderId).update({ status: newStatus }).catch(err => alert("خطأ"));
}

// ==========================================
// قسم المنتجات والعملاء
// ==========================================
function renderProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return; 
    tbody.innerHTML = '';
    menuItems.forEach(item => {
        tbody.innerHTML += `<tr><td style="font-weight:bold;">${item.name}</td><td style="text-align:center;">${item.price}</td><td style="text-align:center;">مفعل</td><td style="text-align:center;"><i class="fa-solid fa-trash-can" style="color:#ef4444; cursor:pointer;" onclick="deleteProduct('${item.id}')"></i></td></tr>`;
    });
}

function addNewProduct() {
    const name = prompt("اسم المنتج:");
    const price = prompt("السعر:");
    if (name && price) db.collection("menu").add({ name, price: Number(price) });
}

function deleteProduct(id) {
    if (confirm("حذف المنتج؟")) db.collection("menu").doc(id).delete();
}

function fetchSales() {
    db.collection("orders").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        const tbody = document.getElementById('salesTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        let total = 0;
        snapshot.forEach((doc) => {
            const o = doc.data();
            total += o.totalAmount;
            tbody.innerHTML += `<tr><td>${o.orderNumber}</td><td>${o.timestamp ? o.timestamp.toDate().toLocaleString('ar-EG') : 'الآن'}</td><td>${o.type}</td><td>${o.totalAmount} ج.م</td><td>مكتملة</td></tr>`;
        });
        document.getElementById('totalSalesHeader').innerText = total.toFixed(2) + ' ج.م';
        document.getElementById('totalRevenue').innerText = total.toFixed(2) + ' ج.م';
        document.getElementById('totalOrders').innerText = snapshot.size;
    });
}

function fetchCustomers() {
    db.collection("customers").onSnapshot((snapshot) => {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        snapshot.forEach((doc) => {
            const c = doc.data();
            tbody.innerHTML += `<tr><td style="font-weight:bold;">${c.name}</td><td>${c.phone || '-'}</td><td>${c.address || '-'}</td><td>${c.totalPurchases || 0}</td><td><i class="fa-solid fa-trash-can" style="color:#ef4444; cursor:pointer;" onclick="deleteCustomer('${doc.id}')"></i></td></tr>`;
        });
    });
}

function addNewCustomer() {
    const name = prompt("اسم العميل:");
    if(name) db.collection("customers").add({ name, totalPurchases: 0 });
}

function deleteCustomer(id) {
    if(confirm("حذف العميل؟")) db.collection("customers").doc(id).delete();
}

fetchMenu();
fetchKitchenOrders();
fetchSales();
fetchCustomers();
