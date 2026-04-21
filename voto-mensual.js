// voto-mensual.js — Seguimiento de pagos mensuales
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

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

let personas     = [];
let filtroActual = 'todos';
let tipoVoto     = 'personal';
const hoy        = new Date();
const mesActual  = hoy.getMonth();     // 0-11
const anioActual = hoy.getFullYear();

// ── Auth guard ──────────────────────────────────────────────
onAuthStateChanged(auth, user => {
  if (!user) { window.location.href = 'index.html'; return; }
  document.getElementById('userEmail').textContent = user.email;
  poblarSelectMes();
  cargarPersonas();
});

window.cerrarSesion = () => signOut(auth).then(() => window.location.href = 'index.html');

// ── Selector tipo de voto ───────────────────────────────────
window.setTipoVoto = function (tipo) {
  tipoVoto = tipo;
  document.getElementById('tabPersonal').classList.toggle('activo',   tipo === 'personal');
  document.getElementById('tabDirectiva').classList.toggle('activo',  tipo === 'directiva');
  document.getElementById('campoNombre').style.display    = tipo === 'personal'  ? '' : 'none';
  document.getElementById('campoDirectiva').style.display = tipo === 'directiva' ? '' : 'none';
  document.getElementById('nombre').value    = '';
  if (document.getElementById('directiva')) document.getElementById('directiva').value = '';
};

