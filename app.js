// ==========================================
// 1. إعدادات PWA (الأوفلاين)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(err => console.log(err)); });
}

// ==========================================
// 2. إعدادات Firebase
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDqxogarptpWWEEP6Ow-Pnt-uyXDOdGGlM",
    authDomain: "angular-polygon-456319-i4.firebaseapp.com",
    projectId: "angular-polygon-456319-i4",
    storageBucket: "angular-polygon-456319-i4.firebasestorage.app",
    messagingSenderId: "330200844981",
    appId: "1:330200844981:web:e63b93f36163fd14c78cfc"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
db.enablePersistence().catch(err => console.log("Offline persistence error:", err));

// ==========================================
// 3. المتغيرات العامة
// ==========================================
let currentUser = null;
let currentBranch = 'main';
let menuItems = [];
let categories = [];
let customers = [];
let pilots = [];
let zones = [];
let cart = [];
let orderType = 'تيك أواي';
let deliveryFee = 0;
let tableCount = 10;

// ==========================================
// 4. نظام تسجيل الدخول والصلاحيات
// ==========================================
const usersDB = {
    "admin": { password: "123", role: "admin", name: "مدير النظام" },
    "cashier": { password: "123", role: "cashier", name: "كاشير 1" },
    "kitchen": { password: "123", role: "kitchen", name: "شيف المطبخ" }
};

function attemptLogin() {
    const user = document.getElementById('loginUsername').value.toLowerCase();
    const pass = document.getElementById('loginPassword').value;
    
    if(usersDB[user] && usersDB[user].password === pass) {
        currentUser = usersDB[user];
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('currentUserName').innerText = currentUser.name;
        
        let roleName = currentUser.role === 'admin' ? 'مدير' : (currentUser.role === 'cashier' ? 'كاشير' : 'مطبخ');
        document.getElementById('currentUserRole').innerText = roleName;
        document.getElementById('currentUserIcon').innerText = currentUser.name.charAt(0);
        
        applyRoles();
        initApp();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

function logout() {
    if(confirm("هل تريد تسجيل الخروج؟")) {
        currentUser = null;
        document.getElementById('loginOverlay').style.display = 'flex';
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
    }
}

function applyRoles() {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        let roleRequired = link.getAttribute('data-role');
        if (currentUser.role === 'admin') {
            link.style.display = 'flex'; 
        } else if (currentUser.role === 'cashier') {
            if(['cashier'].includes(roleRequired)) link.style.display = 'flex';
            else link.style.display = 'none';
        } else if (currentUser.role === 'kitchen') {
            if(['kitchen'].includes(roleRequired)) link.style.display = 'flex';
            else link.style.display = 'none';
        }
    });

    if(currentUser.role === 'kitchen') switchScreen('kitchen', document.querySelector('[onclick="switchScreen(\'kitchen\', this)"]'));
    else switchScreen('cashier', document.querySelector('[onclick="switchScreen(\'cashier\', this)"]'));
}

// ==========================================
// 5. حالة الاتصال والنسخ الاحتياطي (Backup)
// ==========================================
function checkInternetConnection() {
    const syncDot = document.getElementById('syncDot');
    const syncText = document.getElementById('syncText');
    
    if (navigator.onLine) {
        fetch('https://jsonplaceholder.typicode.com/todos/1', { method: 'HEAD', mode: 'no-cors' })
        .then(() => {
            syncDot.className = 'sync-dot online';
            syncText.innerText = 'متصل (مزامنة سحابية نشطة)';
        }).catch(() => {
            syncDot.className = 'sync-dot offline';
            syncText.innerText = 'أوفلاين (جاري الحفظ محلياً)';
        });
    } else {
        syncDot.className = 'sync-dot offline';
        syncText.innerText = 'غير متصل بالإنترنت';
    }
}
setInterval(checkInternetConnection, 5000);
window.addEventListener('online', checkInternetConnection);
window.addEventListener('offline', checkInternetConnection);

// ==========================================
// 6. الفروع والإعدادات
// ==========================================
function changeBranch() {
    currentBranch = document.getElementById('branchSelector').value;
    initApp(); 
}

