// app.js — Lógica principal votos
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore, collection, query, orderBy,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCQF9uoLyr9M4zI2qM7qBAT-gadYCYJgTw",
  authDomain:        "tesoreria-cf359.firebaseapp.com",
  projectId:         "tesoreria-cf359",
  storageBucket:     "tesoreria-cf359.firebasestorage.app",
  messagingSenderId: "416919952727",
  appId:             "1:416919952727:web:563332e61eb80f396ab212"
};

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

let feligreses   = [];
let filtroActual = 'todos';
let tipoVoto     = 'personal';
let yaPago       = false;

window.__getFeligreses = () => feligreses;

// ── Auth guard ──────────────────────────────────────────────
onAuthStateChanged(auth, user => {
  if (!user) { window.location.href = 'index.html'; return; }
  document.getElementById('userEmail').textContent = user.email;
  cargarFeligreses();
});

// ── Cargar en tiempo real ───────────────────────────────────
function cargarFeligreses() {
  const q = query(collection(db, 'feligreses'), orderBy('creadoEn', 'desc'));
  onSnapshot(q, snap => {
    feligreses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderResumen();
    renderLista();
  });
}

// ── Selector tipo de voto ───────────────────────────────────
window.setTipoVoto = function (tipo) {
  tipoVoto = tipo;
  document.getElementById('tabPersonal').classList.toggle('activo',  tipo === 'personal');
  document.getElementById('tabDirectiva').classList.toggle('activo', tipo === 'directiva');
  document.getElementById('campoNombre').style.display    = tipo === 'personal'  ? '' : 'none';
  document.getElementById('campoDirectiva').style.display = tipo === 'directiva' ? '' : 'none';
  // Limpiar campos al cambiar
  document.getElementById('nombre').value    = '';
  document.getElementById('directiva').value = '';
};

// ── Toggle pagado ───────────────────────────────────────────
window.togglePagado = function () {
  const chk = document.getElementById('yaPago');
  const row = document.getElementById('checkPagRow');
  const lbl = document.getElementById('checkPagLabel');
  yaPago = !yaPago;
  chk.checked = yaPago;
  row.classList.toggle('activo', yaPago);
  lbl.textContent = yaPago ? '✅ Ya realizó el pago' : '¿Ya realizó el pago?';
};

// ── Guardar nuevo voto ──────────────────────────────────────
window.guardarFeligres = async function () {
  const valorRaw  = document.getElementById('valor').value.replace(/\D/g, '');
  const valor     = parseInt(valorRaw) || 0;

  if (!valor) { toast('⚠️ Ingresa un valor válido', true); return; }

  let nombre, directiva;

  if (tipoVoto === 'personal') {
    nombre = document.getElementById('nombre').value.trim();
    if (!nombre) { toast('⚠️ Ingresa el nombre', true); return; }
    directiva = '';
  } else {
    directiva = document.getElementById('directiva').value.trim();
    if (!directiva) { toast('⚠️ Ingresa el nombre de la directiva', true); return; }
    nombre = directiva; // El nombre guardado es el de la directiva
  }

  try {
    await addDoc(collection(db, 'feligreses'), {
      Nombre:    nombre,
      Valor:     valor,
      Directiva: directiva,
      tipo:      tipoVoto,
      pagado:    yaPago,
      creadoEn:  serverTimestamp()
    });
    limpiarForm();
    toast('✅ Voto registrado correctamente');
  } catch (e) {
    toast('❌ Error al guardar: ' + e.message, true);
  }
};

// ── Limpiar formulario ──────────────────────────────────────
window.limpiarForm = function () {
  document.getElementById('nombre').value    = '';
  document.getElementById('valor').value     = '';
  document.getElementById('directiva').value = '';
  if (yaPago) window.togglePagado();
  setTipoVoto('personal');
};

// ── Toggle pago registro existente ─────────────────────────
window.togglePago = async function (id, pagadoActual) {
  try {
    await updateDoc(doc(db, 'feligreses', id), { pagado: !pagadoActual });
    toast(pagadoActual ? '↩️ Marcado como pendiente' : '✅ Pago registrado');
  } catch { toast('❌ Error al actualizar', true); }
};

