// auth.js — Login + Registro (máximo 1 usuario)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const db   = getFirestore(app);

// ── Alternar formularios ────────────────────────────────────
window.mostrarRegistro = function () {
  document.getElementById('formLogin').style.display    = 'none';
  document.getElementById('formRegistro').style.display = 'block';
  document.getElementById('tabLogin').classList.remove('activo');
  document.getElementById('tabRegistro').classList.add('activo');
  limpiarError();
};

window.mostrarLogin = function () {
  document.getElementById('formRegistro').style.display = 'none';
  document.getElementById('formLogin').style.display    = 'block';
  document.getElementById('tabRegistro').classList.remove('activo');
  document.getElementById('tabLogin').classList.add('activo');
  limpiarError();
};

// ── Login ───────────────────────────────────────────────────
window.login = function () {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    mostrarError('⚠️ Ingresa correo y contraseña'); return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then(() => { window.location.href = 'panel.html'; })
    .catch(e => {
      const msg =
        e.code === 'auth/invalid-credential' ||
        e.code === 'auth/user-not-found'     ||
        e.code === 'auth/wrong-password'
          ? '❌ Correo o contraseña incorrectos'
          : '❌ Error: ' + e.message;
      mostrarError(msg);
    });
};

// ── Registro (máximo 1 usuario) ─────────────────────────────
window.registrar = async function () {
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  if (!email || !password) {
    mostrarError('⚠️ Ingresa correo y contraseña'); return;
  }
  if (password.length < 6) {
    mostrarError('⚠️ La contraseña debe tener al menos 6 caracteres'); return;
  }

  const btn = document.getElementById('btnRegistrar');
  btn.disabled    = true;
  btn.textContent = 'Verificando...';

  try {
    // Revisar si ya hay un usuario registrado en Firestore
    const snap = await getDocs(collection(db, 'usuarios'));
    if (!snap.empty) {
      btn.disabled    = false;
      btn.textContent = '✅ Crear Cuenta';
      mostrarError('🚫 Ya existe un usuario registrado. Solo se permite uno.');
      return;
    }
  } catch (e) {
    // Si no se puede leer Firestore, bloquear por seguridad
    btn.disabled    = false;
    btn.textContent = '✅ Crear Cuenta';
    mostrarError('❌ No se pudo verificar el registro: ' + e.message);
    return;
  }

  btn.textContent = 'Creando cuenta...';

  createUserWithEmailAndPassword(auth, email, password)
    .then(async (cred) => {
      // Guardar registro del usuario en Firestore
      const { setDoc, doc } = await import(
        "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
      );
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        email:     cred.user.email,
        creadoEn:  new Date().toISOString()
      });
      window.location.href = 'panel.html';
    })
    .catch(e => {
      btn.disabled    = false;
      btn.textContent = '✅ Crear Cuenta';
      const msg =
        e.code === 'auth/email-already-in-use' ? '❌ Ese correo ya está registrado' :
        e.code === 'auth/invalid-email'         ? '❌ Correo inválido' :
                                                  '❌ Error: ' + e.message;
      mostrarError(msg);
    });
};

// ── Utilidades ──────────────────────────────────────────────
function mostrarError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent   = msg;
  el.style.display = 'block';
}

function limpiarError() {
  const el = document.getElementById('errorMsg');
  el.textContent   = '';
  el.style.display = 'none';
}