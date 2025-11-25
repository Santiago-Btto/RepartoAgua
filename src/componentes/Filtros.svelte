<script>
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    export let term = '';
    export let dia = 'todos';
    export let estado = 'todos';
    export let total = 0;
    const inputClass = "w-full bg-white border border-gray-300 rounded-md p-2 text-gray-800 focus:ring-blue-500 focus:border-blue-500";
</script>

<h2 class="text-lg font-semibold">
    Clientes guardados <span class="text-gray-500">(total: {total})</span>
</h2>
<div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
    <input class="{inputClass} md:col-span-3" placeholder="Buscar..." bind:value={term} />
    <select class={inputClass} bind:value={dia}>
        <option value="todos">Todos los días</option>
        <option>lunes</option><option>martes</option><option>miercoles</option>
        <option>jueves</option><option>viernes</option><option>sabado</option><option>domingo</option>
    </select>
    <select class={inputClass} bind:value={estado}>
        <option value="todos">Todos</option>
        <option>activo</option><option>pausado</option>
    </select>
    <button class="w-full p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold" on:click={() => dispatch('crear')}>
        Crear cliente
    </button>
</div>