<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
    let data = {
        nombre: '', direccion: '', telefono: '', diaEntrega: '', estado: 'activo',
        stock20: 0, stock12: 0, stockSif: 0, notas: ''
    };
    function handleSubmit() {
        if (!data.nombre || !data.diaEntrega) {
            alert('Completá nombre y día.'); return;
        }
        dispatch('crear', data);
        data = {
            nombre: '', direccion: '', telefono: '', diaEntrega: '', estado: 'activo',
            stock20: 0, stock12: 0, stockSif: 0, notas: ''
        };
    }
    const inputClass = "w-full bg-[#0c1222] border border-gray-700 rounded-md p-2 text-gray-200 focus:ring-blue-500 focus:border-blue-500";
</script>

<form class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3" on:submit|preventDefault={handleSubmit}>
    <input class={inputClass} placeholder="Nombre" required bind:value={data.nombre} />
    <input class={inputClass} placeholder="Dirección" bind:value={data.direccion} />
    <input class={inputClass} placeholder="Teléfono" bind:value={data.telefono} />
    <select class={inputClass} required bind:value={data.diaEntrega}>
        <option value="" disabled>Día de entrega</option>
        <option>lunes</option><option>martes</option><option>miercoles</option>
        <option>jueves</option><option>viernes</option><option>sabado</option><option>domingo</option>
    </select>
    <select class={inputClass} required bind:value={data.estado}>
        <option>activo</option><option>pausado</option>
    </select>
    <input class={inputClass} type="number" min="0" placeholder="Stock 20 L" bind:value={data.stock20} />
    <input class={inputClass} type="number" min="0" placeholder="Stock 12 L" bind:value={data.stock12} />
    <input class={inputClass} type="number" min="0" placeholder="Stock Sifones" bind:value={data.stockSif} />
    <textarea class="{inputClass} md:col-span-2 lg:col-span-4" placeholder="Notas" rows="2" bind:value={data.notas}></textarea>
    <button class="md:col-span-2 lg:col-span-4 p-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold">
        Guardar cliente
    </button>
</form>