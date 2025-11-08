<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
    export let grupos = [];

    function fmt(ts) {
        if (!ts) return '';
        try {
            return ts.toDate ? ts.toDate().toLocaleString() : new Date(ts).toLocaleString();
        } catch { return ''; }
    }

    // mostrar stock
    function mostrarStock(c) {
        const s20 = c.stock20 ?? 0;
        const s12 = c.stock12 ?? 0;
        const sif = c.stockSif ?? 0;
        const disp = c.stockDispenser ?? 0; 

        // mostrar valor de stocks > 0
        const partes = [];
        if (s20) partes.push(`20L(${s20})`);
        if (s12) partes.push(`12L(${s12})`);
        if (sif) partes.push(`Sif(${sif})`);
        if (disp) partes.push(`Disp(${disp})`);

        return partes.length > 0 ? `Stock: ${partes.join(' - ')}` : 'Stock: -';
    }
</script>

<div>
    {#if grupos.length === 0}
        <div class="p-4 text-gray-500">No hay clientes para mostrar.</div>
    {:else}
        {#each grupos as grupo (grupo.dia)}
            <h3 class="font-semibold text-blue-300 mt-4 mb-2 text-lg">
                {grupo.dia.toUpperCase()}
            </h3>
            {#each grupo.clientes as c (c.id)}
                <div class="flex justify-between bg-[#0c1124] border border-gray-700 rounded-lg mb-2 p-3">
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
                            <button class="text-sm text-gray-400 hover:text-white" on:click={() => dispatch('editar', c)}>Editar</button>
                            <button class="text-sm text-red-400 hover:text-red-300" on:click={() => dispatch('eliminar', c)}>Eliminar</button>
                        </div>
                    </div>
                </div>
            {/each}
        {/each}
    {/if}
</div>
