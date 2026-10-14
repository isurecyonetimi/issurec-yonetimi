import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  addDoc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBuoJq_9g_smY0jEhLVyEvB-F2XXBfCJ78",
  authDomain: "is-surec-yonetimi.firebaseapp.com",
  projectId: "is-surec-yonetimi",
  storageBucket: "is-surec-yonetimi.firebasestorage.app",
  messagingSenderId: "713621169836",
  appId: "1:713621169836:web:145f58fa9a63a2ce9be109",
  measurementId: "G-E9MNHXQY8K"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Firebase bağlantıları
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseStorage = storage;

// Firestore temel işlemleri
window.firebaseDoc = doc;
window.firebaseGetDoc = getDoc;
window.firebaseSetDoc = setDoc;
window.firebaseDeleteDoc = deleteDoc;
window.firebaseCollection = collection;
window.firebaseGetDocs = getDocs;
window.firebaseOnSnapshot = onSnapshot;

// Notlar için gereken Firestore işlemleri
window.firebaseAddDoc = addDoc;
window.firebaseQuery = query;
window.firebaseWhere = where;
window.firebaseOrderBy = orderBy;

// Mevcut iş kayıtları koleksiyonu
window.firebaseWorkRecordCollection = 'workRecords';

// Firebase Authentication
window.firebaseSignIn = signInWithEmailAndPassword;
window.firebaseCreateUser = createUserWithEmailAndPassword;
window.firebaseUpdatePassword = updatePassword;
window.firebaseReauthenticate = reauthenticateWithCredential;
window.firebaseEmailAuthProvider = EmailAuthProvider;

export {
  app,
  auth,
  db,
  storage
};