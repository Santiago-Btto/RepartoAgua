<script>
    import { onMount } from 'svelte';
    import { db } from '../firebase.js';
    import {
        collection, onSnapshot, doc, updateDoc, deleteDoc,
        serverTimestamp, query, orderBy, getDocs, where, writeBatch
    } from "firebase/firestore";

    import FormCrear from './FormCrear.svelte';
    import ListaClientes from './ListaClientes.svelte';
    import ModalEditar from './ModalEditar.svelte';
    import Filtros from './Filtros.svelte';
    import EmpezarDia from './EmpezarDia.svelte';

    let mostrarEmpezar = false;
    let clientesDelDia = [];

    let clientesCache = [];
    let syncMsg = '';
    let toastMsg = '';
    let filtroTerm = '';
    let filtroDia = 'todos';
    let filtroEstado = 'todos';
    let clienteAEditar = null;
    let clienteACrear = false;

    const dias = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

    const setSync = (text) => { syncMsg = text || ''; };
    const toast = (msg) => { toastMsg = msg; setTimeout(() => toastMsg = '', 2200); };

    // no incluimos id para no enviar undefined a firestore
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

    // live sync 
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
            const day = data.diaEntrega;
            const k = Number(data.orden);

            // traer todos los del mismo dia
            const snap = await getDocs(
                query(collection(db, 'clientes'), where('diaEntrega', '==', day))
            );

            
            const batch = writeBatch(db);

            // 1) hacer espacio: todos los x >= k  +1
            snap.docs
                .map(d => ({ ref: d.ref, ...d.data() }))
                .filter(c => Number(c.orden) >= k)
                .forEach(c => batch.update(c.ref, {
                    orden: Number(c.orden) + 1,
                    lastModified: serverTimestamp()
                }));

            // 2) nuevo en el hueco (payload sin id)
            const newRef = doc(collection(db, 'clientes')); // sin import interno
            batch.set(newRef, {
                ...data,
                creadoEn: serverTimestamp(),
                lastModified: serverTimestamp()
            });

            // 3) Commit atómico
            await batch.commit();

            clienteACrear = false;
            toast(`Cliente guardado ✔ (insertado en orden ${k})`);
        } catch (err) {
            console.error('[ADD batch] ERROR', err);
            alert(`❌ No se pudo guardar. ${err?.message ?? ''}`);
        }
    }

    
    async function handleGuardarEdicion(e) {
        const incoming = e.detail;          // con id
        const editId = incoming.id;
        const edit   = normalizarCliente(incoming); // payload sin id
        const original = clientesCache.find(c => c.id === editId);
        if (!original) { alert('Cliente no encontrado.'); return; }

        try {
            const batch = writeBatch(db);
            const refSelf = doc(db, 'clientes', editId);

            const oldDay = original.diaEntrega;
            const newDay = edit.diaEntrega;
            const oldK   = Number(original.orden);
            const newK   = Number(edit.orden);

            if (newDay === oldDay) {
                
                if (newK !== oldK) {
                    const snap = await getDocs(
                        query(collection(db, 'clientes'), where('diaEntrega', '==', oldDay))
                    );
                    const items = snap.docs.map(d => ({ ref: d.ref, id: d.id, ...d.data() }));

                    if (newK < oldK) {
                        // 5 → 2  => [2..4] +1
                        items
                          .filter(c => c.id !== editId && Number(c.orden) >= newK && Number(c.orden) <= oldK - 1)
                          .forEach(c => batch.update(c.ref, {
                              orden: Number(c.orden) + 1,
                              lastModified: serverTimestamp()
                          }));
                    } else {
                        // 2 → 5  => [3..5] -1
                        items
                          .filter(c => c.id !== editId && Number(c.orden) > oldK && Number(c.orden) <= newK)
                          .forEach(c => batch.update(c.ref, {
                              orden: Number(c.orden) - 1,
                              lastModified: serverTimestamp()
                          }));
                    }
                }

                // actualizar el propio cliente payload sin id
                const payload = { ...edit, lastModified: serverTimestamp() };
                batch.update(refSelf, payload);

            } else {
                // ----- CAMBIO DE DÍA -----

                // 1) dia original: compactar "hueco" (x > oldK -1)
                const snapOld = await getDocs(
                    query(collection(db, 'clientes'), where('diaEntrega', '==', oldDay))
                );
                snapOld.docs
                  .map(d => ({ ref: d.ref, id: d.id, ...d.data() }))
                  .filter(c => c.id !== editId && Number(c.orden) > oldK)
                  .forEach(c => batch.update(c.ref, {
                      orden: Number(c.orden) - 1,
                      lastModified: serverTimestamp()
                  }));

                // dia nuevo: hacer espacio (x >= newK +1)
                const snapNew = await getDocs(
                    query(collection(db, 'clientes'), where('diaEntrega', '==', newDay))
                );
                snapNew.docs
                  .map(d => ({ ref: d.ref, ...d.data() }))
                  .filter(c => Number(c.orden) >= newK)
                  .forEach(c => batch.update(c.ref, {
                      orden: Number(c.orden) + 1,
                      lastModified: serverTimestamp()
                  }));

                // cliente con nuevo día/orden payload sin id
                const payload = { ...edit, lastModified: serverTimestamp() };
                batch.update(refSelf, payload);
            }

            
            await batch.commit();

            toast('Cliente actualizado ✔');
            clienteAEditar = null;

        } catch (err) {
            console.error('[UPDATE batch] ERROR', err);
            alert(`No se pudo actualizar. ${err?.message ?? ''}`);
        }
    }


    async function handleEliminarCliente(e) {
        const { id, nombre } = e.detail;
        const item = clientesCache.find(c => c.id === id);
        if (!item) return;

        if (confirm(`¿Eliminar a ${nombre}?`)) {
            try {
                const day = item.diaEntrega;
                const k   = Number(item.orden);

                // Traemos los del mismo día para compactar
                const snap = await getDocs(
                    query(collection(db, 'clientes'), where('diaEntrega', '==', day))
                );

                const batch = writeBatch(db);

                
                batch.delete(doc(db, 'clientes', id));

                // x > k bajan -1
                snap.docs
                  .map(d => ({ ref: d.ref, id: d.id, ...d.data() }))
                  .filter(c => c.id !== id && Number(c.orden) > k)
                  .forEach(c => batch.update(c.ref, {
                      orden: Number(c.orden) - 1,
                      lastModified: serverTimestamp()
                  }));

                
                await batch.commit();

                toast('Cliente eliminado.');
            } catch (err) {
                console.error('[DELETE batch] ERROR', err);
                alert('No se pudo eliminar.');
            }
        }
    }


    $: totalClientes = clientesCache.length;

    $: clientesFiltrados = clientesCache.filter(c => {
        if (filtroDia !== 'todos' && c.diaEntrega !== filtroDia) return false;
        if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false;
        if (filtroTerm) {
            const term = filtroTerm.toLowerCase();
            const hay =
                (c.nombre || '').toLowerCase().includes(term) ||
                (c.direccion || '').toLowerCase().includes(term) ||
                ((c.telefono ?? '') + '').toLowerCase().includes(term) ||
                (c.notas || '').toLowerCase().includes(term);
            if (!hay) return false;
        }
        return true;
    });

    $: gruposRender = dias.map(dia => ({
        dia,
        clientes: clientesFiltrados
            .filter(c => c.diaEntrega === dia)
            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    })).filter(g => g.clientes.length > 0);

    function abrirEmpezarDia() {
    if (filtroDia === 'todos') {
        alert('Elegí un día en los filtros para empezar la ruta.');
        return;
    }
    // tomar los clientes del día aplicado por el filtro, ordenados por `orden`
    clientesDelDia = clientesCache
        .filter(c => c.diaEntrega === filtroDia)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

    if (clientesDelDia.length === 0) {
        alert(`No hay clientes para ${filtroDia}.`);
        return;
    }
    mostrarEmpezar = true;
}



</script>

<div>
    <header class="sticky top-0 z-10 flex items-center justify-between bg-[#0f172a] p-4 border-b border-gray-700">
        <h1 class="text-lg font-semibold">Reparto de Agua</h1>
        <div class="flex items-center gap-3">
            <button class="text-sm text-gray-400 hover:text-white" on:click={handleRefresh}>🔁 Actualizar</button>
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

        <div class="flex items-center justify-end max-w-5xl mx-auto px-4 -mt-2">
    <button
        class="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        on:click={abrirEmpezarDia}
        disabled={filtroDia === 'todos'}>
        ▶ Empezar día {filtroDia !== 'todos' ? `(${filtroDia})` : ''}
    </button>
</div>

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

{#if mostrarEmpezar}
    <EmpezarDia
        clientes={clientesDelDia}
        on:cerrar={() => (mostrarEmpezar = false)}
        on:guardar={handleGuardarEdicion}
    />
{/if}


