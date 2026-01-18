// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB02LqVRfCslDa7ZjXHyrs0jNfZk4Ojjtk",
    authDomain: "chatmulticanal.firebaseapp.com",
    projectId: "chatmulticanal",
    storageBucket: "chatmulticanal.firebasestorage.app",
    messagingSenderId: "225232415110",
    appId: "1:225232415110:web:1e5803cac2682675e16407"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
