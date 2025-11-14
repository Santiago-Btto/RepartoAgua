<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
    export let grupos = [];

    // estado abierto/cerrado por día (todos cerrados por defecto)
    let abiertos = {};

    function toggle(dia) {
        abiertos[dia] = !abiertos[dia];
    }

    function fmt(ts) {
        if (!ts) return '';
        try {
            return ts.toDate ? ts.toDate().toLocaleString() : new Date(ts).toLocaleString();
        } catch {
            return '';
        }
    }

    // mostrar stock (items > 0 por cliente)
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

    // totales por dia (siempre muestra las 4 categorias)
    function totalesDiaTexto(grupo) {
        let t20 = 0, t12 = 0, tsif = 0, tdisp = 0;
        for (const c of (grupo?.clientes ?? [])) {
            t20   += Number(c?.stock20 ?? 0);
            t12   += Number(c?.stock12 ?? 0);
            tsif  += Number(c?.stockSif ?? 0);
            tdisp += Number(c?.stockDispenser ?? 0);
        }
        return `Total día: 20L(${t20}) - 12L(${t12}) - Sif(${tsif}) - Disp(${tdisp})`;
    }
</script>

<div>
    {#if grupos.length === 0}
        <div class="p-4 text-gray-500">No hay clientes para mostrar.</div>
    {:else}
        {#each grupos as grupo (grupo.dia)}
            <!-- CABECERA DESPLEGABLE DEL DIA -->
            <button
                class="w-full flex justify-between items-center bg-[#0c1124] border border-gray-700 rounded-lg px-4 py-2 mt-4 text-left"
                on:click={() => toggle(grupo.dia)}
            >
                <div class="flex flex-col">
                    <span class="text-blue-300 font-semibold text-lg">
                        {grupo.dia.toUpperCase()}
                        <span class="ml-2 text-gray-400">({grupo.clientes.length})</span>
                    </span>
                </div>

                <span class="text-gray-300 text-sm">
                    {abiertos[grupo.dia] ? '▲' : '▼'}
                </span>
            </button>

            {#if abiertos[grupo.dia]}
                <!-- totales del dia -->
                <p class="text-xs text-gray-400 mt-1 px-1">
                    {totalesDiaTexto(grupo)}
                </p>

                <!-- Lista de clientes del dia -->
                {#each grupo.clientes as c (c.id)}
                    <div class="flex justify-between bg-[#0c1124] border border-gray-700 rounded-lg mb-2 p-3 mt-1">
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center gap-2">
                                <p class="text-lg">{c.nombre}</p>
                                <span class="ml-2 px-2 py-0.5 text-xs rounded-full {c.estado === 'activo' ? 'bg-green-700 text-green-100' : 'bg-yellow-700 text-yellow-100'}">
                                    {c.estado}
                                </span>
                            </div>
                            <p class="text-sm text-gray-300">
                                {c.direccion ?? ''} - {c.telefono ?? ''}
                            </p>
                            <p class="text-sm text-gray-400">{mostrarStock(c)}</p>
                            <p class="text-gray-500 text-xs">Mod: {fmt(c.lastModified)}</p>
                        </div>
                        <div class="flex flex-col">
                            <p class="text-sm text-end mb-7">Orden: {c.orden}</p>
                            <div class="flex gap-2">
                                <button
                                    class="text-sm text-gray-400 hover:text-white"
                                    on:click={() => dispatch('editar', c)}
                                >
                                    Editar
                                </button>
                                <button
                                    class="text-sm text-red-400 hover:text-red-300"
                                    on:click={() => dispatch('eliminar', c)}
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                {/each}
            {/if}
        {/each}
    {/if}
</div>
