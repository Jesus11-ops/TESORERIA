// auth.js — Login
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCQF9uoLyr9M4zI2qM7qBAT-gadYCYJgTw",
  authDomain:        "tesoreria-cf359.firebaseapp.com",
  projectId:         "tesoreria-cf359",
  storageBucket:     "tesoreria-cf359.firebasestorage.app",
  messagingSenderId: "416919952727",
  appId:             "1:416919952727:web:563332e61eb80f396ab212"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

window.login = function () {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const err      = document.getElementById('errorMsg');
  err.style.display = 'none';

  if (!email || !password) {
    err.textContent   = '⚠️ Ingresa correo y contraseña';
    err.style.display = 'block';
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then(() => { window.location.href = 'inicio.html'; })
    .catch(() => {
      err.textContent   = '❌ Correo o contraseña incorrectos';
      err.style.display = 'block';
    });
};