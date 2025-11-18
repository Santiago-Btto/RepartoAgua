<script>
    import { onMount } from 'svelte';
    import { db } from '../firebase.js';
    import {
        collection,
        query,
        orderBy,
        onSnapshot
    } from 'firebase/firestore';

    let entregas = [];
    let syncMsg = '';

    // filtros realmente aplicados
    let filtroDiaRuta = 'todos';   // lunes, martes... o todos
    let filtroPeriodo = 'hoy';     // hoy, 7dias, 30dias, todo

    // valores que se editan en los <select>
    let uiFiltroDiaRuta = 'todos';
    let uiFiltroPeriodo = 'hoy';

    // token para forzar recálculo de los $:
    let recalcToken = 0;

    // ---- carga en vivo de entregas ----
    onMount(() => {
        const q = query(
            collection(db, 'entregas'),
            orderBy('fecha', 'desc')
        );

        syncMsg = 'Cargando entregas...';
        const unsubscribe = onSnapshot(q, (snap) => {
            entregas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            syncMsg = `Total entregas cargadas: ${entregas.length}`;
            // cada vez que llegan datos nuevos, volvemos a filtrar
            recalcToken++;
        });

        return unsubscribe;
    });

    // helper: pasar Timestamp / Date a Date JS
    function toJsDate(ts) {
        if (!ts) return null;
        try {
            return ts.toDate ? ts.toDate() : new Date(ts);
        } catch {
            return null;
        }
    }

    // helper: formatear fecha
    function fmtFecha(ts) {
        const d = toJsDate(ts);
        if (!d) return '';
        return d.toLocaleString();
    }

    // determinar si entra en el periodo seleccionado
    function estaEnPeriodo(entrega) {
        const d = toJsDate(entrega.fecha);
        if (!d) return false;

        const ahora = new Date();
        const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        const fechaEntrega = new Date(d.getFullYear(), d.getMonth(), d.getDate());

        if (filtroPeriodo === 'todo') return true;

        if (filtroPeriodo === 'hoy') {
            return fechaEntrega.getTime() === hoy.getTime();
        }

        if (filtroPeriodo === '7dias') {
            const hace7 = new Date(hoy);
            hace7.setDate(hoy.getDate() - 7);
            return fechaEntrega >= hace7 && fechaEntrega <= hoy;
        }

        if (filtroPeriodo === '30dias') {
            const hace30 = new Date(hoy);
            hace30.setDate(hoy.getDate() - 30);
            return fechaEntrega >= hace30 && fechaEntrega <= hoy;
        }

        return true;
    }

    // aplicar filtros desde la UI
    function aplicarFiltros() {
        filtroPeriodo = uiFiltroPeriodo;
        filtroDiaRuta = uiFiltroDiaRuta;
        recalcToken++;    // fuerza recálculo
    }

    // resetear filtros a valores por defecto
    function resetFiltros() {
        uiFiltroPeriodo = 'hoy';
        uiFiltroDiaRuta = 'todos';
        filtroPeriodo = 'hoy';
        filtroDiaRuta = 'todos';
        recalcToken++;
    }

    // ---- filtro principal sobre las entregas ----
    // recalcToken en la tupla garantiza que SIEMPRE se vuelva a evaluar
    $: entregasFiltradas = (recalcToken, entregas).filter(e => {
        if (filtroDiaRuta !== 'todos' && e.diaRuta !== filtroDiaRuta) return false;
        if (!estaEnPeriodo(e)) return false;
        return true;
    });

    // ---- métricas agregadas ----
    $: totalVentas = entregasFiltradas.reduce(
        (acc, e) => acc + (Number(e.montoTotal) || 0),
        0
    );
    $: totalCobrado = entregasFiltradas.reduce(
        (acc, e) => acc + (Number(e.montoCobrado) || 0),
        0
    );
    $: totalPendiente = totalVentas - totalCobrado;

    $: total20 = entregasFiltradas.reduce(
        (acc, e) => acc + (Number(e.entregado20) || 0),
        0
    );
    $: total12 = entregasFiltradas.reduce(
        (acc, e) => acc + (Number(e.entregado12) || 0),
        0
    );
    $: totalSif = entregasFiltradas.reduce(
        (acc, e) => acc + (Number(e.entregadoSif) || 0),
        0
    );
    $: totalDisp = entregasFiltradas.reduce(
        (acc, e) => acc + (Number(e.entregadoDisp) || 0),
        0
    );
</script>

