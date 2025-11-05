import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, enableIndexedDbPersistence,
  doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

console.log('[BOOT] Cargando app...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log('[BOOT] Firebase iniciado para proyecto:', firebaseConfig.projectId);

enableIndexedDbPersistence(db, { synchronizeTabs: true })
  .then(() => console.log('[PERSIST] Persistencia habilitada'))
  .catch((e) => {
    if (e.code === 'failed-precondition') {
      console.warn('[PERSIST] No se puede habilitar persistencia debido a múltiples pestañas abiertas');
    } else if (e.code === 'unimplemented') {
      console.warn('[PERSIST] La persistencia no es compatible con esta plataforma');
    }
  });


const qs = s => document.querySelector(s);
const lista = qs('#lista');
const empty = qs('#empty');
const totalEl = qs('#total');
const syncMsg = qs('#syncMsg');
const toast = (t) => { const m = qs('#msg'); m.textContent = t; m.style.display = 'block'; setTimeout(() => m.style.display = 'none', 2200); };

// Online/offline status
function setSync(text) { syncMsg.textContent = text || ''; }
window.addEventListener('online', () => setSync('Conectado • sincronizando...'));
window.addEventListener('offline', () => setSync('Sin conexión (modo offline)'));

// Crear cliente
qs('#formCliente')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const data = {
    nombre: f.nombre.value.trim(),
    direccion: f.direccion.value.trim(),
    telefono: f.telefono.value.trim(),
    estado: f.estado.value,
    diaEntrega: f.diaEntrega.value,
    stock20: Number(f.stock20.value || 0),
    stock12: Number(f.stock12.value || 0),
    stockSif: Number(f.stockSif.value || 0),
    dispenser: Number(f.dispenser.value || 0),
    ordenVisita: Number(f.ordenVisita.value || 0),
    notas: f.notas.value.trim(),
    creadoEn: serverTimestamp(),
    lastModified: serverTimestamp()
  };
  if (!data.nombre || !data.diaEntrega) { alert('Completá nombre y día.'); return; }

  try {
    const ref = await addDoc(collection(db, 'clientes'), data);
    console.log('[ADD] OK', ref.id);
    toast('Cliente guardado ✔');
    f.reset();
  } catch (err) {
    console.error('[ADD] ERROR', err);
    alert('No se pudo guardar. Revisá Firestore Rules.');
  }
});

let clientesCache = [];
const dias = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

// Realtime
console.log('[SNAP] suscribiendo...');
onSnapshot(query(collection(db, 'clientes'), orderBy('ordenVisita', 'asc')), (snap) => {
  setSync('🔄 Sincronizando con Firestore...');
  clientesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log('[SNAP] docs:', clientesCache.length);
  render();
  setTimeout(() => setSync(''), 800);
}, (err) => {
  console.error('[SNAP] ERROR', err);
  alert('No puedo leer clientes. Revisá Reglas y Conexión.');
});

qs('#btnRefresh')?.addEventListener('click', async () => {
  setSync('🔄 Actualizando...');
  const snap = await getDocs(query(collection(db, 'clientes'), orderBy('ordenVisita', 'asc')));
  clientesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  render();
  setTimeout(() => setSync(''), 800);
});

['search', 'fDia', 'fEstado'].forEach(id => {
  qs('#' + id)?.addEventListener('input', render);
  qs('#' + id)?.addEventListener('change', render);
});

function fmt(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString();
  } catch { return ''; }
}

