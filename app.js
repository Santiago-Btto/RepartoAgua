import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, enableIndexedDbPersistence,
  doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(() => console.warn('Sin persistencia offline (incógnito o conflicto).'));

const qs = s => document.querySelector(s);
const lista = qs('#lista');
const empty = qs('#empty');

// ---- Crear cliente
qs('#formCliente')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const data = {
    nombre: f.nombre.value.trim(),
    direccion: f.direccion.value.trim(),
    telefono: f.telefono.value.trim(),
    estado: f.estado.value,
    diaEntrega: f.diaEntrega.value,
    notas: f.notas.value.trim(),
    creadoEn: serverTimestamp()
  };
  if (!data.nombre || !data.diaEntrega) return alert('Completá nombre y día.');
  await addDoc(collection(db, 'clientes'), data);
  f.reset();
});

// ---- Cache y render
let clientesCache = [];
const dias = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];

// Suscripción en tiempo real (ordenado por nombre)
onSnapshot(query(collection(db,'clientes'), orderBy('nombre')), (snap) => {
  clientesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  render();
});

// Filtros
['search','fDia','fEstado'].forEach(id => {
  qs('#'+id)?.addEventListener('input', render);
  qs('#'+id)?.addEventListener('change', render);
});

function render(){
  const term = (qs('#search')?.value || '').toLowerCase();
  const fDia = qs('#fDia')?.value || 'todos';
  const fEstado = qs('#fEstado')?.value || 'todos';

  const filtrados = clientesCache.filter(c => {
    if (fDia !== 'todos' && c.diaEntrega !== fDia) return false;
    if (fEstado !== 'todos' && c.estado !== fEstado) return false;
    if (term) {
      const hay = (c.nombre||'').toLowerCase().includes(term)
        || (c.direccion||'').toLowerCase().includes(term)
        || (c.telefono||'').toLowerCase().includes(term)
        || (c.notas||'').toLowerCase().includes(term);
      if (!hay) return false;
    }
    return true;
  });

  lista.innerHTML = "";
  if (filtrados.length === 0) {
    empty.style.display = 'block';
    return;
  } else empty.style.display = 'none';

  // Agrupar por día
  for (const d of dias) {
    const grupo = filtrados.filter(c => c.diaEntrega === d);
    if (grupo.length === 0) continue;
    const h = document.createElement('h3'); h.textContent = d.toUpperCase();
    lista.appendChild(h);
    grupo.forEach(c => {
      const row = document.createElement('div'); row.className = 'item';
      const left = document.createElement('div');
      left.innerHTML = `<strong>${c.nombre}</strong> — ${c.estado} · ${c.direccion ?? ''} · ${c.telefono ?? ''} <span class='badge'>${c.id}</span>`;
      const right = document.createElement('div');
      const btnEdit = Object.assign(document.createElement('button'), {textContent:'Editar', className:'btn-ghost'});
      const btnDel = Object.assign(document.createElement('button'), {textContent:'Eliminar', className:'btn-ghost btn-danger'});
      btnEdit.onclick = () => editarCliente(c.id, c);
      btnDel.onclick = async () => { if (confirm('¿Eliminar cliente?')) { await deleteDoc(doc(db,'clientes',c.id)); } };
      right.append(btnEdit, btnDel);
      row.append(left, right);
      lista.appendChild(row);
    });
  }
}

async function editarCliente(id, c){
  // Dialog simple con selects válidos (evita errores de tipeo)
  const nombre = prompt('Nombre', c.nombre) ?? c.nombre;
  const direccion = prompt('Dirección', c.direccion ?? '') ?? c.direccion;
  const telefono = prompt('Teléfono', c.telefono ?? '') ?? c.telefono;
  const estado = prompt('Estado (activo/pausado)', c.estado) ?? c.estado;
  const diaEntrega = prompt('Día (lunes..domingo)', c.diaEntrega) ?? c.diaEntrega;
  const notas = prompt('Notas', c.notas ?? '') ?? c.notas;
  await updateDoc(doc(db,'clientes',id), { nombre, direccion, telefono, estado, diaEntrega, notas });
}