function loadSettings() {
    db.collection("settings").doc("tables").onSnapshot(doc => {
        if(doc.exists) {
            tableCount = doc.data().count || 10;
            document.getElementById('settingsTableCount').value = tableCount;
            updateTablesUI();
        }
    });

    db.collection("zones").onSnapshot(snapshot => {
        zones = [];
        const tbody = document.getElementById('zonesTableBody');
        const select = document.getElementById('deliveryZoneSelect');
        if(tbody) tbody.innerHTML = '';
        if(select) select.innerHTML = '<option value="" data-fee="0">-- اختر المنطقة (الزون) --</option>';
        
        snapshot.forEach(doc => {
            let z = { id: doc.id, ...doc.data() };
            zones.push(z);
            if(tbody) tbody.innerHTML += `<tr><td>${z.name}</td><td>${z.fee}</td><td><button class="btn-icon btn-delete" onclick="deleteZone('${z.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
            if(select) select.innerHTML += `<option value="${z.name}" data-fee="${z.fee}">${z.name} (+${z.fee} ج)</option>`;
        });
    });
}

function saveTableSettings() {
    let count = parseInt(document.getElementById('settingsTableCount').value);
    if(count > 0) db.collection("settings").doc("tables").set({ count });
}

function addZoneModal() {
    let name = prompt("اسم المنطقة:");
    let fee = prompt("تكلفة الشحن:");
    if(name && fee) db.collection("zones").add({ name, fee: Number(fee) });
}
function deleteZone(id) { if(confirm("حذف المنطقة؟")) db.collection("zones").doc(id).delete(); }

function updateTablesUI() {
    const select = document.getElementById('tableSelect');
    if(!select) return;
    select.innerHTML = '<option value="">-- اختر الترابيزة --</option>';
    for(let i = 1; i <= tableCount; i++) {
        select.innerHTML += `<option value="ترابيزة ${i}">ترابيزة ${i}</option>`;
    }
}

// ==========================================
// 7. المنتجات والأقسام
// ==========================================
function fetchCategories() {
    db.collection("categories").onSnapshot((snapshot) => {
        categories = [];
        const catScroll = document.getElementById('categoriesScroll');
        const catTable = document.getElementById('categoriesTableBody');
        
        if(catScroll) catScroll.innerHTML = '<div class="category-pill active" onclick="filterByCategory(\'الكل\', this)">الكل</div>';
        if(catTable) catTable.innerHTML = '';

        snapshot.forEach((doc) => {
            let c = { id: doc.id, ...doc.data() };
            categories.push(c);
            if(catScroll) catScroll.innerHTML += `<div class="category-pill" onclick="filterByCategory('${c.name}', this)">${c.name}</div>`;
            if(catTable) catTable.innerHTML += `<tr><td>${c.name}</td><td><button class="btn-icon btn-delete" onclick="deleteCategory('${c.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        });
    });
}

function addNewCategory() {
    let name = prompt("اسم القسم:");
    if(name) db.collection("categories").add({ name });
}
function deleteCategory(id) { if(confirm("حذف القسم؟")) db.collection("categories").doc(id).delete(); }

function fetchProducts() {
    db.collection("products").onSnapshot((snapshot) => {
        menuItems = [];
        snapshot.forEach((doc) => { menuItems.push({ id: doc.id, ...doc.data() }); });
        renderMenuGrid('الكل');
        renderProductsTable();
    });
}

function renderMenuGrid(category) {
    const menuGrid = document.getElementById('menuGrid');
    const searchTerm = document.getElementById('searchPos')?.value.toLowerCase() || '';
    if(!menuGrid) return;
    menuGrid.innerHTML = '';
    
    let filtered = menuItems.filter(item => item.status === 'active');
    if(category !== 'الكل') filtered = filtered.filter(item => item.category === category);
    if(searchTerm) filtered = filtered.filter(item => item.name.toLowerCase().includes(searchTerm));

    filtered.forEach(item => {
        menuGrid.innerHTML += `
            <div class="product-card" onclick="addToCart('${item.id}')">
                <div class="product-image"><i class="fa-solid fa-image"></i></div>
                <div class="product-name">${item.name}</div>
                <div class="product-price"><span>${item.price}</span> <span>ج.م</span></div>
            </div>`;
    });
}

function filterByCategory(cat, element) {
    document.querySelectorAll('.category-pill').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    renderMenuGrid(cat);
}
function filterPosProducts() {
    let activeCat = document.querySelector('.category-pill.active').innerText;
    renderMenuGrid(activeCat);
}

function renderProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    const filterStatus = document.getElementById('filterProductStatus')?.value || 'all';
    const search = document.getElementById('searchProductsTable')?.value.toLowerCase() || '';
    if (!tbody) return; 
    tbody.innerHTML = '';
    
    let filtered = menuItems;
    if(filterStatus !== 'all') filtered = filtered.filter(p => p.status === filterStatus);
    if(search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search));

    filtered.forEach(item => {
        let statusBadge = item.status === 'active' ? 
            `<span class="status-badge status-active" onclick="toggleProductStatus('${item.id}', 'inactive')">نشط</span>` : 
            `<span class="status-badge status-inactive" onclick="toggleProductStatus('${item.id}', 'active')">غير نشط</span>`;
            
        tbody.innerHTML += `<tr>
            <td>${item.name}</td>
            <td>${item.category || '-'}</td>
            <td>${item.price}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn-icon btn-edit" onclick="editProduct('${item.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon btn-delete" onclick="deleteProduct('${item.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });
}

function openProductModal() {
    let name = prompt("اسم المنتج:");
    let price = prompt("السعر:");
    let cat = prompt("القسم:");
    if (name && price) db.collection("products").add({ name, price: Number(price), category: cat || '', status: 'active' });
}
function deleteProduct(id) { if (confirm("حذف المنتج نهائياً؟")) db.collection("products").doc(id).delete(); }
function editProduct(id) {
    let p = menuItems.find(x => x.id === id);
    let newPrice = prompt("السعر الجديد:", p.price);
    if(newPrice) db.collection("products").doc(id).update({ price: Number(newPrice) });
}
function toggleProductStatus(id, newStatus) { db.collection("products").doc(id).update({ status: newStatus }); }

// ==========================================
// 8. العملاء
// ==========================================
function fetchCustomers() {
    db.collection("customers").onSnapshot((snapshot) => {
        customers = [];
        snapshot.forEach((doc) => { customers.push({ id: doc.id, ...doc.data() }); });
        renderCustomersTable();
    });
}

function renderCustomersTable() {
    const tbody = document.getElementById('customersTableBody');
    const search = document.getElementById('searchCustomers')?.value.toLowerCase() || '';
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let filtered = customers;
    if(search) filtered = filtered.filter(c => c.name.toLowerCase().includes(search) || c.phone.includes(search));

    filtered.forEach(c => {
        tbody.innerHTML += `<tr>
            <td>${c.name}</td>
            <td>${c.phone || '-'}</td>
            <td>${c.zone || '-'}</td>
            <td>${c.address || '-'}</td>
            <td>
                <button class="btn-icon btn-delete" onclick="deleteCustomer('${c.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });
}

function openCustomerModal() {
    let name = prompt("اسم العميل:");
    let phone = prompt("رقم الهاتف:");
    let address = prompt("العنوان:");
    if(name) db.collection("customers").add({ name, phone, address, totalPurchases: 0 });
}
function deleteCustomer(id) { if(confirm("حذف العميل؟")) db.collection("customers").doc(id).delete(); }

// ==========================================
// 9. الطيارين (الدليفري) وتقاريرهم
// ==========================================
function fetchPilots() {
    db.collection("pilots").onSnapshot((snapshot) => {
        pilots = [];
        const select = document.getElementById('pilotSelect');
        const tbody = document.getElementById('pilotsTableBody');
        if(select) select.innerHTML = '<option value="">-- اختر الطيار --</option>';
        if(tbody) tbody.innerHTML = '';
        
        snapshot.forEach((doc) => {
            let p = { id: doc.id, ...doc.data() };
            pilots.push(p);
            if(select) select.innerHTML += `<option value="${p.id}">${p.name}</option>`;
            if(tbody) {
                let dateStr = p.hireDate ? p.hireDate.toDate().toLocaleDateString('ar-EG') : '-';
                tbody.innerHTML += `<tr>
                    <td>${p.name}</td>
                    <td>${p.phone || '-'}</td>
                    <td>${dateStr}</td>
                    <td>${p.ordersThisMonth || 0}</td>
                    <td><button class="status-badge status-active" onclick="printPilotReport('${p.id}')">طباعة تقرير</button></td>
                    <td><button class="btn-icon btn-delete" onclick="deletePilot('${p.id}')"><i class="fa-solid fa-trash"></i></button></td>
                </tr>`;
            }
        });
    });
}

function openPilotModal() {
    let name = prompt("اسم الطيار:");
    let phone = prompt("رقم الهاتف:");
    if(name) db.collection("pilots").add({ name, phone, hireDate: firebase.firestore.FieldValue.serverTimestamp(), ordersThisMonth: 0 });
}
function deletePilot(id) { if(confirm("حذف الطيار؟")) db.collection("pilots").doc(id).delete(); }

// دالة تقرير الطيار التفصيلية
function printPilotReport(pilotId) {
    let pilot = pilots.find(p => p.id === pilotId);
    if(!pilot) return;

    document.getElementById('reportPilotName').innerHTML = `<i class="fa-solid fa-motorcycle" style="color: #0f766e;"></i> تقرير الطيار: ${pilot.name}`;
    
    db.collection("orders")
      .where("pilotId", "==", pilotId)
      .orderBy("timestamp", "desc")
      .get()
      .then(snapshot => {
          let tbody = document.getElementById('pilotReportBody');
          tbody.innerHTML = '';
          
          let totalOrders = 0;
          let totalDeliveryFees = 0;
          let totalAmount = 0;

          snapshot.forEach(doc => {
              let o = doc.data();
              if(o.status !== 'cancelled') {
                  totalOrders++;
                  totalDeliveryFees += (o.deliveryFee || 0);
                  totalAmount += o.totalAmount;
                  
                  let dateStr = o.timestamp ? o.timestamp.toDate().toLocaleString('ar-EG') : 'الآن';
                  
                  tbody.innerHTML += `<tr>
                      <td>${o.orderNumber}</td>
                      <td>${dateStr}</td>
                      <td>${o.zone || '-'}</td>
                      <td>${o.totalAmount.toFixed(2)} ج.م</td>
                      <td style="color: #0f766e; font-weight: bold;">${(o.deliveryFee || 0).toFixed(2)} ج.م</td>
                  </tr>`;
              }
          });

          if(totalOrders === 0) {
              tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #ef4444;">لا توجد طلبات مسجلة لهذا الطيار حتى الآن.</td></tr>`;
          }

          document.getElementById('reportSummary').innerHTML = `
              <div style="flex:1; background:white; padding:15px; border-radius:8px; text-align:center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                  <div style="color:#64748b; font-size:14px; margin-bottom:5px;">إجمالي الطلبات الموصلة</div>
                  <div style="color:#1e293b; font-size:24px; font-weight:bold;">${totalOrders}</div>
              </div>
              <div style="flex:1; background:white; padding:15px; border-radius:8px; text-align:center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                  <div style="color:#64748b; font-size:14px; margin-bottom:5px;">إجمالي رسوم التوصيل (مستحقات)</div>
                  <div style="color:#0f766e; font-size:24px; font-weight:bold;">${totalDeliveryFees.toFixed(2)} ج.م</div>
              </div>
              <div style="flex:1; background:white; padding:15px; border-radius:8px; text-align:center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                  <div style="color:#64748b; font-size:14px; margin-bottom:5px;">إجمالي قيمة الفواتير</div>
                  <div style="color:#1e293b; font-size:24px; font-weight:bold;">${totalAmount.toFixed(2)} ج.م</div>
              </div>
          `;
          
          document.getElementById('pilotReportModal').style.display = 'flex';
      }).catch(err => {
          console.error("خطأ في جلب تقرير الطيار:", err);
          alert("حدث خطأ أثناء تحميل التقرير، يرجى التأكد من الاتصال بالإنترنت.");
      });
}

function closePilotReport() {
    document.getElementById('pilotReportModal').style.display = 'none';
}

// ==========================================
// 10. الكاشير ونقاط البيع (POS)
// ==========================================
function setOrderType(type, element) {
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    element.classList.add('active');
    orderType = type;
    
    document.getElementById('dineInOptions').classList.remove('active');
    document.getElementById('deliveryOptions').classList.remove('active');
    document.getElementById('deliveryFeeRow').style.display = 'none';
    deliveryFee = 0;

    if(type === 'صالة') document.getElementById('dineInOptions').classList.add('active');
    if(type === 'دليفري') {
        document.getElementById('deliveryOptions').classList.add('active');
        document.getElementById('deliveryFeeRow').style.display = 'flex';
        updateDeliveryFee();
    }
    updateCartUI();
}

function updateDeliveryFee() {
    let select = document.getElementById('deliveryZoneSelect');
    if(select && select.options[select.selectedIndex]) {
        deliveryFee = Number(select.options[select.selectedIndex].getAttribute('data-fee')) || 0;
        document.getElementById('deliveryFeeAmount').innerText = deliveryFee.toFixed(2);
        updateCartUI();
    }
}

function addToCart(productId) {
    let item = menuItems.find(i => i.id === productId);
    let existing = cart.find(c => c.id === item.id);
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
    const subTotalSpan = document.getElementById('subTotal');
    const totalPriceSpan = document.getElementById('totalPrice');
    if(!cartItemsDiv) return;
    
    cartItemsDiv.innerHTML = '';
    let subTotal = 0;
    
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p style="margin-top: 50px;">السلة فارغة</p>';
    } else {
        cart.forEach(item => {
            subTotal += (item.price * item.qty);
            cartItemsDiv.innerHTML += `
                <div style="width:100%; display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
                    <div>
                        <div style="font-weight:bold; font-size:14px; color:#334155;">${item.name}</div>
                        <div style="font-size:12px;">${item.qty} x ${item.price} ج.م</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <b style="color:#0f766e;">${(item.qty * item.price)} ج.م</b>
                        <i class="fa-solid fa-xmark" style="color:#ef4444; cursor:pointer;" onclick="removeFromCart('${item.id}')"></i>
                    </div>
                </div>`;
        });
    }
    
    subTotalSpan.innerText = subTotal.toFixed(2);
    let grandTotal = subTotal + deliveryFee;
    totalPriceSpan.innerText = grandTotal.toFixed(2);
}

function checkout() {
    if (cart.length === 0) { alert("السلة فارغة!"); return; }
    
    let subTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let grandTotal = subTotal + deliveryFee;
    
    let extraData = {};
    if(orderType === 'صالة') {
        let table = document.getElementById('tableSelect').value;
        if(!table) return alert("الرجاء اختيار الترابيزة");
        extraData.table = table;
    } else if (orderType === 'دليفري') {
        let zone = document.getElementById('deliveryZoneSelect').value;
        let pilot = document.getElementById('pilotSelect').value;
        if(!zone) return alert("الرجاء اختيار المنطقة");
        extraData.zone = zone;
        extraData.pilotId = pilot;
        extraData.deliveryFee = deliveryFee;
        extraData.customerPhone = document.getElementById('deliveryCustomerPhone').value;
    }

    const orderData = {
        branch: currentBranch,
        orderNumber: "INV-" + Math.floor(100000 + Math.random() * 900000),
        type: orderType,
        items: cart,
        subTotal: subTotal,
        totalAmount: grandTotal,
        status: "new",
        shiftClosed: false,
        cashierName: currentUser.name,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ...extraData
    };

    db.collection("orders").add(orderData).then((docRef) => {
        if(orderType === 'دليفري' && extraData.pilotId) {
            db.collection("pilots").doc(extraData.pilotId).update({
                ordersThisMonth: firebase.firestore.FieldValue.increment(1)
            });
        }
        
        if(confirm("تم تسجيل الطلب بنجاح! هل تود طباعة الفاتورة؟")) { printOrder(orderData); }
        cart = []; 
        document.getElementById('deliveryCustomerPhone').value = '';
        updateCartUI();
    }).catch(err => alert("خطأ في تسجيل الطلب: " + err.message));
}

function printOrder(o) {
    let itemsHtml = o.items.map(i => `<div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>${i.qty} x ${i.name}</span><span>${(i.price * i.qty).toFixed(2)}</span></div>`).join('');
    let extraHtml = '';
    if(o.type === 'صالة') extraHtml = `<p><b>الترابيزة:</b> ${o.table}</p>`;
    if(o.type === 'دليفري') extraHtml = `<p><b>منطقة:</b> ${o.zone}</p><p><b>خدمة توصيل:</b> ${o.deliveryFee} ج.م</p>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl">
        <body style="font-family:sans-serif; padding:10px; width:280px; font-size:12px; margin:0 auto; text-align:center;">
            <h2 style="margin:5px 0;">اسم المطعم</h2>
            <p style="margin:2px 0;">فرع: ${o.branch === 'main' ? 'الرئيسي' : o.branch}</p>
            <p style="margin:2px 0;">كاشير: ${o.cashierName}</p>
            <p style="margin:5px 0;"><b>فاتورة: ${o.orderNumber}</b></p>
            <p style="margin:2px 0;">النوع: ${o.type}</p>
            ${extraHtml}
            <hr style="border:1px dashed #000;">
            ${itemsHtml}
            <hr style="border:1px dashed #000;">
            <h3 style="margin:5px 0;">الإجمالي الكلي: ${o.totalAmount.toFixed(2)} ج.م</h3>
            <p style="margin-top:15px; font-size:10px;">شكراً لزيارتكم</p>
        </body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}

// ==========================================
// 11. شاشة المطبخ (KDS)
// ==========================================
function fetchKitchenOrders() {
    db.collection("orders").where("status", "in", ["new", "preparing", "ready"]).onSnapshot((snapshot) => {
        const colNew = document.getElementById('colNew'), colPrep = document.getElementById('colPrep'), colReady = document.getElementById('colReady');
        if(!colNew) return;
        colNew.innerHTML = ''; colPrep.innerHTML = ''; colReady.innerHTML = '';
        let cN=0, cP=0, cR=0;
        
        snapshot.forEach((doc) => {
            const order = { id: doc.id, ...doc.data() };
            if(order.branch !== currentBranch && currentUser.role !== 'admin') return; 
            
            let extra = order.type === 'صالة' ? ` (${order.table})` : '';
            let itemsHtml = order.items.map(i => `<div class="order-item-row"><span>${i.name}</span> <span>x${i.qty}</span></div>`).join('');
            
            let btn = order.status === 'new' ? `<button class="order-action-btn btn-start" onclick="changeOrderStatus('${order.id}', 'preparing')">بدء التحضير</button>` : 
                      order.status === 'preparing' ? `<button class="order-action-btn btn-ready" onclick="changeOrderStatus('${order.id}', 'ready')">جاهز للتسليم</button>` :
                      `<button class="order-action-btn btn-deliver" onclick="changeOrderStatus('${order.id}', 'delivered')">تم التسليم</button>`;
                      
            const card = `<div class="order-card">
                            <div class="order-card-header"><span>${order.orderNumber}</span><b>${order.type}${extra}</b></div>
                            <div class="order-card-items">${itemsHtml}</div>
                            ${btn}
                          </div>`;
                          
            if (order.status === 'new') { colNew.innerHTML += card; cN++; }
            else if (order.status === 'preparing') { colPrep.innerHTML += card; cP++; }
            else if (order.status === 'ready') { colReady.innerHTML += card; cR++; }
        });
        
        document.getElementById('countNew').innerText = cN; 
        document.getElementById('countPrep').innerText = cP; 
        document.getElementById('countReady').innerText = cR;
    });
}
function changeOrderStatus(orderId, newStatus) { db.collection("orders").doc(orderId).update({ status: newStatus }); }

// ==========================================
// 12. سجل المبيعات وتقفيل الشيفت
// ==========================================
function fetchSales() {
    db.collection("orders").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        const tbody = document.getElementById('salesTableBody');
        const dashRev = document.getElementById('totalRevenue');
        const dashOrd = document.getElementById('totalOrders');
        
        if (tbody) tbody.innerHTML = '';
        let totalRev = 0; let totalOrd = 0;
        
        let shiftDineIn = 0, shiftTakeaway = 0, shiftDelivery = 0, shiftTotal = 0;

        snapshot.forEach((doc) => {
            const o = doc.data();
            if(o.branch === currentBranch) {
                totalRev += o.totalAmount;
                totalOrd++;
                
                if(!o.shiftClosed && o.status !== 'cancelled') {
                    shiftTotal += o.totalAmount;
                    if(o.type === 'صالة') shiftDineIn += o.totalAmount;
                    if(o.type === 'تيك أواي') shiftTakeaway += o.totalAmount;
                    if(o.type === 'دليفري') shiftDelivery += o.totalAmount;
                }

                if(tbody) {
                    let time = o.timestamp ? o.timestamp.toDate().toLocaleString('ar-EG') : 'الآن';
                    let statusBadge = o.status === 'cancelled' ? '<span style="color:red; font-weight:bold;">ملغي</span>' : '<span style="color:green;">مكتمل</span>';
                    let actionBtn = o.status !== 'cancelled' ? `<button class="btn-icon btn-delete" onclick="cancelOrder('${doc.id}')" title="إلغاء الطلب"><i class="fa-solid fa-ban"></i></button>` : '-';
                    
                    tbody.innerHTML += `<tr>
                        <td>${o.orderNumber}</td>
                        <td>${time}</td>
                        <td>${o.type}</td>
                        <td>${o.totalAmount} ج.م</td>
                        <td>${statusBadge}</td>
                        <td>${actionBtn}</td>
                    </tr>`;
                }
            }
        });
        
        if(dashRev) dashRev.innerText = totalRev.toFixed(2) + ' ج.م';
        if(dashOrd) dashOrd.innerText = totalOrd;

        const shiftSum = document.getElementById('shiftSummary');
        if(shiftSum) {
            shiftSum.innerHTML = `
                <div><h4 style="color:#64748b; margin-bottom:5px;">إجمالي الصالة:</h4><h3 style="margin:0;">${shiftDineIn.toFixed(2)} ج.م</h3></div>
                <div><h4 style="color:#64748b; margin-bottom:5px;">إجمالي التيك أواي:</h4><h3 style="margin:0;">${shiftTakeaway.toFixed(2)} ج.م</h3></div>
                <div><h4 style="color:#64748b; margin-bottom:5px;">إجمالي الدليفري:</h4><h3 style="margin:0;">${shiftDelivery.toFixed(2)} ج.م</h3></div>
                <div><h4 style="color:#10b981; margin-bottom:5px;">إجمالي الوردية (الدرج):</h4><h2 style="margin:0; color:#10b981;">${shiftTotal.toFixed(2)} ج.م</h2></div>
            `;
            shiftSum.setAttribute('data-total', shiftTotal);
        }
    });
}

function cancelOrder(id) {
    if(currentUser.role !== 'admin' && currentUser.role !== 'cashier') return alert("غير مصرح لك");
    if(confirm("تأكيد إلغاء هذا الطلب؟ لن يتم احتسابه في الوردية.")) {
        db.collection("orders").doc(id).update({ status: 'cancelled', totalAmount: 0 });
    }
}

function closeShiftAndPrint() {
    let shiftTotal = document.getElementById('shiftSummary').getAttribute('data-total');
    if(Number(shiftTotal) === 0) return alert("لا يوجد مبيعات مفتوحة في هذه الوردية.");
    
    if(confirm("هل أنت متأكد من إغلاق الوردية؟ سيتم تصفير العداد وبدء وردية جديدة.")) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<html dir="rtl"><body style="font-family:sans-serif; text-align:center;"><h2>تقرير نهاية الوردية (Z-Report)</h2><p>فرع: ${currentBranch}</p><hr>${document.getElementById('shiftSummary').innerHTML}</body></html>`);
        printWindow.document.close();
        printWindow.print();
        
        db.collection("orders").where("branch", "==", currentBranch).where("shiftClosed", "==", false).get().then(snapshot => {
            const batch = db.batch();
            snapshot.forEach(doc => { batch.update(doc.ref, { shiftClosed: true }); });
            batch.commit().then(() => alert("تم إغلاق الوردية بنجاح."));
        });
    }
}

// ==========================================
// تشغيل النظام
// ==========================================
function initApp() {
    checkInternetConnection();
    loadSettings();
    fetchCategories();
    fetchProducts();
    fetchCustomers();
    fetchPilots();
    fetchKitchenOrders();
    fetchSales();
}

window.onload = () => {
    document.getElementById('loginOverlay').style.display = 'flex';
};
