<script>
    import { onMount } from 'svelte';
    import { db } from '../firebase.js'; 
    import {
        collection, addDoc, onSnapshot, doc, updateDoc,
        deleteDoc, serverTimestamp, query, orderBy, getDocs, where
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

    function setSync(text) { syncMsg = text || ''; }
    function toast(msg) {
        toastMsg = msg;
        setTimeout(() => toastMsg = '', 2200);
    }

    function normalizarCliente(data) {
        return {
            nombre: (data.nombre || '').trim(),
            direccion: (data.direccion || '').trim(),
            telefono: ((data.telefono ?? '') + '').trim(),
            diaEntrega: data.diaEntrega,
            estado: data.estado || 'activo',
            stock20: Number(data.stock20) || 0,
            stock12: Number(data.stock12) || 0,
            stockSif: Number(data.stockSif) || 0,
            stockDispenser: Number(data.stockDispenser) || 0,
            orden: Number(data.orden),
            notas: (data.notas || '').trim(),
        };
    }

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

    async function handleRefresh() {
        setSync('🔄 Actualizando...');
        await getDocs(query(collection(db, 'clientes'), orderBy('nombre')));
        setTimeout(() => setSync(''), 800);
    }

    
    async function handleCrearCliente(e) {
        const data = normalizarCliente(e.detail);

        if (!data.nombre || !data.diaEntrega || !data.orden) {
            alert('Completá nombre, orden y día.');
            return;
        }

        try {
            
            const sameDaySnap = await getDocs(
                query(collection(db, 'clientes'), where('diaEntrega', '==', data.diaEntrega))
            );
            
            const existeMismoOrdenEnDia = sameDaySnap.docs.some(
                d => Number(d.data().orden) === data.orden
            );
            if (existeMismoOrdenEnDia) {
                alert(`⚠️ Ya existe orden ${data.orden} para ${data.diaEntrega}. Elegí otro número.`);
                return; // no quiero que se cierre el cliente por si tiene algun error
            }

            await addDoc(collection(db, 'clientes'), {
                ...data,
                creadoEn: serverTimestamp(),
                lastModified: serverTimestamp()
            });

            clienteACrear = false;     
            toast('Cliente guardado ✔');
        } catch (err) {
            console.error('[ADD] ERROR', err);
            alert('❌ No se pudo guardar. Intentalo de nuevo.');
        }
    }

    
    async function handleGuardarEdicion(e) {
        const edit = e.detail;
        const payload = { ...normalizarCliente(edit), lastModified: serverTimestamp() };
        const id = edit.id;
        delete payload.id;

        try {
            
            const sameDaySnap = await getDocs(
                query(collection(db, 'clientes'), where('diaEntrega', '==', payload.diaEntrega))
            );
            const duplicado = sameDaySnap.docs.some(
                d => d.id !== id && Number(d.data().orden) === payload.orden
            );
            if (duplicado) {
                alert(`⚠️ Ya existe orden ${payload.orden} para ${payload.diaEntrega}.`);
                return; // no quiero que se cierre el cliente por si tiene algun error
            }

            await updateDoc(doc(db, 'clientes', id), payload);
            toast('Cliente actualizado ✔');
            clienteAEditar = null; 
        } catch (err) { 
            console.error('[UPDATE] ERROR', err);
            alert('No se pudo actualizar.'); 
        }
    }

    async function handleEliminarCliente(e) {
        const { id, nombre } = e.detail;
        if (confirm(`¿Eliminar a ${nombre}?`)) {
            try {
                await deleteDoc(doc(db, 'clientes', id));
                toast('Cliente eliminado.');
            } catch (err) { 
                console.error('[DELETE] ERROR', err); 
            }
        }
    }

    $: totalClientes = clientesCache.length;

    $: clientesFiltrados = clientesCache.filter(c => {
        if (filtroDia !== 'todos' && c.diaEntrega !== filtroDia) return false;
        if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false;
        if (filtroTerm) {
            const term = filtroTerm.toLowerCase();
            const hay = (c.nombre || '').toLowerCase().includes(term)
                || (c.direccion || '').toLowerCase().includes(term)
                || ((c.telefono ?? '') + '').toLowerCase().includes(term)
                || (c.notas || '').toLowerCase().includes(term);
            if (!hay) return false;
        }
        return true;
    });

    $: gruposRender = dias.map(dia => ({
        dia: dia,
        clientes: clientesFiltrados
            .filter(c => c.diaEntrega === dia)
            .sort((a, b)=> (a.orden ?? 0) - (b.orden ?? 0))
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
        <FormCrear 
            on:crear={handleCrearCliente}
            on:cerrar={() => clienteACrear = false}
        />
    {/if}

    {#if toastMsg}
        <div class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded">
            {toastMsg}
        </div>
    {/if}
</div>
