import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // 1. เพิ่มการ import auth

const firebaseConfig = {
  apiKey: "AIzaSyCjllliVHJf6eTn4ebR48U4xUy9HGEdZoo",
  authDomain: "smart-learning-app-18e60.firebaseapp.com",
  projectId: "smart-learning-app-18e60",
  storageBucket: "smart-learning-app-18e60.firebasestorage.app",
  messagingSenderId: "941905984746",
  appId: "1:941905984746:web:eab3f1edb5faf605b3eb93",
  measurementId: "G-XL7WVXDEMC"
};

// ป้องกันการ Initialize ซ้ำซ้อน
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// ส่งตัวแปรออกไปให้ไฟล์อื่นใช้งาน
export const db = getFirestore(app);
export const auth = getAuth(app); // 2. เพิ่มการส่งออก auth