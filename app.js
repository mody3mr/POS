// تشغيل الـ Service Worker عشان السيستم يشتغل أوفلاين
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('تم تشغيل وضع الأوفلاين بنجاح!', registration.scope);
      })
      .catch(err => {
        console.log('حصل مشكلة في تشغيل وضع الأوفلاين:', err);
      });
  });
}
