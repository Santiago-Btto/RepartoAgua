<script>
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    const dispatch = createEventDispatcher();

    // Recibe los clientes del día, YA ordenados por `orden`
    export let clientes = [];
    // Precios base (vienen del Principal)
    export let preciosBase = {
        precio20: 0,
        precio12: 0,
        precioSif: 0,
        precioDisp: 0
    };

    let index = 0;            // índice del cliente actual
    let editable = {};        // copia editable del cliente actual

    // Datos de la entrega de hoy para el cliente actual
    let entrega = {
        cant20: '',
        cant12: '',
        cantSif: '',
        cantDisp: '',
        precio20: '',
        precio12: '',
        precioSif: '',
        precioDisp: '',
        cobrado: '',
        medioPago: 'efectivo',
        notasEntrega: ''
    };

    let recaudadoRecorrido = 0; // acumulado de lo cobrado en este recorrido (solo UI)

    // Derivados reactivos
    $: total = clientes?.length ?? 0;
    $: clienteActual = clientes?.[index] ?? null;
    $: esUltimo = index >= total - 1;

    // --- evitar que se resetee entrega en cada tecla ---
    let ultimoIdCliente = null;

    // Cuando CAMBIA de cliente, copiamos datos e inicializamos entrega UNA vez
    $: if (clienteActual && clienteActual.id !== ultimoIdCliente) {
        ultimoIdCliente = clienteActual.id;

        editable = { ...clienteActual };

        entrega = {
            cant20: '',
            cant12: '',
            cantSif: '',
            cantDisp: '',
            // arrancan con precios base
            precio20: String(preciosBase?.precio20 ?? ''),
            precio12: String(preciosBase?.precio12 ?? ''),
            precioSif: String(preciosBase?.precioSif ?? ''),
            precioDisp: String(preciosBase?.precioDisp ?? ''),
            cobrado: '',
            medioPago: 'efectivo',
            notasEntrega: ''
        };
    }

    // ---- Cálculos numéricos de la entrega actual ----
    $: q20   = Number(entrega.cant20)   || 0;
    $: q12   = Number(entrega.cant12)   || 0;
    $: qSif  = Number(entrega.cantSif)  || 0;
    $: qDisp = Number(entrega.cantDisp) || 0;

    $: p20   = Number(entrega.precio20)   || 0;
    $: p12   = Number(entrega.precio12)   || 0;
    $: pSif  = Number(entrega.precioSif)  || 0;
    $: pDisp = Number(entrega.precioDisp) || 0;

    $: totalEntrega = q20 * p20 + q12 * p12 + qSif * pSif + qDisp * pDisp;
    $: cobradoNum   = Number(entrega.cobrado) || 0;
    $: pendiente    = totalEntrega - cobradoNum;

    // -------- utilidades --------
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
        if (disp > 0) partes.push(`Disp(${disp})`);

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

        const total = totalEntrega;
        const cobrado = cobradoNum;

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

        // Actualizo recaudado local
        recaudadoRecorrido += cobrado;

        // Reseteo cantidades y cobro (dejo precios como están)
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

    function siguiente() {
        if (!esUltimo) index += 1;
        else cerrar();
    }

    function anterior() {
        if (index > 0) index -= 1;
    }

    // Navegación con teclado
    function onKey(e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); siguiente(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); anterior(); }
        else if (e.key === 'Enter') { e.preventDefault(); registrarEntrega(true); }
        else if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
    }

    onMount(() => window.addEventListener('keydown', onKey));
    onDestroy(() => window.removeEventListener('keydown', onKey));
</script>

