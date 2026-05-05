import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'


const firebaseConfig = {
  apiKey: "AIzaSyA8PonWLkePKV8GljOJSvMcwPb_NpLMHvs",
  authDomain: "blockpoll-70ca1.firebaseapp.com",
  projectId: "blockpoll-70ca1",
  storageBucket: "blockpoll-70ca1.firebasestorage.app",
  messagingSenderId: "478452299296",
  appId: "1:478452299296:web:c1297dc593006ee6e36e45"
};

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
