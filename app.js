import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, query, where, orderBy,
  enableIndexedDbPersistence, doc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(() => console.warn('Sin persistencia offline (incógnito o conflicto).'));

const qs = s => document.querySelector(s);
const lista = qs('#lista');

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
  cargarClientes();
});

async function cargarClientes(){
  const dias = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
  lista.innerHTML = "";
  for (const d of dias) {
    const qref = query(collection(db,'clientes'), where('diaEntrega','==', d), orderBy('nombre'));
    const snap = await getDocs(qref);
    if (snap.empty) continue;
    const h = document.createElement('h3'); h.textContent = d.toUpperCase();
    lista.appendChild(h);
    snap.forEach(docu => {
      const c = docu.data(); const id = docu.id;
      const row = document.createElement('div'); row.className = 'item';
      const left = document.createElement('div');
      left.innerHTML = `<strong>${c.nombre}</strong> — ${c.estado} · ${c.direccion ?? ''} <span class='badge'>${id}</span>`;
      const right = document.createElement('div');
      const btnEdit = Object.assign(document.createElement('button'), {textContent:'Editar'});
      const btnDel = Object.assign(document.createElement('button'), {textContent:'Eliminar'});
      btnEdit.onclick = () => editarCliente(id, c);
      btnDel.onclick = async () => { if (confirm('¿Eliminar cliente?')) { await deleteDoc(doc(db,'clientes',id)); cargarClientes(); } };
      right.append(btnEdit, btnDel);
      row.append(left, right);
      lista.appendChild(row);
    });
  }
}

async function editarCliente(id, c){
  const nombre = prompt('Nombre', c.nombre) ?? c.nombre;
  const direccion = prompt('Dirección', c.direccion ?? '') ?? c.direccion;
  const telefono = prompt('Teléfono', c.telefono ?? '') ?? c.telefono;
  const estado = prompt('Estado (activo/pausado)', c.estado) ?? c.estado;
  const diaEntrega = prompt('Día (lunes..domingo)', c.diaEntrega) ?? c.diaEntrega;
  const notas = prompt('Notas', c.notas ?? '') ?? c.notas;
  await updateDoc(doc(db,'clientes',id), { nombre, direccion, telefono, estado, diaEntrega, notas });
  cargarClientes();
}

cargarClientes();