// ── Eliminar ────────────────────────────────────────────────
window.eliminarFeligres = async function (id, nombre) {
  if (!confirm(`¿Eliminar el voto de "${nombre}"?\nEsta acción no se puede deshacer.`)) return;
  try {
    await deleteDoc(doc(db, 'feligreses', id));
    toast('🗑️ Eliminado');
  } catch { toast('❌ Error al eliminar', true); }
};

// ══════════════════════════════════════════════════════════════
// MODAL DE EDICIÓN
// ══════════════════════════════════════════════════════════════
window.abrirModal = function (id) {
  const f = feligreses.find(x => x.id === id);
  if (!f) return;

  document.getElementById('editId').value        = id;
  document.getElementById('editValor').value     = f.Valor || '';

  const tipo = f.tipo || (f.Directiva ? 'directiva' : 'personal');
  setEditTipo(tipo);

  if (tipo === 'personal') {
    document.getElementById('editNombre').value    = f.Nombre || '';
  } else {
    document.getElementById('editDirectiva').value = f.Directiva || '';
  }

  const chkP = document.getElementById('editPagado');
  const rowP = document.getElementById('editPagRow');
  const lblP = document.getElementById('editPagLabel');
  chkP.checked = !!f.pagado;
  rowP.classList.toggle('activo', !!f.pagado);
  lblP.textContent = f.pagado ? '✅ Ya realizó el pago' : '¿Ya realizó el pago?';

  document.getElementById('modalOverlay').style.display = 'flex';
};

window.cerrarModal = function (e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').style.display = 'none';
};

window.setEditTipo = function (tipo) {
  document.getElementById('editTabPersonal').classList.toggle('activo',  tipo === 'personal');
  document.getElementById('editTabDirectiva').classList.toggle('activo', tipo === 'directiva');
  document.getElementById('editCampoNombre').style.display    = tipo === 'personal'  ? '' : 'none';
  document.getElementById('editCampoDirectiva').style.display = tipo === 'directiva' ? '' : 'none';
  document.getElementById('editNombre').value    = '';
  document.getElementById('editDirectiva').value = '';
};

window.toggleEditPago = function () {
  const chk  = document.getElementById('editPagado');
  const row  = document.getElementById('editPagRow');
  const lbl  = document.getElementById('editPagLabel');
  const nuevo = !chk.checked;
  chk.checked = nuevo;
  row.classList.toggle('activo', nuevo);
  lbl.textContent = nuevo ? '✅ Ya realizó el pago' : '¿Ya realizó el pago?';
};

window.guardarEdicion = async function () {
  const id       = document.getElementById('editId').value;
  const valorRaw = document.getElementById('editValor').value.replace(/\D/g, '');
  const valor    = parseInt(valorRaw) || 0;
  const esDir    = document.getElementById('editTabDirectiva').classList.contains('activo');
  const pagado   = document.getElementById('editPagado').checked;

  if (!valor) { toast('⚠️ Ingresa un valor válido', true); return; }

  let nombre, directiva;
  if (esDir) {
    directiva = document.getElementById('editDirectiva').value.trim();
    if (!directiva) { toast('⚠️ Ingresa el nombre de la directiva', true); return; }
    nombre = directiva;
  } else {
    nombre = document.getElementById('editNombre').value.trim();
    if (!nombre) { toast('⚠️ Ingresa el nombre', true); return; }
    directiva = '';
  }

  try {
    await updateDoc(doc(db, 'feligreses', id), {
      Nombre:    nombre,
      Valor:     valor,
      Directiva: directiva,
      tipo:      esDir ? 'directiva' : 'personal',
      pagado:    pagado
    });
    document.getElementById('modalOverlay').style.display = 'none';
    toast('✅ Cambios guardados');
  } catch (e) {
    toast('❌ Error al guardar: ' + e.message, true);
  }
};