<div class="max-w-5xl mx-auto p-4 grid gap-4">
    <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
            <h2 class="text-xl font-semibold">📊 Estadísticas de entregas</h2>
            <p class="text-xs text-gray-400 mt-1">{syncMsg}</p>
        </div>

        <!-- Filtros -->
        <div class="flex flex-wrap gap-2 text-sm items-center">
            <select
                bind:value={uiFiltroPeriodo}
                class="bg-[#0c1222] border border-gray-700 rounded-md px-2 py-1 text-gray-200"
            >
                <option value="hoy">Hoy</option>
                <option value="7dias">Últimos 7 días</option>
                <option value="30dias">Últimos 30 días</option>
                <option value="todo">Todo</option>
            </select>

            <select
                bind:value={uiFiltroDiaRuta}
                class="bg-[#0c1222] border border-gray-700 rounded-md px-2 py-1 text-gray-200"
            >
                <option value="todos">Todos los días</option>
                <option value="lunes">lunes</option>
                <option value="martes">martes</option>
                <option value="miercoles">miercoles</option>
                <option value="jueves">jueves</option>
                <option value="viernes">viernes</option>
                <option value="sabado">sabado</option>
                <option value="domingo">domingo</option>
            </select>

            <button
                type="button"
                class="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                on:click={aplicarFiltros}
            >
                Aplicar filtros
            </button>

            <button
                type="button"
                class="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-100"
                on:click={resetFiltros}
            >
                Reset
            </button>
        </div>
    </header>

    <!-- Cards de resumen -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="bg-[#111828] border border-gray-700 rounded-lg p-3">
            <p class="text-xs text-gray-400">Ventas (monto total)</p>
            <p class="text-2xl font-semibold mt-1">${totalVentas}</p>
        </div>
        <div class="bg-[#111828] border border-gray-700 rounded-lg p-3">
            <p class="text-xs text-gray-400">Cobrado</p>
            <p class="text-2xl font-semibold mt-1 text-emerald-300">${totalCobrado}</p>
        </div>
        <div class="bg-[#111828] border border-gray-700 rounded-lg p-3">
            <p class="text-xs text-gray-400">Pendiente de cobro</p>
            <p class="text-2xl font-semibold mt-1 text-amber-300">${totalPendiente}</p>
        </div>
    </section>

    <!-- Totales de unidades -->
    <section class="bg-[#111828] border border-gray-700 rounded-lg p-3">
        <h3 class="text-sm font-semibold text-gray-200 mb-2">Unidades entregadas</h3>
        <p class="text-sm text-gray-300">
            20L: <span class="font-semibold">{total20}</span> &nbsp;•&nbsp;
            12L: <span class="font-semibold">{total12}</span> &nbsp;•&nbsp;
            Sifones: <span class="font-semibold">{totalSif}</span> &nbsp;•&nbsp;
            Jugos o Amargos: <span class="font-semibold">{totalDisp}</span>
        </p>
    </section>


    <!-- Tabla de entregas -->
    <section class="bg-[#111828] border border-gray-700 rounded-lg p-3">
        <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold text-gray-200">
                Entregas filtradas ({entregasFiltradas.length})
            </h3>
        </div>

        {#if entregasFiltradas.length === 0}
            <p class="text-xs text-gray-500">No hay entregas para los filtros seleccionados.</p>
        {:else}
            <div class="overflow-x-auto text-xs">
                <table class="min-w-full border-collapse">
                    <thead>
                        <tr class="border-b border-gray-700 text-gray-400">
                            <th class="py-1 pr-2 text-left">Fecha</th>
                            <th class="py-1 px-2 text-left">Cliente</th>
                            <th class="py-1 px-2 text-left">Día</th>
                            <th class="py-1 px-2 text-right">Cant.</th>
                            <th class="py-1 px-2 text-right">Venta</th>
                            <th class="py-1 px-2 text-right">Cobrado</th>
                            <th class="py-1 px-2 text-right">Pendiente</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each entregasFiltradas as e (e.id)}
                            <tr class="border-b border-gray-800">
                                <td class="py-1 pr-2 align-top">{fmtFecha(e.fecha)}</td>
                                <td class="py-1 px-2 align-top">{e.nombreCliente}</td>
                                <td class="py-1 px-2 align-top">{e.diaRuta}</td>
                                <td class="py-1 px-2 text-right align-top">
                                    20L: {e.entregado20 || 0}<br />
                                    12L: {e.entregado12 || 0}<br />
                                    Sif: {e.entregadoSif || 0}<br />
                                    Jugos/Amargos: {e.entregadoDisp || 0}
                                </td>
                                <td class="py-1 px-2 text-right align-top">
                                    ${e.montoTotal || 0}
                                </td>
                                <td class="py-1 px-2 text-right align-top text-emerald-300">
                                    ${e.montoCobrado || 0}
                                </td>
                                <td class="py-1 px-2 text-right align-top text-amber-300">
                                    {(Number(e.montoTotal) || 0) - (Number(e.montoCobrado) || 0)}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </section>
</div>
