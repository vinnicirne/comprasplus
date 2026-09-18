importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAY7VVFotegNS8GlpFY-5DzrDrkQpIG454",
  authDomain: "comprasplus-c2402.firebaseapp.com",
  projectId: "comprasplus-c2402",
  storageBucket: "comprasplus-c2402.firebasestorage.app",
  messagingSenderId: "1052225778682",
  appId: "1:1052225778682:web:96126783cd5407c891ea43"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
