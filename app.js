// [الـ PWA والـ Firebase هيتسابوا زي ما هما في أول الملف]
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(err => console.log(err)); });
}

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
// قسم سجل المبيعات (جديد)
// ==========================================
function fetchSales() {
    db.collection("orders")
      .orderBy("timestamp", "desc")
      .onSnapshot((snapshot) => {
        const tbody = document.getElementById('salesTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        let totalCash = 0;

        snapshot.forEach((doc) => {
            const order = doc.data();
            const date = order.timestamp ? order.timestamp.toDate().toLocaleString('ar-EG') : 'قريباً...';
            
            // حساب الإيرادات (بفرض أن الطلبات الحالية نقدي)
            totalCash += order.totalAmount;

            tbody.innerHTML += `
                <tr>
                    <td style="padding:15px;">${order.orderNumber}</td>
                    <td style="padding:15px;">${date}</td>
                    <td style="padding:15px;">${order.type}</td>
                    <td style="padding:15px; font-weight:bold;">${order.totalAmount} ج.م</td>
                    <td style="padding:15px;"><span style="color:#15803d; font-weight:bold;">مكتملة</span></td>
                </tr>
            `;
        });
        document.getElementById('totalSalesHeader').innerText = totalCash.toFixed(2) + ' ج.م';
    });
}

// ==========================================
// استدعاء الوظائف (بما فيها السجل)
// ==========================================
fetchMenu();
fetchKitchenOrders();
fetchSales(); 
// [باقي الدوال القديمة (renderMenu, addToCart, checkout, etc..) تفضل موجودة زي ما هي]