function render() {
  totalEl.textContent = String(clientesCache.length);
  const term = (qs('#search')?.value || '').toLowerCase();
  const fDia = qs('#fDia')?.value || 'todos';
  const fEstado = qs('#fEstado')?.value || 'todos';

  const filtrados = clientesCache.filter(c => {
    if (fDia !== 'todos' && c.diaEntrega !== fDia) return false;
    if (fEstado !== 'todos' && c.estado !== fEstado) return false;
    if (term) {
      const hay = (c.nombre || '').toLowerCase().includes(term)
        || (c.direccion || '').toLowerCase().includes(term)
        || (c.telefono || '').toLowerCase().includes(term)
        || (c.notas || '').toLowerCase().includes(term);
      if (!hay) return false;
    }
    return true;
  });

  lista.innerHTML = "";
  if (filtrados.length === 0) {
    empty.style.display = 'block';
    return;
  } else empty.style.display = 'none';

  for (const d of dias) {
    const grupo = filtrados.filter(c => c.diaEntrega === d);
    if (grupo.length === 0) continue;
    const h = document.createElement('h3');
    h.textContent = `${d.toUpperCase()} (${grupo.length} clientes)`;
    lista.appendChild(h);

    grupo.forEach(c => {
      const row = document.createElement('div');
      row.className = 'item';
      const left = document.createElement('div');
      left.innerHTML = `<strong>${c.nombre}</strong> — ${c.estado} · ${c.direccion ?? ''} · ${c.telefono ?? ''}
        · Stock: 20L ${c.stock20 ?? 0} · 12L ${c.stock12 ?? 0} · Sif ${c.stockSif ?? 0} · Dispensers ${c.dispenser ?? 0}
        <br><small class="muted">Última mod: ${fmt(c.lastModified)}</small>`;
      const right = document.createElement('div');
      const btnEdit = Object.assign(document.createElement('button'), { textContent: 'Editar', className: 'btn-ghost' });
      const btnDel = Object.assign(document.createElement('button'), { textContent: 'Eliminar', className: 'btn-ghost btn-danger' });
      btnEdit.onclick = () => openEditor(c.id, c);
      btnDel.onclick = async () => { if (confirm('¿Eliminar cliente?')) await deleteDoc(doc(db, 'clientes', c.id)); };
      right.append(btnEdit, btnDel);
      row.append(left, right);
      lista.appendChild(row);
    });
  }
}

// Modal de edición
let editingId = null;
const modal = qs('#modal');
const formEdit = qs('#formEdit');
const btnCancel = qs('#btnCancel');

function openEditor(id, c) {
  editingId = id;
  formEdit.nombre.value = c.nombre || '';
  formEdit.direccion.value = c.direccion || '';
  formEdit.telefono.value = c.telefono || '';
  formEdit.diaEntrega.value = c.diaEntrega || 'lunes';
  formEdit.estado.value = c.estado || 'activo';
  formEdit.stock20.value = Number(c.stock20 ?? 0);
  formEdit.stock12.value = Number(c.stock12 ?? 0);
  formEdit.stockSif.value = Number(c.stockSif ?? 0);
  formEdit.dispenser.value = Number(c.dispenser ?? 0);
  formEdit.ordenVisita.value = Number(c.ordenVisita ?? 1);
  formEdit.notas.value = c.notas || '';
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

btnCancel?.addEventListener('click', closeEditor);
modal?.querySelector('.overlay')?.addEventListener('click', closeEditor);
function closeEditor() {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  editingId = null;
}

formEdit?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!editingId) return;
  const f = e.target;
  const payload = {
    nombre: f.nombre.value.trim(),
    direccion: f.direccion.value.trim(),
    telefono: f.telefono.value.trim(),
    diaEntrega: f.diaEntrega.value,
    estado: f.estado.value,
    stock20: Number(f.stock20.value || 0),
    stock12: Number(f.stock12.value || 0),
    stockSif: Number(f.stockSif.value || 0),
    dispenser: Number(f.dispenser.value || 0),
    ordenVisita: Number(f.ordenVisita.value || 0),
    notas: f.notas.value.trim(),
    lastModified: serverTimestamp()
  };
  try {
    await updateDoc(doc(db, 'clientes', editingId), payload);
    toast('Cliente actualizado ✔');
    closeEditor();
  } catch (err) {
    console.error('[EDIT] ERROR', err);
    alert('No se pudo actualizar. Revisá Rules.');
  }
});
