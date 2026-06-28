import {
  firebaseConfig,
  isFirebaseConfigured,
} from "./firebase-config.js";

let auth = null;
let db = null;
let firebaseAuth;
let firestore;
let firebaseReadyPromise = null;

async function ensureFirebaseReady() {
  if (!isFirebaseConfigured) {
    return false;
  }

  if (auth && db) {
    return true;
  }

  if (!firebaseReadyPromise) {
    firebaseReadyPromise = (async () => {
      // Firebase загружается лениво: сначала приложение показывает локальные данные,
      // а сеть подключается в фоне только когда нужна авторизация или синхронизация.
      const [firebaseApp, loadedFirebaseAuth, loadedFirestore] =
        await Promise.all([
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

      return true;
    })();
  }

  return firebaseReadyPromise;
}

export { isFirebaseConfigured };

export function observeAuthState(callback) {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }

  let unsubscribe = () => {};
  let isActive = true;

  ensureFirebaseReady()
    .then((isReady) => {
      if (!isReady || !isActive) {
        return;
      }

      unsubscribe = firebaseAuth.onAuthStateChanged(auth, callback);
    })
    .catch((error) => {
      console.error("Не удалось загрузить Firebase:", error);
    });

  return () => {
    isActive = false;
    unsubscribe();
  };
}

export async function registerAccount(name, email, password) {
  await ensureFirebaseReady();

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
  await ensureFirebaseReady();

  const credential = await firebaseAuth.signInWithEmailAndPassword(
    auth,
    email,
    password,
  );
  return credential.user;
}

export async function logoutAccount() {
  await ensureFirebaseReady();

  return firebaseAuth.signOut(auth);
}

export async function resetAccountPassword(email) {
  await ensureFirebaseReady();

  return firebaseAuth.sendPasswordResetEmail(auth, email);
}

export async function loadCloudShifts(userId) {
  await ensureFirebaseReady();

  const snapshot = await firestore.getDocs(
    firestore.collection(db, "users", userId, "shifts"),
  );

  return snapshot.docs.map((shiftDocument) => shiftDocument.data());
}

export async function saveCloudShift(userId, shift) {
  await ensureFirebaseReady();

  return firestore.setDoc(
    firestore.doc(db, "users", userId, "shifts", shift.date),
    {
      id: shift.id,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      lunchBreakMinutes: Number(shift.lunchBreakMinutes) || 0,
      dinnerBreakMinutes: Number(shift.dinnerBreakMinutes) || 0,
      updatedAt: firestore.serverTimestamp(),
    },
  );
}

export async function deleteCloudShift(userId, shiftDate) {
  await ensureFirebaseReady();

  return firestore.deleteDoc(
    firestore.doc(db, "users", userId, "shifts", shiftDate),
  );
}

export async function uploadCloudShifts(userId, shifts) {
  await ensureFirebaseReady();

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
      lunchBreakMinutes: Number(shift.lunchBreakMinutes) || 0,
      dinnerBreakMinutes: Number(shift.dinnerBreakMinutes) || 0,
      updatedAt: firestore.serverTimestamp(),
    });
  });

  await batch.commit();
}
