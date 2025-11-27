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
    let gastos = [];

    // filtros realmente aplicados
    let filtroDiaRuta = 'todos';   // lunes, martes... o todos
    let filtroPeriodo = 'hoy';     // hoy, 7dias, 30dias, todo
    let filtroNombre = '';         // nombre de cliente aplicado

    // valores que se editan en la UI
    let uiFiltroDiaRuta = 'todos';
    let uiFiltroPeriodo = 'hoy';
    let uiFiltroNombre = '';       // texto del input

    // token para forzar recálculo de los $:
    let recalcToken = 0;

    // ---- carga en vivo de entregas ----
    onMount(() => {
        const qEnt = query(
            collection(db, 'entregas'),
            orderBy('fecha', 'desc')
        );

        syncMsg = 'Cargando entregas...';
        const unsubEnt = onSnapshot(qEnt, (snap) => {
            entregas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            syncMsg = `Total entregas cargadas: ${entregas.length}`;
            recalcToken++;
        });

        const qGas = query(
            collection(db, 'gastosRecorrido'),
            orderBy('fecha', 'desc')
        );

        const unsubGas = onSnapshot(qGas, (snap) => {
            gastos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            recalcToken++;
        });

        return () => {
            unsubEnt();
            unsubGas();
        };
    });


    function toJsDate(ts) {
        if (!ts) return null;
        try {
            return ts.toDate ? ts.toDate() : new Date(ts);
        } catch {
            return null;
        }
    }

    function fmtFecha(ts) {
        const d = toJsDate(ts);
        if (!d) return '';
        return d.toLocaleString();
    }

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
        filtroNombre = (uiFiltroNombre || '').trim().toLowerCase();
        recalcToken++;
    }

    // resetear filtros a valores por defecto
    function resetFiltros() {
        uiFiltroPeriodo = 'hoy';
        uiFiltroDiaRuta = 'todos';
        uiFiltroNombre = '';

        filtroPeriodo = 'hoy';
        filtroDiaRuta = 'todos';
        filtroNombre = '';

        recalcToken++;
    }

    // ---- filtro principal sobre las entregas ----
    $: entregasFiltradas = (recalcToken, entregas).filter(e => {
        if (filtroDiaRuta !== 'todos' && e.diaRuta !== filtroDiaRuta) return false;
        if (!estaEnPeriodo(e)) return false;

        if (filtroNombre) {
            const nombre = (e.nombreCliente || '').toLowerCase();
            if (!nombre.includes(filtroNombre)) return false;
        }
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

    $: gastosFiltrados = (recalcToken, gastos).filter(g => {
        if (filtroDiaRuta !== 'todos' && g.diaRuta !== filtroDiaRuta) return false;
        if (!estaEnPeriodo(g)) return false;
    return true;
    });

    // gastos por categoría (después de gastosFiltrados)
    $: totalGastoAgua = gastosFiltrados.reduce(
        (acc, g) => acc + (Number(g.gastoAgua) || 0),
        0
    );
    $: totalGastoSoda = gastosFiltrados.reduce(
        (acc, g) => acc + (Number(g.gastoSoda) || 0),
        0
    );
    $: totalGastoCombustible = gastosFiltrados.reduce(
        (acc, g) => acc + (Number(g.gastoCombustible) || 0),
        0
    );
    $: totalGastoExtra = gastosFiltrados.reduce(
        (acc, g) => acc + (Number(g.gastoExtra) || 0),
        0
    );

    // total de gastos del periodo / día
    $: totalGastos = totalGastoAgua + totalGastoSoda + totalGastoCombustible + totalGastoExtra;

  
    $: saldoNeto = totalCobrado - totalGastos;



    $: conteoMedios = entregasFiltradas.reduce((acc, e) => {
        const medio = e.medioPago || 'sin_dato';
        acc[medio] = (acc[medio] || 0) + 1;
        return acc;
    }, {});

    // tipo de pago
    $: cantEfectivo    = conteoMedios.efectivo     || 0;
    $: cantMercadoPago = conteoMedios.mercado_pago || 0;
    $: cantFiado       = conteoMedios.fiado        || 0;
</script>

<div class="max-w-5xl mx-auto p-4 grid gap-4">
    <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
            <h2 class="text-xl font-semibold">📊 Estadísticas de entregas</h2>
            <p class="text-xs text-gray-500 mt-1">{syncMsg}</p>
            {#if filtroNombre}
                <p class="text-xs text-blue-600 mt-1">
                    Mostrando movimientos de: <span class="font-semibold">{uiFiltroNombre}</span>
                </p>
            {/if}
        </div>

        <!-- Filtros -->
        <div class="flex flex-wrap gap-2 text-sm items-center">
            <!-- Buscar cliente -->
            <input
                type="text"
                placeholder="Buscar cliente..."
                class="bg-white border border-gray-300 rounded-md px-2 py-1 text-gray-800 w-40 md:w-52"
                bind:value={uiFiltroNombre}
            />

            <select
                bind:value={uiFiltroPeriodo}
                class="bg-white border border-gray-300 rounded-md px-2 py-1 text-gray-800"
            >
                <option value="hoy">Hoy</option>
                <option value="7dias">Últimos 7 días</option>
                <option value="30dias">Últimos 30 días</option>
                <option value="todo">Todo</option>
            </select>

            <select
                bind:value={uiFiltroDiaRuta}
                class="bg-white border border-gray-300 rounded-md px-2 py-1 text-gray-800"
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
                class="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-gray-900"
                on:click={aplicarFiltros}
            >
                Aplicar filtros
            </button>

            <button
                type="button"
                class="px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300"
                on:click={resetFiltros}
            >
                Reset
            </button>
        </div>
    </header>

    <!-- Cards de resumen -->
    <section class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div class="bg-[#111828] border border-gray-700 rounded-lg p-3">
            <p class="text-xs text-gray-400">Ventas (monto total)</p>
            <p class="text-2xl font-semibold mt-1 text-green-500">${totalVentas}</p>
    </div>
        <div class="bg-[#111828] border border-gray-700 rounded-lg p-3">
            <p class="text-xs text-gray-400">Cobrado</p>
            <p class="text-2xl font-semibold mt-1 text-emerald-300">${totalCobrado}</p>
    </div>
        <div class="bg-[#111828] border border-gray-700 rounded-lg p-3">
            <p class="text-xs text-gray-400">Gastos del recorrido</p>
            <p class="text-2xl font-semibold mt-1 text-red-300">${totalGastos}</p>
    </div>
        <div class="bg-[#111828] border border-gray-700 rounded-lg p-3">
            <p class="text-xs text-gray-400">Saldo neto (cobrado - gastos)</p>
            <p class="text-2xl font-semibold mt-1 text-sky-300">${saldoNeto}</p>
    </div>
</section>

        <!-- Gastos por categoría -->
    <section class="bg-white border border-gray-300 rounded-lg p-3">
        <h3 class="text-sm font-semibold text-gray-800 mb-2">Gastos por categoría</h3>
        <p class="text-sm text-gray-700">
            Agua: <span class="font-semibold">${totalGastoAgua}</span> &nbsp;•&nbsp;
            Soda: <span class="font-semibold">${totalGastoSoda}</span> &nbsp;•&nbsp;
            Combustible: <span class="font-semibold">${totalGastoCombustible}</span> &nbsp;•&nbsp;
            Extra: <span class="font-semibold">${totalGastoExtra}</span>
        </p>
</section>



    <!-- Totales de unidades -->
    <section class="bg-white border border-gray-300 rounded-lg p-3">
        <h3 class="text-sm font-semibold text-gray-800 mb-2">Unidades entregadas</h3>
        <p class="text-sm text-gray-700">
            20L: <span class="font-semibold">{total20}</span> &nbsp;•&nbsp;
            12L: <span class="font-semibold">{total12}</span> &nbsp;•&nbsp;
            Sifones: <span class="font-semibold">{totalSif}</span> &nbsp;•&nbsp;
            Jugos o Amargos: <span class="font-semibold">{totalDisp}</span>
        </p>
    </section>

    <!-- Tabla de entregas -->
    <section class="bg-white border border-gray-300 rounded-lg p-3">
        <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold text-gray-800">
                Entregas filtradas ({entregasFiltradas.length})
            </h3>
        </div>

        {#if entregasFiltradas.length === 0}
            <p class="text-xs text-gray-500">No hay entregas para los filtros seleccionados.</p>
        {:else}
            <div class="overflow-x-auto text-xs">
                <table class="min-w-full border-collapse">
                    <thead>
                        <tr class="border-b border-gray-300 text-gray-500">
                            <th class="py-1 pr-2 text-left">Fecha</th>
                            <th class="py-1 px-2 text-left">Cliente</th>
                            <th class="py-1 px-2 text-left">Día</th>
                            <th class="py-1 px-2 text-right">Cant.</th>
                            <th class="py-1 px-2 text-right">Venta</th>
                            <th class="py-1 px-2 text-right">Cobrado</th>
                            <th class="py-1 px-2 text-right">Pendiente</th>
                            <th class="py-1 px-2 text-left">Medio pago</th>
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
                                <td class="py-1 px-2 text-right align-top text-emerald-600">
                                    ${e.montoCobrado || 0}
                                </td>
                                <td class="py-1 px-2 text-right align-top text-amber-500">
                                    {(Number(e.montoTotal) || 0) - (Number(e.montoCobrado) || 0)}
                                </td>
                                <td class="py-1 px-2 align-top">
                                    {e.medioPago || 'sin dato'}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
                <p class="text-xs text-gray-500 mt-2">
                efectivo: {cantEfectivo} •
                mercado pago: {cantMercadoPago} •
                fiado: {cantFiado}
            </p>
        {/if}
    </section>
</div>
