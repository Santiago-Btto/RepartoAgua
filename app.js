import { firebaseConfig } from './firebase-config.js';

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
  query, where, orderBy, enableIndexedDbPersistence, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Offline
enableIndexedDbPersistence(db).catch(() => console.warn("Sin persistencia offline (modo incógnito o conflicto)."));

const qs = (s) => document.querySelector(s);
const lista = qs('#lista');
const loginBtn = qs('#login');
const logoutBtn = qs('#logout');
const userSpan = qs('#user');

// Auth
const provider = new GoogleAuthProvider();

loginBtn?.addEventListener('click', async () => {
  try { await signInWithPopup(auth, provider); } catch(e){ alert(e.message); }
});
logoutBtn?.addEventListener('click', async () => { await signOut(auth); });

onAuthStateChanged(auth, (user) => {
  userSpan.textContent = user ? user.email : 'No logueado';
  loginBtn.style.display = user ? 'none' : 'inline-block';
  logoutBtn.style.display = user ? 'inline-block' : 'none';
  if (user) cargarClientes();
  else lista.innerHTML = '<small>Iniciá sesión para ver datos.</small>';
});

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
    notas: f.notas.value.trim(),
    creadoEn: serverTimestamp()
  };
  if (!data.nombre || !data.diaEntrega) return alert('Completá nombre y día.');
  await addDoc(collection(db, 'clientes'), data);
  f.reset();
  cargarClientes();
});

// Pintar clientes por día con acciones (editar/eliminar)
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
      left.innerHTML = `<strong>${c.nombre}</strong> — ${c.estado} · ${c.direccion ?? ''} <span class="badge">${id}</span>`;
      const right = document.createElement('div');
      const btnEdit = Object.assign(document.createElement('button'), {textContent:'Editar', className:'ghost'});
      const btnDel = Object.assign(document.createElement('button'), {textContent:'Eliminar', className:'ghost'});
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

// Entregas
qs('#formEntrega')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const data = {
    clienteId: f.clienteId.value.trim(),
    fecha: new Date(),
    cant20L: +f.c20.value || 0,
    cant12L: +f.c12.value || 0,
    sifones: +f.sifones.value || 0,
    observacion: f.obs.value.trim()
  };
  if (!data.clienteId) return alert('Falta ID de cliente');
  await addDoc(collection(db,'entregas'), data);
  f.reset();
  alert('Entrega registrada');
});

// Reportes simples (rango de fechas)
qs('#formReporte')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const desde = new Date(f.desde.value);
  const hasta = new Date(f.hasta.value);
  if (isNaN(+desde) || isNaN(+hasta)) return alert('Fechas inválidas');
  // Cliente-side: traemos todas las entregas y filtramos (para demo).
  const snap = await getDocs(collection(db,'entregas'));
  let total20 = 0, total12 = 0, totalsif = 0, n = 0;
  snap.forEach(d => {
    const it = d.data();
    const t = it.fecha?.toDate ? it.fecha.toDate() : new Date(it.fecha);
    if (t >= desde && t <= hasta) {
      total20 += +it.cant20L||0; total12 += +it.cant12L||0; totalsif += +it.sifones||0; n++;
    }
  });
  qs('#reporteOut').textContent =
    `Entregas en rango: ${n}\nTotal 20L: ${total20}\nTotal 12L: ${total12}\nSifones: ${totalsif}`;
});
