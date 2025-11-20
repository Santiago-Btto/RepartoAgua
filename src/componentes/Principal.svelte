<script>
    import { onMount } from 'svelte';
    import { db } from '../firebase.js';
    import {
        collection, onSnapshot, doc,
        serverTimestamp, query, orderBy,
        getDocs, where, writeBatch, addDoc,
        getDoc, setDoc
    } from "firebase/firestore";

    import Estadisticas from './Estadisticas.svelte';
    import FormCrear from './FormCrear.svelte';
    import ListaClientes from './ListaClientes.svelte';
    import ModalEditar from './ModalEditar.svelte';
    import Filtros from './Filtros.svelte';
    import EmpezarDia from './EmpezarDia.svelte';

    // vista actual
    let vista = 'clientes';          // 'clientes' | 'estadisticas'

    // modal empezar día
    let mostrarEmpezar = false;
    let clientesDelDia = [];

    // precios base (config global)
    let preciosBase = {
        precio20: 0,
        precio12: 0,
        precioSif: 0,
        precioDisp: 0
    };

    let clientesCache = [];
    let syncMsg = '';
    let toastMsg = '';
    let filtroTerm = '';
    let filtroDia = 'todos';
    let filtroEstado = 'todos';
    let clienteAEditar = null;
    let clienteACrear = false;
    let volverALaRuta = false;
    let diaPorDefecto = '';  // defaults cuando se crea cliente desde recorrido
    let ordenPorDefecto = '';

    // acordeón de eliminados
    let mostrarEliminados = false;

    // filtro de motivo para eliminados
    let filtroMotivoElim = 'todos';

    const dias = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

    // motivos fijos para baja
    const MOTIVOS_ELIM = [
        { clave: 'mala_atencion',  p: 'Mala atención del personal' },
        { clave: 'mala_calidad',   p: 'Mala calidad de producto' },
        { clave: 'costo_elevado',  p: 'Elevado costo del producto' },
        { clave: 'competencia',    p: 'Competencia (bajo costo)' }
    ];

    const setSync = (text) => { syncMsg = text || ''; };
    const toast = (msg) => { toastMsg = msg; setTimeout(() => (toastMsg = ''), 2200); };

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
            notas: (data.notas || '').trim()
        };
    }

    // ---- CONFIG DE PRECIOS ----
    async function cargarPrecios() {
        try {
            const ref = doc(db, 'config', 'precios');
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const data = snap.data();
                preciosBase = {
                    precio20: Number(data.precio20) || 0,
                    precio12: Number(data.precio12) || 0,
                    precioSif: Number(data.precioSif) || 0,
                    precioDisp: Number(data.precioDisp) || 0
                };
            }
        } catch (err) {
            console.error('[CONFIG precios] ERROR carga', err);
        }
    }

    async function guardarPrecios() {
        try {
            const ref = doc(db, 'config', 'precios');
            await setDoc(ref, {
                precio20: Number(preciosBase.precio20) || 0,
                precio12: Number(preciosBase.precio12) || 0,
                precioSif: Number(preciosBase.precioSif) || 0,
                precioDisp: Number(preciosBase.precioDisp) || 0,
                actualizadoEn: serverTimestamp()
            });
            toast('Precios guardados ✔');
        } catch (err) {
            console.error('[CONFIG precios] ERROR guardado', err);
            alert('No se pudieron guardar los precios.');
        }
    }

    // -------- Live sync --------
    onMount(() => {
        const q = query(collection(db, 'clientes'), orderBy('nombre'));
        const unsubscribe = onSnapshot(q, (snap) => {
            setSync('🔄 Sincronizando...');
            clientesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTimeout(() => setSync(''), 800);
        });

        window.addEventListener('online', () => setSync('Conectado • sincronizando...'));
        window.addEventListener('offline', () => setSync('Sin conexión (modo offline)'));

        // carga config de precios
        cargarPrecios();

        return unsubscribe;
    });

    async function handleRefresh() {
        setSync('🔄 Actualizando...');
        await getDocs(query(collection(db, 'clientes'), orderBy('nombre')));
        setTimeout(() => setSync(''), 800);
    }

    // -------- CREAR --------
    async function handleCrearCliente(e) {
        const data = normalizarCliente(e.detail);
        if (!data.nombre || !data.diaEntrega || !data.orden) {
            alert('Completá nombre, orden y día.');
            return;
        }

        try {
            const day = data.diaEntrega;
            const k = Number(data.orden);

            const snap = await getDocs(
                query(collection(db, 'clientes'), where('diaEntrega', '==', day))
            );

            const batch = writeBatch(db);

            // correr ordenes
            snap.docs
                .map(d => ({ ref: d.ref, ...d.data() }))
                .filter(c => Number(c.orden) >= k)
                .forEach(c => batch.update(c.ref, {
                    orden: Number(c.orden) + 1,
                    lastModified: serverTimestamp()
                }));

            const newRef = doc(collection(db, 'clientes'));
            batch.set(newRef, {
                ...data,
                creadoEn: serverTimestamp(),
                lastModified: serverTimestamp()
            });

            await batch.commit();

            clienteACrear = false;
            toast(`Cliente guardado ✔ (insertado en orden ${k})`);
            if (volverALaRuta) {
            mostrarEmpezar = true;
            volverALaRuta = false;
            }   
        } catch (err) {
            console.error('[ADD batch] ERROR', err);
            alert(`❌ No se pudo guardar. ${err?.message ?? ''}`);
        }
    }

    // -------- EDITAR --------
    async function handleGuardarEdicion(e) {
        const incoming = e.detail;
        const editId = incoming.id;
        const edit = normalizarCliente(incoming);
        const original = clientesCache.find(c => c.id === editId);
        if (!original) { alert('Cliente no encontrado.'); return; }

        try {
            const batch = writeBatch(db);
            const refSelf = doc(db, 'clientes', editId);

            const oldDay = original.diaEntrega;
            const newDay = edit.diaEntrega;
            const oldK = Number(original.orden);
            const newK = Number(edit.orden);

            if (newDay === oldDay) {
                if (newK !== oldK) {
                    const snap = await getDocs(
                        query(collection(db, 'clientes'), where('diaEntrega', '==', oldDay))
                    );
                    const items = snap.docs.map(d => ({ ref: d.ref, id: d.id, ...d.data() }));

                    if (newK < oldK) {
                        items
                            .filter(c => c.id !== editId && Number(c.orden) >= newK && Number(c.orden) <= oldK - 1)
                            .forEach(c => batch.update(c.ref, {
                                orden: Number(c.orden) + 1,
                                lastModified: serverTimestamp()
                            }));
                    } else {
                        items
                            .filter(c => c.id !== editId && Number(c.orden) > oldK && Number(c.orden) <= newK)
                            .forEach(c => batch.update(c.ref, {
                                orden: Number(c.orden) - 1,
                                lastModified: serverTimestamp()
                            }));
                    }
                }

                const payload = { ...edit, lastModified: serverTimestamp() };
                batch.update(refSelf, payload);
            } else {
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

    // -------- REGISTRAR ENTREGA --------
    async function handleRegistrarEntrega(e) {
        const data = e.detail;
        try {
            await addDoc(collection(db, 'entregas'), {
                ...data,
                fecha: serverTimestamp()
            });
            toast('Entrega registrada ✔');
        } catch (err) {
            console.error('[ENTREGA] ERROR', err);
            alert('No se pudo registrar la entrega.');
        }
    }

    // -------- ELIMINAR (soft delete) --------
    async function handleEliminarCliente(e) {
        const { id, nombre } = e.detail;
        const item = clientesCache.find(c => c.id === id);
        if (!item) return;

        const confirmar = confirm(`¿Eliminar a ${nombre} del recorrido?`);
        if (!confirmar) return;

        // elegir motivo entre las 4 opciones
        let mensaje = 'Elegí el motivo de eliminación (1-4):\n\n';
        MOTIVOS_ELIM.forEach((m, i) => {
            mensaje += `${i + 1}) ${m.p}\n`;
        });

        const input = prompt(mensaje);
        if (input === null) return;

        const num = Number(input.trim());
        const motivoSel = MOTIVOS_ELIM[num - 1];
        if (!motivoSel) {
            alert('Opción inválida. No se eliminó el cliente.');
            return;
        }

        try {
            const day = item.diaEntrega;
            const k = Number(item.orden);

            const snap = await getDocs(
                query(collection(db, 'clientes'), where('diaEntrega', '==', day))
            );

            const batch = writeBatch(db);
            const refSelf = doc(db, 'clientes', id);

            batch.update(refSelf, {
                estado: 'eliminado',
                motivoBaja: motivoSel.p,
                motivoClave: motivoSel.clave,
                fechaBaja: serverTimestamp(),
                lastModified: serverTimestamp()
            });

            snap.docs
                .map(d => ({ ref: d.ref, id: d.id, ...d.data() }))
                .filter(c => c.id !== id && Number(c.orden) > k)
                .forEach(c => batch.update(c.ref, {
                    orden: Number(c.orden) - 1,
                    lastModified: serverTimestamp()
                }));

            await batch.commit();

            toast('Cliente movido a eliminados.');
        } catch (err) {
            console.error('[DELETE soft] ERROR', err);
            alert('No se pudo eliminar.');
        }
    }

    // -------- Derivados --------
    $: totalClientes = clientesCache.filter(c => c.estado !== 'eliminado').length;

    $: clientesFiltrados = clientesCache.filter(c => {
        if (c.estado === 'eliminado') return false;
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

    function safeTime(ts) {
        if (!ts) return '';
        try { return ts.toDate ? ts.toDate().toLocaleString() : new Date(ts).toLocaleString(); }
        catch { return ''; }
    }

    // base: todos los eliminados
    $: clientesEliminadosBase = clientesCache
        .filter(c => c.estado === 'eliminado');

    // list para mostrar según filtro de motivo
    $: clientesEliminados = clientesEliminadosBase
        .filter(c => filtroMotivoElim === 'todos' ? true : c.motivoClave === filtroMotivoElim)
        .sort((a, b) => {
            const ta = a.fechaBaja?.seconds ?? 0;
            const tb = b.fechaBaja?.seconds ?? 0;
            return tb - ta;
        });

    // conteos por motivo
    $: conteosMotivo = {
        mala_atencion: clientesEliminadosBase.filter(c => c.motivoClave === 'mala_atencion').length,
        mala_calidad:  clientesEliminadosBase.filter(c => c.motivoClave === 'mala_calidad').length,
        costo_elevado: clientesEliminadosBase.filter(c => c.motivoClave === 'costo_elevado').length,
        competencia:   clientesEliminadosBase.filter(c => c.motivoClave === 'competencia').length
    };

    // mientras el recorrido esta abierto, mantengo sincronizada la lista del dia
    $: if (mostrarEmpezar && filtroDia !== 'todos') {
        clientesDelDia = clientesCache
            .filter(c => c.diaEntrega === filtroDia && c.estado !== 'eliminado')
            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    }

    // -------- Empezar dia --------
    function abrirEmpezarDia() {
        if (filtroDia === 'todos') {
            alert('Elegí un día en los filtros para empezar la ruta.');
            return;
        }
        clientesDelDia = clientesCache
            .filter(c => c.diaEntrega === filtroDia && c.estado !== 'eliminado')
            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

        if (clientesDelDia.length === 0) {
            alert(`No hay clientes para ${filtroDia}.`);
            return;
        }
        mostrarEmpezar = true;
    }

    // handler cuando EmpezarDia pide crear un cliente
    function handleAgregarClienteDesdeRuta(e) {
        const { dia, ordenSugerido } = e.detail || {};
        diaPorDefecto = dia || filtroDia;
        ordenPorDefecto = ordenSugerido ?? '';
        volverALaRuta = true;
        mostrarEmpezar = false;
        clienteACrear = true;
    }
</script>

<div>
    <!-- HEADER -->
    <header class="sticky top-0 z-10 flex items-center justify-between bg-[#0f172a] p-4 border-b border-gray-700">
        <h1 class="text-lg font-semibold">Reparto de Agua 🚍</h1>

        <div class="flex items-center gap-3">
            <div class="flex items-center gap-1 text-xs md:text-sm">
                <button
                    class="px-2 py-1 rounded-md border
                        {vista === 'clientes'
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800'}"
                    on:click={() => vista = 'clientes'}
                >
                    📋 Clientes
                </button>
                <button
                    class="px-2 py-1 rounded-md border
                        {vista === 'estadisticas'
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800'}"
                    on:click={() => vista = 'estadisticas'}
                >
                    📊 Estadísticas
                </button>
            </div>

            <button class="text-sm text-gray-400 hover:text-white" on:click={handleRefresh}>
                🔁 Actualizar
            </button>
            <small class="text-gray-500">{syncMsg}</small>
        </div>
    </header>

    {#if vista === 'clientes'}
        <!-- VISTA CLIENTES -->
        <div class="max-w-5xl mx-auto p-4 grid gap-4">
            <Filtros
                bind:term={filtroTerm}
                bind:dia={filtroDia}
                bind:estado={filtroEstado}
                total={totalClientes}
                    on:crear={() => {
                    diaPorDefecto = '';
                    ordenPorDefecto = '';
                    clienteACrear = true;
                }}
            />

            <!-- PRECIOS BASE -->
            <section class="bg-[#111828] border border-gray-700 rounded-lg p-3 text-sm">
                <div class="flex items-center justify-between mb-2">
                    <span class="font-semibold text-gray-200">Precios actuales</span>
                    <button
                        type="button"
                        class="px-3 py-1 rounded-md text-xs bg-gray-700 hover:bg-gray-600"
                        on:click={guardarPrecios}
                    >
                        💾 Guardar precios
                    </button>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div class="flex flex-col gap-1">
                        <p class="text-xs text-gray-400">20L</p>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-100"
                            bind:value={preciosBase.precio20}
                            min="0"
                        />
                    </div>
                    <div class="flex flex-col gap-1">
                        <p class="text-xs text-gray-400">12L</p>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-100"
                            bind:value={preciosBase.precio12}
                            min="0"
                        />
                    </div>
                    <div class="flex flex-col gap-1">
                        <p class="text-xs text-gray-400">Sifón</p>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-100"
                            bind:value={preciosBase.precioSif}
                            min="0"
                        />
                    </div>
                    <div class="flex flex-col gap-1">
                        <p class="text-xs text-gray-400">Jugos o Amargos</p>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-100"
                            bind:value={preciosBase.precioDisp}
                            min="0"
                        />
                    </div>
                </div>
            </section>

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
                    on:editar={e => (clienteAEditar = e.detail)}
                    on:eliminar={handleEliminarCliente}
                />
            </section>
        </div>

        {#if clientesEliminadosBase.length}
            <div class="max-w-5xl mx-auto px-4 pb-6">
                <section class="bg-[#111828] border border-red-800/60 rounded-lg mt-4 overflow-hidden">
                    <!-- "Acordeon" -->
                    <button
                        type="button"
                        class="w-full flex items-center justify-between px-4 py-3 text-sm"
                        on:click={() => (mostrarEliminados = !mostrarEliminados)}
                    >
                        <div class="flex items-center gap-2">
                            <h2 class="font-semibold text-red-300">
                                Clientes eliminados
                            </h2>
                            <span class="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-100">
                                {clientesEliminadosBase.length}
                            </span>
                        </div>
                        <span class="text-gray-400 text-lg">
                            {mostrarEliminados ? '▾' : '▸'}
                        </span>
                    </button>

                    {#if mostrarEliminados}
                        <div class="border-t border-red-800/60 p-4 max-h-80 overflow-y-auto">
                            <!-- Filtros por motivo -->
                            <div class="flex flex-wrap items-center gap-2 mb-3 text-xs">
                                <span class="text-gray-300 mr-1">Motivo:</span>

                                <button
                                    type="button"
                                    class="px-2 py-1 rounded-full border
                                        {filtroMotivoElim === 'todos'
                                            ? 'bg-red-700 text-white border-red-500'
                                            : 'bg-transparent text-red-200 border-red-700 hover:bg-red-900/40'}"
                                    on:click={() => filtroMotivoElim = 'todos'}
                                >
                                    Todos ({clientesEliminadosBase.length})
                                </button>

                                <button
                                    type="button"
                                    class="px-2 py-1 rounded-full border
                                        {filtroMotivoElim === 'mala_atencion'
                                            ? 'bg-red-700 text-white border-red-500'
                                            : 'bg-transparent text-red-200 border-red-700 hover:bg-red-900/40'}"
                                    on:click={() => filtroMotivoElim = 'mala_atencion'}
                                >
                                    Mala atención ({conteosMotivo.mala_atencion})
                                </button>

                                <button
                                    type="button"
                                    class="px-2 py-1 rounded-full border
                                        {filtroMotivoElim === 'mala_calidad'
                                            ? 'bg-red-700 text-white border-red-500'
                                            : 'bg-transparent text-red-200 border-red-700 hover:bg-red-900/40'}"
                                    on:click={() => filtroMotivoElim = 'mala_calidad'}
                                >
                                    Mala calidad ({conteosMotivo.mala_calidad})
                                </button>

                                <button
                                    type="button"
                                    class="px-2 py-1 rounded-full border
                                        {filtroMotivoElim === 'costo_elevado'
                                            ? 'bg-red-700 text-white border-red-500'
                                            : 'bg-transparent text-red-200 border-red-700 hover:bg-red-900/40'}"
                                    on:click={() => filtroMotivoElim = 'costo_elevado'}
                                >
                                    Costo elevado ({conteosMotivo.costo_elevado})
                                </button>

                                <button
                                    type="button"
                                    class="px-2 py-1 rounded-full border
                                        {filtroMotivoElim === 'competencia'
                                            ? 'bg-red-700 text-white border-red-500'
                                            : 'bg-transparent text-red-200 border-red-700 hover:bg-red-900/40'}"
                                    on:click={() => filtroMotivoElim = 'competencia'}
                                >
                                    Competencia ({conteosMotivo.competencia})
                                </button>
                            </div>

                            <ul class="space-y-2">
                                {#each clientesEliminados as c (c.id)}
                                    <li class="bg-[#0c1124] border border-gray-700 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                        <div>
                                            <div class="flex items-center gap-2">
                                                <span class="font-semibold">{c.nombre}</span>
                                                <span class="px-2 py-0.5 text-xs rounded-full bg-red-800 text-red-100">
                                                    eliminado
                                                </span>
                                            </div>
                                            <p class="text-xs text-gray-400">
                                                {#if c.diaEntrega}Día: {c.diaEntrega} • {/if}
                                                Orden anterior: {c.orden ?? '-'}
                                            </p>
                                            <p class="text-xs text-gray-500 mt-1">
                                                Motivo: {c.motivoBaja ?? '—'}
                                            </p>
                                        </div>
                                        <div class="text-xs text-gray-500">
                                            Fecha baja: {safeTime(c.fechaBaja)}
                                        </div>
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                </section>
            </div>
        {/if}
    {:else}
        <!-- ESTADISTICAS -->
        <Estadisticas />
    {/if}

    {#if clienteAEditar}
        <ModalEditar
            cliente={clienteAEditar}
            on:guardar={handleGuardarEdicion}
            on:cerrar={() => (clienteAEditar = null)}
        />
    {/if}

    {#if clienteACrear}
    <FormCrear
        on:crear={handleCrearCliente}
        on:cerrar={() => {
            clienteACrear = false;
            // si veníamos desde Empezar Día, lo reabrimos
            if (volverALaRuta) {
                mostrarEmpezar = true;
                volverALaRuta = false;
            }
            }}
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
        preciosBase={preciosBase}
        on:cerrar={() => (mostrarEmpezar = false)}
        on:guardar={handleGuardarEdicion}
        on:registrarEntrega={handleRegistrarEntrega}
        on:agregarCliente={handleAgregarClienteDesdeRuta}
        />
    {/if}