// ── Poblar select de mes inicio ─────────────────────────────
function poblarSelectMes() {
  const sel = document.getElementById('mesInicio');
  sel.innerHTML = '';
  MESES.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${m} ${anioActual}`;
    if (i === mesActual) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ── Cargar personas en tiempo real ──────────────────────────
function cargarPersonas() {
  const q = query(collection(db, 'votoMensual'), orderBy('creadoEn', 'desc'));
  onSnapshot(q, snap => {
    personas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderResumen();
    renderLista();
  });
}

// ── Guardar persona ─────────────────────────────────────────
window.guardarPersona = async function () {
  const valorRaw  = document.getElementById('valor').value.replace(/\D/g, '');
  const valor     = parseInt(valorRaw) || 0;
  const mesInicio = parseInt(document.getElementById('mesInicio').value);

  if (!valor) { toast('⚠️ Ingresa un valor válido', true); return; }

  let nombre, directiva;
  if (tipoVoto === 'personal') {
    nombre = document.getElementById('nombre').value.trim();
    if (!nombre) { toast('⚠️ Ingresa el nombre', true); return; }
    directiva = '';
  } else {
    directiva = document.getElementById('directiva').value.trim();
    if (!directiva) { toast('⚠️ Ingresa el nombre de la directiva', true); return; }
    nombre = directiva;
  }

  // pagos: objeto { "0": false, "1": false, ... } para cada mes desde mesInicio hasta 11
  const pagos = {};
  for (let m = mesInicio; m <= 11; m++) pagos[m] = false;

  try {
    await addDoc(collection(db, 'votoMensual'), {
      Nombre:    nombre,
      Valor:     valor,
      Directiva: directiva,
      tipo:      tipoVoto,
      mesInicio: mesInicio,
      pagos:     pagos,
      creadoEn:  serverTimestamp()
    });
    limpiarForm();
    toast('✅ Voto registrado');
  } catch (e) {
    toast('❌ Error: ' + e.message, true);
  }
};

// ── Limpiar form ────────────────────────────────────────────
window.limpiarForm = function () {
  document.getElementById('nombre').value = '';
  document.getElementById('valor').value  = '';
  if (document.getElementById('directiva')) document.getElementById('directiva').value = '';
  document.getElementById('mesInicio').value = mesActual;
  setTipoVoto('personal');
};

// ── Marcar / desmarcar un mes ───────────────────────────────
window.toggleMes = async function (id, mes) {
  const p = personas.find(x => x.id === id);
  if (!p) return;
  const nuevosPagos = { ...p.pagos };
  nuevosPagos[mes] = !nuevosPagos[mes];
  try {
    await updateDoc(doc(db, 'votoMensual', id), { pagos: nuevosPagos });
  } catch { toast('❌ Error al actualizar', true); }
};

// ── Eliminar ────────────────────────────────────────────────
window.eliminarPersona = async function (id, nombre) {
  if (!confirm(`¿Eliminar a "${nombre}"?\nEsta acción no se puede deshacer.`)) return;
  try {
    await deleteDoc(doc(db, 'votoMensual', id));
    toast('🗑️ Eliminado');
  } catch { toast('❌ Error al eliminar', true); }
};

// ── Modal editar ────────────────────────────────────────────
window.abrirModal = function (id) {
  const p = personas.find(x => x.id === id);
  if (!p) return;
  document.getElementById('editId').value     = id;
  document.getElementById('editNombre').value = p.Nombre || '';
  document.getElementById('editValor').value  = p.Valor  || '';
  document.getElementById('modalOverlay').style.display = 'flex';
};

window.cerrarModal = function (e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').style.display = 'none';
};

window.guardarEdicion = async function () {
  const id       = document.getElementById('editId').value;
  const nombre   = document.getElementById('editNombre').value.trim();
  const valorRaw = document.getElementById('editValor').value.replace(/\D/g, '');
  const valor    = parseInt(valorRaw) || 0;

  if (!nombre) { toast('⚠️ Ingresa el nombre', true); return; }
  if (!valor)  { toast('⚠️ Ingresa un valor válido', true); return; }

  try {
    await updateDoc(doc(db, 'votoMensual', id), { Nombre: nombre, Valor: valor });
    document.getElementById('modalOverlay').style.display = 'none';
    toast('✅ Cambios guardados');
  } catch (e) { toast('❌ Error: ' + e.message, true); }
};

// ── Render resumen ──────────────────────────────────────────
function renderResumen() {
  let totalPagos    = 0;
  let totalRecaudo  = 0;
  let totalEsperado = 0;
  let atrasados     = 0;

  personas.forEach(p => {
    const pagos     = p.pagos || {};
    const mesesVencidos = mesesHastaHoy(p.mesInicio);

    let atraso = false;
    mesesVencidos.forEach(m => {
      totalEsperado += p.Valor || 0;
      if (pagos[m]) {
        totalPagos++;
        totalRecaudo += p.Valor || 0;
      } else {
        atraso = true;
      }
    });
    if (atraso) atrasados++;
  });

  document.getElementById('totalPersonas').textContent  = personas.length;
  document.getElementById('totalRecaudado').textContent = fmt(totalRecaudo);
  document.getElementById('subPagados').textContent     = `${totalPagos} pagos registrados`;
  document.getElementById('totalAtrasados').textContent = atrasados;
  document.getElementById('totalEsperado').textContent  = fmt(totalEsperado);

  // Alerta de atrasos
  const alerta = document.getElementById('alertaAtrasos');
  if (atrasados > 0) {
    alerta.textContent = `⚠️ ${atrasados} persona${atrasados > 1 ? 's tienen' : ' tiene'} meses pendientes por pagar.`;
    alerta.classList.add('visible');
  } else {
    alerta.classList.remove('visible');
  }
}

// ── Render lista ────────────────────────────────────────────
window.renderLista = function () {
  const busq = (document.getElementById('busqueda').value || '').toLowerCase();
  let lista  = [...personas];

  if (filtroActual === 'aldia') {
    lista = lista.filter(p => {
      const vencidos = mesesHastaHoy(p.mesInicio);
      return vencidos.every(m => (p.pagos || {})[m]);
    });
  }
  if (filtroActual === 'atrasados') {
    lista = lista.filter(p => {
      const vencidos = mesesHastaHoy(p.mesInicio);
      return vencidos.some(m => !(p.pagos || {})[m]);
    });
  }

  if (busq) lista = lista.filter(p => (p.Nombre || '').toLowerCase().includes(busq));

  const cont = document.getElementById('listaVM');

  if (!lista.length) {
    cont.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div>
      <p>${busq ? 'Sin resultados' : 'No hay personas en esta categoría'}</p></div>`;
    return;
  }

  cont.innerHTML = lista.map((p, i) => {
    const pagos    = p.pagos || {};
    const vencidos = mesesHastaHoy(p.mesInicio);
    const pagados  = vencidos.filter(m => pagos[m]).length;
    const atrasM   = vencidos.filter(m => !pagos[m]).length;
    const totalM   = Object.keys(pagos).length;
    const pct      = totalM ? Math.round((pagados / vencidos.length) * 100) : 0;
    const iniciales = (p.Nombre || '?').split(' ').slice(0,2).map(x => x[0]).join('').toUpperCase();
    const clsAv    = atrasM > 0 ? 'pendiente' : 'pagado';
    const esDir    = p.tipo === 'directiva' || !!p.Directiva;
    const subtitulo = esDir ? '🏛️ Voto de Directiva' : '👤 Voto Personal';

    // Generar botones de meses
    const mesesBtns = Object.keys(pagos).sort((a,b)=>+a-+b).map(mKey => {
      const m   = parseInt(mKey);
      const esVencido = m <= mesActual;
      const esActual  = m === mesActual;
      const pagado    = !!pagos[m];

      let cls = 'futuro';
      if (esVencido) cls = pagado ? 'pagado' : (esActual ? 'actual' : 'atrasado');

      const clickable = esVencido ? `onclick="toggleMes('${p.id}', ${m})"` : '';
      const title     = pagado ? 'Clic para desmarcar' : (esVencido ? 'Clic para marcar como pagado' : 'Aún no vence');

      return `<button class="mes-btn ${cls}" ${clickable} title="${title}">${MESES[m].slice(0,3)}</button>`;
    }).join('');

    return `
      <div class="vm-item" style="animation-delay:${i*0.04}s">
        <div class="vm-top">
          <div class="avatar ${clsAv}" style="width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.88rem;flex-shrink:0;">
            ${iniciales}
          </div>
          <div class="vm-info">
            <div class="vm-nombre">${p.Nombre}</div>
            <div class="vm-sub">${subtitulo} &nbsp;·&nbsp; 💵 ${fmt(p.Valor || 0)} / mes &nbsp;·&nbsp; desde ${MESES[p.mesInicio]} ${anioActual}</div>
          </div>
          <div class="vm-stats">
            <div class="vm-stat ok">
              <span class="num">${pagados}</span>
              al día
            </div>
            <div class="vm-stat mal">
              <span class="num">${atrasM}</span>
              atrasado${atrasM !== 1 ? 's' : ''}
            </div>
            <div class="vm-stat tot">
              <span class="num">${fmt((p.Valor||0) * pagados)}</span>
              pagado
            </div>
          </div>
          <div class="vm-acciones">
            <button class="btn btn-edit" onclick="abrirModal('${p.id}')">✏️</button>
            <button class="btn btn-danger-soft" onclick="eliminarPersona('${p.id}', '${(p.Nombre||'').replace(/'/g,"\\'")}')">🗑️</button>
          </div>
        </div>

        <div class="vm-progreso">
          <div class="vm-progreso-bar" style="width:${isNaN(pct)?0:pct}%"></div>
        </div>

        <div class="meses-grid">${mesesBtns}</div>
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

// ── Helpers ─────────────────────────────────────────────────
// Devuelve array de índices de meses que ya debieron pagarse (desde mesInicio hasta mesActual)
function mesesHastaHoy(mesInicio) {
  const resultado = [];
  for (let m = mesInicio; m <= mesActual; m++) resultado.push(m);
  return resultado;
}

const MESES_JS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function fmt(n) {
  return '$' + Number(n).toLocaleString('es-CO');
}

function toast(msg, error = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast show' + (error ? ' error' : '');
  setTimeout(() => { t.className = 'toast'; }, 3200);
}