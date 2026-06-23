// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// Настройки связывают приложение с вашим проектом Firebase.
export const firebaseConfig = {
  apiKey: "AIzaSyBq7VCMKkglNA7oc25TyQsOURgGvqF3R5Y",
  authDomain: "payday-76948.firebaseapp.com",
  projectId: "payday-76948",
  storageBucket: "payday-76948.firebasestorage.app",
  messagingSenderId: "945495360740",
  appId: "1:945495360740:web:ef290a0bdbcda1aab958f1",
  measurementId: "G-DTCCXEQ5LB"
};

// Проверяем, что вместо шаблонных значений вставлена настоящая конфигурация.
export const isFirebaseConfigured = !Object.values(firebaseConfig).some(
  (value) => !value || String(value).startsWith("PASTE_"),
);