// ── Render resumen ──────────────────────────────────────────
function renderResumen() {
  const total      = feligreses.length;
  const pagados    = feligreses.filter(f => f.pagado);
  const pendientes = feligreses.filter(f => !f.pagado);
  const recaudo    = pagados.reduce((s, f)    => s + (f.Valor || 0), 0);
  const pendMonto  = pendientes.reduce((s, f) => s + (f.Valor || 0), 0);
  const anotado    = feligreses.reduce((s, f) => s + (f.Valor || 0), 0);

  document.getElementById('totalRegistrados').textContent = total;
  document.getElementById('subRegistrados').textContent   = total === 1 ? 'voto' : 'votos';
  document.getElementById('totalRecaudado').textContent   = fmt(recaudo);
  document.getElementById('subPagados').textContent       = `${pagados.length} pagaron`;
  document.getElementById('totalPendiente').textContent   = fmt(pendMonto);
  document.getElementById('subPendientes').textContent    = `${pendientes.length} pendientes`;
  document.getElementById('totalAnotado').textContent     = fmt(anotado);
}

// ── Render lista ────────────────────────────────────────────
window.renderLista = function () {
  const busq = (document.getElementById('busqueda').value || '').toLowerCase();
  let lista  = [...feligreses];

  if (filtroActual === 'pagados')    lista = lista.filter(f => f.pagado);
  if (filtroActual === 'pendientes') lista = lista.filter(f => !f.pagado);
  if (filtroActual === 'directiva')  lista = lista.filter(f => f.tipo === 'directiva' || !!f.Directiva);
  if (filtroActual === 'personal')   lista = lista.filter(f => f.tipo === 'personal'  || !f.Directiva);

  if (busq) {
    lista = lista.filter(f =>
      (f.Nombre    || '').toLowerCase().includes(busq) ||
      (f.Directiva || '').toLowerCase().includes(busq)
    );
  }

  const cont = document.getElementById('listaFeligreses');

  if (!lista.length) {
    cont.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🔍</div>
        <p>${busq ? 'Sin resultados para esa búsqueda' : 'No hay votos en esta categoría'}</p>
      </div>`;
    return;
  }

  cont.innerHTML = lista.map((f, i) => {
    const esDir     = f.tipo === 'directiva' || !!f.Directiva;
    const iniciales = (f.Nombre || '?').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
    const cls       = f.pagado ? 'pagado' : 'pendiente';
    const subtitulo = esDir ? `🏛️ Directiva` : '👤 Voto Personal';

    return `
      <div class="feligres-item" style="animation-delay:${i * 0.04}s">
        <div class="avatar ${cls}">${iniciales}</div>
        <div class="fel-info">
          <div class="fel-nombre">${f.Nombre}</div>
          <div class="fel-sub">${subtitulo}</div>
        </div>
        <div class="fel-valor">
          <div class="fel-monto ${cls}">${fmt(f.Valor || 0)}</div>
          <span class="estado-badge ${cls}">${f.pagado ? '✅ Pagado' : '⏳ Pendiente'}</span>
        </div>
        <div class="item-acciones">
          <button class="${f.pagado ? 'btn-desmarcar' : 'btn-marcar'}"
            onclick="togglePago('${f.id}', ${f.pagado})">
            ${f.pagado ? '↩️ Desmarcar' : '✅ Marcar pago'}
          </button>
          <button class="btn btn-edit" onclick="abrirModal('${f.id}')">✏️ Editar</button>
          <button class="btn btn-danger-soft"
            onclick="eliminarFeligres('${f.id}', '${(f.Nombre || '').replace(/'/g, "\\'")}')">
            🗑️
          </button>
        </div>
      </div>`;
  }).join('');
};

// ── Filtro ──────────────────────────────────────────────────
window.setFiltro = function (f, el) {
  filtroActual = f;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
  el.classList.add('activo');
  renderLista();
};

// ── Cerrar sesión ───────────────────────────────────────────
window.cerrarSesion = function () {
  signOut(auth).then(() => window.location.href = 'index.html');
};

// ── Utilidades ──────────────────────────────────────────────
function fmt(n) {
  return '$' + Number(n).toLocaleString('es-CO');
}

function toast(msg, error = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast show' + (error ? ' error' : '');
  setTimeout(() => { t.className = 'toast'; }, 3200);
}