<!-- Overlay fullscreen -->
<div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" on:click={cerrar}></div>

    <div class="relative w-full max-w-3xl bg-[#0c1124] border border-gray-700 rounded-xl shadow-xl p-6 max-h-[92vh] overflow-hidden">
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
            <button class="text-gray-400 hover:text-white" on:click={cerrar} aria-label="Cerrar">✕</button>
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

                <div class="text-sm text-gray-300">
                    {#if clienteActual.direccion}{clienteActual.direccion}{/if}
                    {#if clienteActual.telefono} - {clienteActual.telefono}{/if}
                </div>

                <div class="text-sm text-gray-400">
                    {mostrarStock(clienteActual)}
                </div>

                <div class="text-xs text-gray-500">
                    Últ. mod: {fmt(clienteActual.lastModified)}
                </div>

                <!-- FORM EDITABLE (stock / notas del cliente) -->
                <div class="mt-3 border-t border-gray-700 pt-3 grid grid-cols-2 gap-3">
                    <div class="col-span-2 text-gray-300 text-sm font-semibold">
                        Editar datos del cliente (stock / notas)
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-400">Stock 20L</label>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-100"
                            bind:value={editable.stock20}
                            min="0"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-400">Stock 12L</label>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-100"
                            bind:value={editable.stock12}
                            min="0"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-400">Sifones</label>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-100"
                            bind:value={editable.stockSif}
                            min="0"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-400">Dispensers</label>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-100"
                            bind:value={editable.stockDispenser}
                            min="0"
                        />
                    </div>

                    <div class="col-span-2 flex flex-col gap-1">
                        <label class="text-xs text-gray-400">Notas del cliente</label>
                        <textarea
                            rows="2"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-100"
                            bind:value={editable.notas}
                        ></textarea>
                    </div>

                    <div class="col-span-2 flex justify-end gap-2 mt-2">
                        <button
                            type="button"
                            class="px-3 py-1.5 rounded-md text-sm bg-gray-700 hover:bg-gray-600"
                            on:click={() => guardar(false)}
                        >
                            💾 Guardar cambios cliente
                        </button>
                        <button
                            type="button"
                            class="px-3 py-1.5 rounded-md text-sm bg-blue-600 hover:bg-blue-700"
                            on:click={() => guardar(true)}
                        >
                            {esUltimo ? 'Guardar y finalizar ✅' : 'Guardar y siguiente ▶'}
                        </button>
                    </div>
                </div>

                <!-- ENTREGA DEL DIA -->
                <div class="mt-4 border-t border-gray-700 pt-3 grid grid-cols-2 gap-3">
                    <div class="col-span-2 flex items-center justify-between">
                        <span class="text-gray-300 text-sm font-semibold">
                            Entrega del día
                        </span>
                        <span class="text-xs text-emerald-300">
                            Recaudado en este recorrido: ${recaudadoRecorrido}
                        </span>
                    </div>

                    <!-- Cantidades -->
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-400">Cant. 20L</label>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-100"
                            bind:value={entrega.cant20}
                            min="0"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-400">Cant. 12L</label>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-100"
                            bind:value={entrega.cant12}
                            min="0"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-400">Cant. Sifones</label>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-100"
                            bind:value={entrega.cantSif}
                            min="0"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-400">Cant. Dispensers</label>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-100"
                            bind:value={entrega.cantDisp}
                            min="0"
                        />
                    </div>

                    <!-- Precios -->
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-400">Precio 20L</label>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-100"
                            bind:value={entrega.precio20}
                            min="0"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-400">Precio 12L</label>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-100"
                            bind:value={entrega.precio12}
                            min="0"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-400">Precio Sifón</label>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-100"
                            bind:value={entrega.precioSif}
                            min="0"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-400">Precio Dispenser</label>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-100"
                            bind:value={entrega.precioDisp}
                            min="0"
                        />
                    </div>

                    <!-- Cobro -->
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-400">Monto cobrado</label>
                        <input
                            type="number"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-100"
                            bind:value={entrega.cobrado}
                            min="0"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-400">Medio de pago</label>
                        <select
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-100"
                            bind:value={entrega.medioPago}
                        >
                            <option value="efectivo">efectivo</option>
                            <option value="transferencia">transferencia</option>
                            <option value="mercado_pago">mercado pago</option>
                            <option value="otro">otro</option>
                        </select>
                    </div>

                    <div class="col-span-2 text-sm text-gray-300 mt-1">
                        Total entrega: <span class="font-semibold">${totalEntrega}</span> •
                        Cobrado: <span class="font-semibold">${cobradoNum}</span> •
                        Pendiente: <span class="font-semibold text-amber-300">${pendiente}</span>
                    </div>

                    <div class="col-span-2 flex flex-col gap-1">
                        <label class="text-xs text-gray-400">Notas de la entrega</label>
                        <textarea
                            rows="2"
                            class="bg-[#0b1020] border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-100"
                            bind:value={entrega.notasEntrega}
                        ></textarea>
                    </div>

                    <div class="col-span-2 flex justify-end gap-2 mt-2">
                        <button
                            type="button"
                            class="px-3 py-1.5 rounded-md text-sm bg-emerald-600 hover:bg-emerald-700"
                            on:click={() => registrarEntrega(false)}
                        >
                            💾 Registrar entrega
                        </button>
                        <button
                            type="button"
                            class="px-3 py-1.5 rounded-md text-sm bg-blue-600 hover:bg-blue-700"
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
                    class="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                    on:click={anterior}
                    disabled={index === 0}
                >
                    ◀ Anterior
                </button>

                <button
                    class="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600"
                    on:click={siguiente}
                >
                    {esUltimo ? 'Finalizar' : 'Siguiente ▶'}
                </button>
            </div>
        {:else}
            <div class="text-center text-gray-400">No hay clientes para mostrar.</div>
        {/if}
    </div>
</div>
