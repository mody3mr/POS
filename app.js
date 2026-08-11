// 1. تشغيل وضع الأوفلاين PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
    });
}

// 2. إعدادات Firebase (بيانات مشروعك الحقيقية)
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

// تفعيل ميزة العمل بدون إنترنت (Offline Persistence) في قاعدة البيانات
db.enablePersistence()
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          console.log('ميزة الأوفلاين شغالة في تاب واحدة بس');
      } else if (err.code == 'unimplemented') {
          console.log('المتصفح لا يدعم الأوفلاين');
      }
  });

let menuItems = [];
let cart = [];

// 3. سحب الأصناف من قاعدة البيانات لحظياً
function fetchMenu() {
    // هنستمع لأي تغيير في جدول "menu"
    db.collection("menu").onSnapshot((snapshot) => {
        menuItems = [];
        snapshot.forEach((doc) => {
            menuItems.push({ id: doc.id, ...doc.data() });
        });
        renderMenu();
    });
}

// 4. رسم الأصناف في الشاشة
function renderMenu() {
    const menuGrid = document.getElementById('menuGrid');
    menuGrid.innerHTML = '';
    
    if (menuItems.length === 0) {
        menuGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">لا يوجد أصناف مضافة حالياً. يرجى إضافتها من Firebase.</p>';
        return;
    }

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

// 5. التحكم في الفاتورة
function addToCart(item) {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({ ...item, qty: 1 });
    }
    updateCartUI();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
}

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
                    <button onclick="removeFromCart('${item.id}')">X</button>
                </div>
            `;
            cartItemsDiv.appendChild(row);
        });
    }
    totalPriceSpan.innerText = total;
}

// 6. تأكيد الطلب وحفظه في Firebase
function checkout() {
    if (cart.length === 0) {
        alert("الفاتورة فارغة!");
        return;
    }

    const orderData = {
        items: cart,
        totalAmount: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        status: "completed"
    };

    // حفظ الفاتورة في جدول "orders"
    db.collection("orders").add(orderData)
        .then(() => {
            alert("تم تسجيل الفاتورة بنجاح!");
            cart = [];
            updateCartUI();
        })
        .catch((error) => {
            // لو النت فاصل، هتتحفظ محلياً وتترفع أول ما النت يرجع
            alert("تم حفظ الفاتورة محلياً وسيتم رفعها عند عودة الإنترنت.");
            cart = [];
            updateCartUI();
        });
}

// تشغيل سحب الأصناف أول ما الصفحة تحمل
fetchMenu();
