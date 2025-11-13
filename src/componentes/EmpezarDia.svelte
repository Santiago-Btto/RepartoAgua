<script>
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    const dispatch = createEventDispatcher();

    // Recibe los clientes del día, YA ordenados por `orden`
    export let clientes = [];

    let index = 0;            // índice del cliente actual
    let editable = {};        // copia editable del cliente actual

    // Derivados reactivos
    $: total = clientes?.length ?? 0;
    $: clienteActual = clientes?.[index] ?? null;

    // Cada vez que cambia el cliente actual, actualizamos la copia editable
    $: if (clienteActual) {
        editable = { ...clienteActual };
    }

    $: esUltimo = index >= total - 1;

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

    // Guarda cambios del cliente actual (dispara a Principal.handleGuardarEdicion)
    function guardar(avanzarLuego = false) {
        if (!clienteActual) return;

        // Nos aseguramos de mantener id, diaEntrega y orden
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

    function siguiente() {
        // Podrías hacer guardar(true) si querés guardar siempre al avanzar
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
        else if (e.key === 'Enter') { e.preventDefault(); guardar(true); }
        else if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
    }

    onMount(() => window.addEventListener('keydown', onKey));
    onDestroy(() => window.removeEventListener('keydown', onKey));
</script>


<div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" on:click={cerrar}></div>

    <div class="relative w-full max-w-3xl bg-[#0c1124] border border-gray-700 rounded-xl shadow-xl p-6 max-h-[92vh] overflow-hidden">
        
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
            <!-- contenido del cliente -->
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

                <!-- editar (stock y notas) -->
                <div class="mt-3 border-t border-gray-700 pt-3 grid grid-cols-2 gap-3">
                    <div class="col-span-2 text-gray-300 text-sm font-semibold">
                        Editar valores para este cliente
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
                        <label class="text-xs text-gray-400">Notas</label>
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
                            💾 Guardar cambios
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
            </div>

            <!-- navegacion -->
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
