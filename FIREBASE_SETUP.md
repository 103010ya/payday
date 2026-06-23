# Подключение Firebase

1. Откройте https://console.firebase.google.com/ и создайте проект.
2. Зарегистрируйте в проекте Web App.
3. Скопируйте объект `firebaseConfig` в файл `firebase-config.js`.
4. В разделе Authentication включите способ входа Email/Password.
5. Создайте Cloud Firestore в режиме Production.
6. В Authentication → Settings → Authorized domains добавьте:
   `103010ya.github.io`.
7. Установите Firebase CLI:

   ```bash
   npm install -g firebase-tools
   firebase login
   ```

8. В папке проекта свяжите Firebase CLI с созданным проектом:

   ```bash
   firebase use --add
   ```

9. Опубликуйте правила безопасности:

   ```bash
   firebase deploy --only firestore:rules
   ```

Файлы приложения можно продолжать публиковать через GitHub Pages.
Firebase используется только для регистрации и облачного хранения смен.
