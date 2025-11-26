<script>
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    const dispatch = createEventDispatcher();

    // Recibe los clientes del día, YA ordenados por `orden`
    export let clientes = [];

    // precios globales que vienen de Principal.svelte
    export let preciosBase = {
        precio20: 0,
        precio12: 0,
        precioSif: 0,
        precioDisp: 0
    };

    export let startIndex = 0; // indice inicial dentro de la ruta
    let index = 0;            // índice del cliente actual

    let editable = {};        // copia editable del cliente actual

    // Datos de la entrega de hoy para el cliente actual
    let entrega = {
        cant20: '',
        cant12: '',
        cantSif: '',
        cantDisp: '',
        cobrado: '',
        medioPago: 'efectivo',
        notasEntrega: ''
    };

    let recaudadoRecorrido = 0; // acumulado de lo cobrado en este recorrido (solo UI)
    let gastoMonto = '';   // gasto total del recorrido
    let gastoNotas = '';   // descripcion breve del gasto


    // para no re-inicializar entrega en cada tecla
    let ultimoIdCliente = null;

    // acordeón de edición de cliente
    let mostrarEditarCliente = false;

    // Derivados reactivos
    $: total = clientes?.length ?? 0;
    $: clienteActual = clientes?.[index] ?? null;
    $: esUltimo = index >= total - 1;

    // cuando CAMBIA de cliente, copiamos datos e inicializamos entrega UNA vez
    $: if (clienteActual && clienteActual.id !== ultimoIdCliente) {
        ultimoIdCliente = clienteActual.id;
        editable = { ...clienteActual };

        entrega = {
            cant20: '',
            cant12: '',
            cantSif: '',
            cantDisp: '',
            cobrado: '',
            medioPago: 'efectivo',
            notasEntrega: ''
        };

        // al cambiar de cliente cerramos el acordeon
        mostrarEditarCliente = false;
    }

    // Cálculo del total de la entrega actual (usando preciosBase)
    let totalEntrega = 0;
    let cobradoNum = 0;
    let pendiente = 0;

    $: {
        const q20   = Number(entrega.cant20)  || 0;
        const q12   = Number(entrega.cant12)  || 0;
        const qSif  = Number(entrega.cantSif) || 0;
        const qDisp = Number(entrega.cantDisp)|| 0;

        const p20   = Number(preciosBase.precio20)  || 0;
        const p12   = Number(preciosBase.precio12)  || 0;
        const pSif  = Number(preciosBase.precioSif) || 0;
        const pDisp = Number(preciosBase.precioDisp)|| 0;

        totalEntrega = q20*p20 + q12*p12 + qSif*pSif + qDisp*pDisp;
        cobradoNum   = Number(entrega.cobrado) || 0;
        pendiente    = totalEntrega - cobradoNum;
    }

    function fmt(ts) {
        if (!ts) return '';
        try { return ts.toDate ? ts.toDate().toLocaleString() : new Date(ts).toLocaleString(); }
        catch { return ''; }
    }

    function mostrarStock(c) {
        const s20  = Number(c?.stock20 ?? 0);
        const s12  = Number(c?.stock12 ?? 0);
        const sif  = Number(c?.stockSif ?? 0);
        const disp = Number(c?.stockDispenser ?? 0);

        const partes = [];
        if (s20 > 0)  partes.push(`20L(${s20})`);
        if (s12 > 0)  partes.push(`12L(${s12})`);
        if (sif > 0)  partes.push(`Sif(${sif})`);
        if (disp > 0) partes.push(`Jugos/Amargos(${disp})`);

        return partes.length > 0 ? `Stock: ${partes.join(' - ')}` : 'Stock: -';
    }

    function cerrar() {
        dispatch('cerrar');
    }

    // Guarda cambios del cliente (stock / notas), usando handler del padre
    function guardar(avanzarLuego = false) {
        if (!clienteActual) return;

        const payload = {
            ...clienteActual,
            ...editable,
            id: clienteActual.id,
            diaEntrega: clienteActual.diaEntrega,
            orden: clienteActual.orden
        };

        dispatch('guardar', payload);

        if (avanzarLuego) {
            if (!esUltimo) index += 1;
            else cerrar();
        }
    }

    // Registrar entrega de hoy en Firestore (lo hace el padre)
    function registrarEntrega(avanzarLuego = false) {
        if (!clienteActual) return;

        const q20   = Number(entrega.cant20)  || 0;
        const q12   = Number(entrega.cant12)  || 0;
        const qSif  = Number(entrega.cantSif) || 0;
        const qDisp = Number(entrega.cantDisp)|| 0;

        const p20   = Number(preciosBase.precio20)  || 0;
        const p12   = Number(preciosBase.precio12)  || 0;
        const pSif  = Number(preciosBase.precioSif) || 0;
        const pDisp = Number(preciosBase.precioDisp)|| 0;

        const total = q20*p20 + q12*p12 + qSif*pSif + qDisp*pDisp;
        const cobrado = Number(entrega.cobrado) || 0;

        const estadoPago =
            cobrado >= total ? 'pagado' :
            cobrado > 0      ? 'parcial' :
                               'pendiente';

        const payload = {
            clienteId: clienteActual.id,
            nombreCliente: clienteActual.nombre,
            diaRuta: clienteActual.diaEntrega,
            entregado20: q20,
            entregado12: q12,
            entregadoSif: qSif,
            entregadoDisp: qDisp,
            precio20: p20,
            precio12: p12,
            precioSif: pSif,
            precioDisp: pDisp,
            montoTotal: total,
            montoCobrado: cobrado,
            medioPago: entrega.medioPago || 'efectivo',
            estadoPago,
            notasEntrega: entrega.notasEntrega || ''
        };

        dispatch('registrarEntrega', payload);

        recaudadoRecorrido += cobrado;

        // Reseteo cantidades y cobro (dejo medio de pago)
        entrega = {
            ...entrega,
            cant20: '',
            cant12: '',
            cantSif: '',
            cantDisp: '',
            cobrado: '',
            notasEntrega: ''
        };

        if (avanzarLuego) {
            if (!esUltimo) index += 1;
            else cerrar();
        }
    }

    function registrarGastoRecorrido() {
        if (!clienteActual) {
            cerrar();
            return;
        }

        const monto = Number(gastoMonto) || 0;

        if (monto > 0) {
            const payload = {
                diaRuta: clienteActual.diaEntrega || '',
                montoGasto: monto,
                notasGasto: gastoNotas || ''
            };

            dispatch('registrarGastoRecorrido', payload);
        }

        cerrar();
    }


    function siguiente() {
        if (!esUltimo) index += 1;
        else cerrar();
    }

    function anterior() {
        if (index > 0) index -= 1;
    }

    
    // pedir al padre que abra el modal de "crear cliente"
    function agregarClienteDesdeRuta() {
        if (!clienteActual) return;
        dispatch('agregarCliente', {
            dia: clienteActual.diaEntrega,
            ordenSugerido: Number(clienteActual.orden) + 1,
            indexActual: index
        });
    }


    // navegacion con teclado
    function onKey(e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); siguiente(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); anterior(); }
        else if (e.key === 'Enter') { e.preventDefault(); registrarEntrega(true); }
        else if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
    }

    onMount(() => {
        // si el padre envia un indice inicial valido arrancamos desde ahi
        if (typeof startIndex === 'number' && startIndex >= 0) {
            index = startIndex;
        }
        window.addEventListener('keydown', onKey);
    });
    onDestroy(() => window.removeEventListener('keydown', onKey));
