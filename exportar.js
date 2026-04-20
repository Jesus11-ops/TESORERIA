// exportar.js — Exportación Excel (4 hojas)
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

window.exportarExcel = async function () {
  if (!auth.currentUser) { alert('⚠️ Debes iniciar sesión'); return; }

  // Cargar ExcelJS dinámicamente
  if (!window.ExcelJS) {
    await new Promise((res, rej) => {
      const s   = document.createElement('script');
      s.src     = 'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js';
      s.onload  = res;
      s.onerror = () => rej(new Error('No se pudo cargar ExcelJS'));
      document.head.appendChild(s);
    });
  }

  // Leer Firestore
  let feligreses = [];
  try {
    const snap = await getDocs(query(collection(db, 'feligreses'), orderBy('creadoEn', 'asc')));
    feligreses  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    alert('❌ Error al leer datos: ' + e.message); return;
  }

  if (!feligreses.length) { alert('⚠️ No hay personas registradas'); return; }

  const pagados    = feligreses.filter(f => f.pagado);
  const pendientes = feligreses.filter(f => !f.pagado);

  const totalAnotado   = feligreses.reduce((s, f) => s + (f.Valor || 0), 0);
  const totalRecaudado = pagados.reduce((s, f)    => s + (f.Valor || 0), 0);
  const totalPendiente = pendientes.reduce((s, f) => s + (f.Valor || 0), 0);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tesorería IPUC';
  wb.created = new Date();

  // Colores
  const C_AZUL   = 'FF2B6CB0';
  const C_VERDE  = 'FF059669';
  const C_ROJO   = 'FFDC2626';
  const C_AMARI  = 'FFFFF3CD';
  const C_WHITE  = 'FFFFFFFF';
  const C_GRIS   = 'FFF9FAFB';
  const C_PGADO  = 'FFD1FAE5';
  const C_PEND   = 'FFFEE2E2';

  // ── Función genérica para crear hoja de lista ──
  function crearHoja(nombre, datos, colorHdr) {
    const ws = wb.addWorksheet(nombre);
    ws.columns = [
      { key: 'num',       width: 5  },
      { key: 'nombre',    width: 32 },
      { key: 'directiva', width: 28 },
      { key: 'valor',     width: 18 },
      { key: 'estado',    width: 14 },
    ];

    // Cabecera
    const hdr = ws.addRow(['#', 'Nombre', 'Directiva', 'Valor', 'Estado']);
    hdr.height = 22;
    hdr.eachCell(c => {
      c.fill      = { type:'pattern', pattern:'solid', fgColor:{ argb: colorHdr } };
      c.font      = { bold:true, color:{ argb: C_WHITE }, size:11 };
      c.alignment = { vertical:'middle', horizontal:'center' };
    });

    // Filas
    datos.forEach((f, i) => {
      const r = ws.addRow([
        i + 1,
        f.Nombre    || '',
        f.Directiva || '—',
        f.Valor     || 0,
        f.pagado ? 'Pagado' : 'Pendiente'
      ]);
      r.eachCell(c => {
        c.fill      = { type:'pattern', pattern:'solid', fgColor:{ argb: i%2===0 ? C_WHITE : C_GRIS } };
        c.alignment = { vertical:'middle' };
      });
      const cValor  = r.getCell(4);
      cValor.numFmt = '"$"#,##0';
      cValor.alignment = { horizontal:'right' };

      const cEst = r.getCell(5);
      cEst.alignment = { horizontal:'center' };
      if (f.pagado) {
        cEst.font = { color:{ argb:'FF065F46' }, bold:true };
        cEst.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: C_PGADO } };
      } else {
        cEst.font = { color:{ argb:'FF991B1B' }, bold:true };
        cEst.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: C_PEND } };
      }
    });

    // Fila total
    const tot = ws.addRow(['', '', 'TOTAL:', datos.reduce((s,f)=>s+(f.Valor||0),0), '']);
    tot.height = 20;
    tot.getCell(3).font = { bold:true, size:11 };
    tot.getCell(3).alignment = { horizontal:'right' };
    tot.getCell(4).numFmt = '"$"#,##0';
    tot.getCell(4).font = { bold:true, size:12, color:{ argb:'FF1E3A5F' } };
    tot.getCell(4).fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFBBF24' } };
    tot.getCell(4).alignment = { horizontal:'right' };
  }

  crearHoja('Todos',      feligreses, C_AZUL);
  crearHoja('Pagados',    pagados,    C_VERDE);
  crearHoja('Pendientes', pendientes, C_ROJO);

  // ── Hoja Resumen ──
  const wsR = wb.addWorksheet('Resumen');
  wsR.columns = [{ width:34 }, { width:22 }];

  wsR.mergeCells('A1:B1');
  const tit = wsR.getCell('A1');
  tit.value     = '💰 RESUMEN DE TESORERÍA';
  tit.font      = { bold:true, size:16, color:{ argb: C_WHITE } };
  tit.fill      = { type:'pattern', pattern:'solid', fgColor:{ argb: C_AZUL } };
  tit.alignment = { horizontal:'center', vertical:'middle' };
  wsR.getRow(1).height = 38;

  wsR.mergeCells('A2:B2');
  const fec = wsR.getCell('A2');
  fec.value     = `Generado: ${new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'})}`;
  fec.font      = { italic:true, color:{ argb:'FF6B7280' } };
  fec.alignment = { horizontal:'center' };
  wsR.addRow([]);

  function filaRes(label, valor, fgArgb, fontArgb='FF1E3A5F') {
    const r = wsR.addRow([label, valor]);
    r.height = 28;
    r.getCell(1).font = { bold:true, size:12 };
    r.getCell(1).fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF3F4F6' } };
    r.getCell(1).alignment = { vertical:'middle' };
    r.getCell(2).numFmt = '"$"#,##0';
    r.getCell(2).font   = { bold:true, size:13, color:{ argb: fontArgb } };
    r.getCell(2).fill   = { type:'pattern', pattern:'solid', fgColor:{ argb: fgArgb } };
    r.getCell(2).alignment = { horizontal:'right', vertical:'middle' };
  }

  function filaCant(label, valor) {
    const r = wsR.addRow([label, valor]);
    r.height = 22;
    r.getCell(1).font = { color:{ argb:'FF6B7280' } };
    r.getCell(2).font = { bold:true };
    r.getCell(2).alignment = { horizontal:'right' };
  }

  filaRes('💵  Total Anotado (todos)',       totalAnotado,   'FFFDE68A');
  filaRes('✅  Total Recaudado (pagados)',    totalRecaudado, 'FFD1FAE5', 'FF065F46');
  filaRes('⏳  Pendiente por Cobrar',         totalPendiente, 'FFFEE2E2', 'FF991B1B');

  wsR.addRow([]);
  filaCant('👥  Total personas registradas', feligreses.length);
  filaCant('✅  Personas que pagaron',        pagados.length);
  filaCant('⏳  Personas pendientes',         pendientes.length);

  // Desglose por directiva
  const directivas = [...new Set(feligreses.filter(f => f.Directiva).map(f => f.Directiva))];
  if (directivas.length) {
    wsR.addRow([]);
    const dH = wsR.addRow(['🏛️  Directiva', 'Total Anotado']);
    dH.eachCell(c => {
      c.font = { bold:true, color:{ argb: C_WHITE } };
      c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: C_AZUL } };
    });
    dH.getCell(2).alignment = { horizontal:'right' };

    directivas.forEach(dir => {
      const tot = feligreses.filter(f => f.Directiva===dir).reduce((s,f)=>s+(f.Valor||0),0);
      const r   = wsR.addRow([dir, tot]);
      r.getCell(2).numFmt    = '"$"#,##0';
      r.getCell(2).alignment = { horizontal:'right' };
    });
  }

  // ── Descargar ──
  const buf  = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `tesoreria_${new Date().toISOString().split('T')[0]}.xlsx`;

  const isIOS    = /iP(hone|ad|od)/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  document.body.appendChild(a);
  if (isIOS || isSafari) a.target = '_blank';
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);

  console.log('✅ Excel exportado');
};
