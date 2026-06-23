import {
  firebaseConfig,
  isFirebaseConfigured,
} from "./firebase-config.js";

let auth = null;
let db = null;
let firebaseAuth;
let firestore;

if (isFirebaseConfigured) {
  // Загружаем Firebase только после заполнения конфигурации.
  // Благодаря этому локальная версия продолжает работать без Firebase и сети.
  const [firebaseApp, loadedFirebaseAuth, loadedFirestore] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js"),
  ]);

  firebaseAuth = loadedFirebaseAuth;
  firestore = loadedFirestore;

  const app = firebaseApp.initializeApp(firebaseConfig);
  auth = firebaseAuth.getAuth(app);
  db = firestore.getFirestore(app);
  await firebaseAuth.setPersistence(
    auth,
    firebaseAuth.browserLocalPersistence,
  );
}

export { isFirebaseConfigured };

export function observeAuthState(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }

  return firebaseAuth.onAuthStateChanged(auth, callback);
}

export async function registerAccount(name, email, password) {
  const credential = await firebaseAuth.createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );

  await firebaseAuth.updateProfile(credential.user, { displayName: name });
  await firestore.setDoc(firestore.doc(db, "users", credential.user.uid), {
    name,
    email,
    createdAt: firestore.serverTimestamp(),
  });

  return credential.user;
}

export async function loginAccount(email, password) {
  const credential = await firebaseAuth.signInWithEmailAndPassword(
    auth,
    email,
    password,
  );
  return credential.user;
}

export function logoutAccount() {
  return firebaseAuth.signOut(auth);
}

export function resetAccountPassword(email) {
  return firebaseAuth.sendPasswordResetEmail(auth, email);
}

export async function loadCloudShifts(userId) {
  const snapshot = await firestore.getDocs(
    firestore.collection(db, "users", userId, "shifts"),
  );

  return snapshot.docs.map((shiftDocument) => shiftDocument.data());
}

export function saveCloudShift(userId, shift) {
  return firestore.setDoc(
    firestore.doc(db, "users", userId, "shifts", shift.date),
    {
      id: shift.id,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      updatedAt: firestore.serverTimestamp(),
    },
  );
}

export function deleteCloudShift(userId, shiftDate) {
  return firestore.deleteDoc(
    firestore.doc(db, "users", userId, "shifts", shiftDate),
  );
}

export async function uploadCloudShifts(userId, shifts) {
  if (shifts.length === 0) {
    return;
  }

  const batch = firestore.writeBatch(db);

  shifts.forEach((shift) => {
    batch.set(firestore.doc(db, "users", userId, "shifts", shift.date), {
      id: shift.id,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      updatedAt: firestore.serverTimestamp(),
    });
  });

  await batch.commit();
}