</script>

<!-- Overlay fullscreen -->
<div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" on:click={cerrar}></div>

    <div class="relative w-full max-w-3xl bg-gray-50 border border-gray-300 rounded-xl shadow-xl p-6 max-h-[92vh] overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
                <span class="text-xs px-2 py-1 rounded bg-blue-900/40 text-blue-200 border border-blue-700/40">
                    {index + 1} / {total}
                </span>
                {#if clienteActual}
                    <h2 class="text-xl font-semibold">
                        {clienteActual.diaEntrega?.toUpperCase() ?? ''} • Orden {clienteActual.orden}
                    </h2>
                {/if}
            </div>
            <button class="text-gray-500 hover:text-gray-900" on:click={cerrar} aria-label="Cerrar">✕</button>
        </div>

        {#if clienteActual}
            <!-- Info cliente + stock -->
            <div class="grid gap-3 overflow-y-auto max-h-[60vh] pr-1">
                <div class="flex items-center gap-2">
                    <h3 class="text-2xl font-bold">{clienteActual.nombre}</h3>
                    <span class="ml-1 px-2 py-0.5 text-xs rounded-full {clienteActual.estado === 'activo' ? 'bg-green-700 text-green-100' : 'bg-yellow-700 text-yellow-100'}">
                        {clienteActual.estado}
                    </span>
                </div>

                <div class="text-sm text-gray-700">
                    {#if clienteActual.direccion}{clienteActual.direccion}{/if}
                    {#if clienteActual.telefono} - {clienteActual.telefono}{/if}
                </div>

                <!-- STOCK + AGREGAR CLIENTE -->
                <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-500">{mostrarStock(clienteActual)}</span>

                    <button
                        type="button"
                        class="px-3 py-1.5 rounded-md text-xs bg-blue-600 hover:bg-blue-700 text-white text-gray-900"
                        on:click={agregarClienteDesdeRuta}
                    >
                        ➕ Agregar cliente
                    </button>
                </div>

                <div class="text-xs text-gray-500">
                    Últ. mod: {fmt(clienteActual.lastModified)}
                </div>


            {#if esUltimo}
                <div class="mt-4 border-t border-gray-300 pt-3 grid grid-cols-2 gap-3">
                    <div class="col-span-2 flex items-center justify-between">
                        <span class="text-gray-700 text-sm font-semibold">
                            Gastos del recorrido
                        </span>
                        <span class="text-xs text-gray-500">
                            opcional (solo si hubo gastos)
                        </span>
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-500">Monto total de gastos</label>
                        <input
                            type="number"
                            class="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-800"
                            bind:value={gastoMonto}
                            min="0"
                        />
                    </div>

                    <div class="col-span-2 flex flex-col gap-1">
                        <label class="text-xs text-gray-500">Descripcion de los gastos</label>
                        <textarea
                            rows="2"
                            class="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-800"
                            bind:value={gastoNotas}
                        ></textarea>
                    </div>

                    <div class="col-span-2 flex justify-end gap-2 mt-2">
                        <button
                            type="button"
                            class="px-3 py-1.5 rounded-md text-sm bg-gray-200 hover:bg-gray-300"
                            on:click={cerrar}
                        >
                            Finalizar sin gastos
                        </button>
                        <button
                            type="button"
                            class="px-3 py-1.5 rounded-md text-sm bg-blue-600 hover:bg-blue-700 text-white"
                            on:click={registrarGastoRecorrido}
                        >
                            Guardar gastos y finalizar ✅
                        </button>
                    </div>
                </div>
            {/if}


                <!-- EDITAR DATOS DEL CLIENTE (ACORDEON) -->
                <div class="mt-3 border-t border-gray-300 pt-2">
                    <button
                        type="button"
                        class="w-full flex items-center justify-between text-sm text-gray-800 py-1"
                        on:click={() => (mostrarEditarCliente = !mostrarEditarCliente)}
                    >
                        <span>Editar datos del cliente (stock / notas)</span>
                        <span class="text-gray-500 text-lg">
                            {mostrarEditarCliente ? '▾' : '▸'}
                        </span>
                    </button>

                    {#if mostrarEditarCliente}
                        <div class="mt-2 grid grid-cols-2 gap-3">
                            <div class="flex flex-col gap-1">
                                <label class="text-xs text-gray-500">Stock 20L</label>
                                <input
                                    type="number"
                                    class="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-100"
                                    bind:value={editable.stock20}
                                    min="0"
                                />
                            </div>

                            <div class="flex flex-col gap-1">
                                <label class="text-xs text-gray-500">Stock 12L</label>
                                <input
                                    type="number"
                                    class="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-100"
                                    bind:value={editable.stock12}
                                    min="0"
                                />
                            </div>

                            <div class="flex flex-col gap-1">
                                <label class="text-xs text-gray-500">Sifones</label>
                                <input
                                    type="number"
                                    class="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-100"
                                    bind:value={editable.stockSif}
                                    min="0"
                                />
                            </div>

                            <div class="flex flex-col gap-1">
                                <label class="text-xs text-gray-500">Jugos / Amargos</label>
                                <input
                                    type="number"
                                    class="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-100"
                                    bind:value={editable.stockDispenser}
                                    min="0"
                                />
                            </div>

                            <div class="col-span-2 flex flex-col gap-1">
                                <label class="text-xs text-gray-500">Notas del cliente</label>
                                <textarea
                                    rows="2"
                                    class="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-100"
                                    bind:value={editable.notas}
                                ></textarea>
                            </div>

                            <div class="col-span-2 flex justify-end gap-2 mt-2">
                                <button
                                    type="button"
                                    class="px-3 py-1.5 rounded-md text-sm bg-gray-200 hover:bg-gray-300"
                                    on:click={() => guardar(false)}
                                >
                                    💾 Guardar cambios cliente
                                </button>
                                <button
                                    type="button"
                                    class="px-3 py-1.5 rounded-md text-sm bg-blue-600 hover:bg-blue-700 text-white"
                                    on:click={() => guardar(true)}
                                >
                                    {esUltimo ? 'Guardar y finalizar ✅' : 'Guardar y siguiente ▶'}
                                </button>
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- ENTREGA DEL DIA -->
                <div class="mt-4 border-t border-gray-300 pt-3 grid grid-cols-2 gap-3">
                    <div class="col-span-2 flex items-center justify-between">
                        <span class="text-gray-700 text-sm font-semibold">
                            Entrega del día
                        </span>
                        <span class="text-xs text-emerald-600">
                            Recaudado en este recorrido: ${recaudadoRecorrido}
                        </span>
                    </div>

                    <div class="col-span-2 text-xs text-gray-500">
                        Precios vigentes: 20L ${preciosBase.precio20} • 12L ${preciosBase.precio12}
                        • Sifón ${preciosBase.precioSif} • Jugos/Amargos ${preciosBase.precioDisp}
                    </div>

                    <!-- Cantidades en el orden pedido -->
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-500">Cant. Sifones</label>
                        <input
                            type="number"
                            class="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-900"
                            bind:value={entrega.cantSif}
                            min="0"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-500">Cant. 20L</label>
                        <input
                            type="number"
                            class="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-900"
                            bind:value={entrega.cant20}
                            min="0"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-500">Cant. 12L</label>
                        <input
                            type="number"
                            class="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-900"
                            bind:value={entrega.cant12}
                            min="0"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-500">Cant. Jugos / Amargos</label>
                        <input
                            type="number"
                            class="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-900"
                            bind:value={entrega.cantDisp}
                            min="0"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-500">Monto cobrado</label>
                        <input
                            type="number"
                            class="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-900"
                            bind:value={entrega.cobrado}
                            min="0"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-500">Medio de pago</label>
                        <select
                            class="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-900"
                            bind:value={entrega.medioPago}
                        >
                            <option value="efectivo">efectivo</option>
                            <option value="mercado_pago">mercado pago</option>
                            <option value="fiado">fiado</option>
                        </select>
                    </div>

                    <div class="col-span-2 text-sm text-gray-700 mt-1">
                        Total entrega: <span class="font-semibold">${totalEntrega}</span> •
                        Cobrado: <span class="font-semibold">${cobradoNum}</span> •
                        Pendiente: <span class="font-semibold text-amber-500">${pendiente}</span>
                    </div>

                    <div class="col-span-2 flex flex-col gap-1">
                        <label class="text-xs text-gray-500">Notas de la entrega</label>
                        <textarea
                            rows="2"
                            class="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-900"
                            bind:value={entrega.notasEntrega}
                        ></textarea>
                    </div>

                    <div class="col-span-2 flex justify-end gap-2 mt-2">
                        <button
                            type="button"
                            class="px-3 py-1.5 rounded-md text-sm bg-emerald-300 hover:bg-emerald-700"
                            on:click={() => registrarEntrega(false)}
                        >
                            💾 Registrar entrega
                        </button>
                        <button
                            type="button"
                            class="px-3 py-1.5 rounded-md text-sm bg-blue-500 hover:bg-blue-700 text-white"
                            on:click={() => registrarEntrega(true)}
                        >
                            {esUltimo ? 'Registrar y finalizar ✅' : 'Registrar y siguiente ▶'}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Navegacion simple -->
            <div class="mt-4 flex items-center justify-between">
                <button
                    class="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                    on:click={anterior}
                    disabled={index === 0}
                >
                    ◀ Anterior
                </button>

                <button
                    class="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
                    on:click={siguiente}
                >
                    {esUltimo ? 'Finalizar' : 'Siguiente ▶'}
                </button>
            </div>
        {:else}
            <div class="text-center text-gray-500">No hay clientes para mostrar.</div>
        {/if}
    </div>
</div>
