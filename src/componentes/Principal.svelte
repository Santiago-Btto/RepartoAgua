<script>
    import { onMount } from 'svelte';
    import { db } from '../firebase.js'; 
    import {
        collection, addDoc, onSnapshot, doc, updateDoc,
        deleteDoc, serverTimestamp, query, orderBy, getDocs
    } from "firebase/firestore";
    import FormCrear from './FormCrear.svelte';
    import ListaClientes from './ListaClientes.svelte';
    import ModalEditar from './ModalEditar.svelte';
    import Filtros from './Filtros.svelte';

    let clientesCache = [];
    let syncMsg = '';
    let toastMsg = '';
    let filtroTerm = '';
    let filtroDia = 'todos';
    let filtroEstado = 'todos';
    let clienteAEditar = null;
    let clienteACrear = false;

    const dias = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

    // Al cargar el componente se suscribe a la colección de clientes
    onMount(() => {
        const q = query(collection(db, 'clientes'), orderBy('nombre'));
        const unsubscribe = onSnapshot(q, (snap) => {
        setSync('🔄 Sincronizando...');
        clientesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTimeout(() => setSync(''), 800);
        });

        window.addEventListener('online', () => setSync('Conectado • sincronizando...'));
        window.addEventListener('offline', () => setSync('Sin conexión (modo offline)'));

        return unsubscribe; 
    });

    function setSync(text) { syncMsg = text || ''; }
    function toast(msg) {
        toastMsg = msg;
        setTimeout(() => toastMsg = '', 2200);
    }

    async function handleRefresh() {
        setSync('🔄 Actualizando...');
        await getDocs(query(collection(db, 'clientes'), orderBy('nombre')));
        setTimeout(() => setSync(''), 800);
    }

    // === CRUD (CREATE) ===
    async function handleCrearCliente(e) {
        const data = e.detail;
        try {
        await addDoc(collection(db, 'clientes'), {
            ...data,
            creadoEn: serverTimestamp(),
            lastModified: serverTimestamp()
        });
        toast('Cliente guardado ✔');
        } catch (err) { alert('No se pudo guardar.'); }
    }

    // === CRUD (UPDATE) ===
    async function handleGuardarEdicion(e) {
        const clienteEditado = e.detail;
        const payload = { ...clienteEditado, lastModified: serverTimestamp() };
        delete payload.id; 
        try {
        await updateDoc(doc(db, 'clientes', clienteEditado.id), payload);
        toast('Cliente actualizado ✔');
        clienteAEditar = null; 
        } catch (err) { alert('No se pudo actualizar.'); }
    }

    // === CRUD (DELETE) ===
    async function handleEliminarCliente(e) {
        const { id, nombre } = e.detail;
        if (confirm(`¿Eliminar a ${nombre}?`)) {
        try {
            await deleteDoc(doc(db, 'clientes', id));
            toast('Cliente eliminado.');
        } catch (err) { console.error('[DELETE] ERROR', err); }
        }
    }

    // === ESTADO DERIVADO (Reactividad de Svelte) ===
    $: totalClientes = clientesCache.length;

    $: clientesFiltrados = clientesCache.filter(c => {
        if (filtroDia !== 'todos' && c.diaEntrega !== filtroDia) return false;
        if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false;
        if (filtroTerm) {
            const term = filtroTerm.toLowerCase();
            const hay = (c.nombre || '').toLowerCase().includes(term)
                || (c.direccion || '').toLowerCase().includes(term)
                || (c.telefono.toString() || '').toLowerCase().includes(term)
                || (c.notas || '').toLowerCase().includes(term);
            if (!hay) return false;
        }
        return true;
    });

    $: gruposRender = dias.map(dia => ({
        dia: dia,
        clientes: clientesFiltrados.filter(c => c.diaEntrega === dia).sort((a, b)=> a.orden - b.orden)
    })).filter(g => g.clientes.length > 0);

</script>

<div>
    <header class="sticky top-0 z-10 flex items-center justify-between bg-[#0f172a] p-4 border-b border-gray-700">
        <h1 class="text-lg font-semibold">Reparto de Agua</h1>
        <div class="flex items-center gap-3">
            <button class="text-sm text-gray-400 hover:text-white" on:click={handleRefresh}>
            🔁 Actualizar
            </button>
            <small class="text-gray-500">{syncMsg}</small>
        </div>
    </header>

    <div class="max-w-5xl mx-auto p-4 grid gap-4">
        <Filtros
            bind:term={filtroTerm}
            bind:dia={filtroDia}
            bind:estado={filtroEstado}
            total={totalClientes}
            on:crear={() => clienteACrear = true}
        />

        <section class="bg-[#111828] border border-gray-700 rounded-lg p-4">
            <ListaClientes 
            grupos={gruposRender}
            on:editar={e => clienteAEditar = e.detail}
            on:eliminar={handleEliminarCliente}
            />
        </section>
    </div>

    {#if clienteAEditar}
        <ModalEditar 
            cliente={clienteAEditar}
            on:guardar={handleGuardarEdicion}
            on:cerrar={() => clienteAEditar = null}
        />
    {/if}

    {#if clienteACrear}
        <FormCrear on:crear={handleCrearCliente} on:cerrar={() => clienteACrear = false}/>
    {/if}
</div>