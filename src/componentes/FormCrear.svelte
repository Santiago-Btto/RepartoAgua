<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
    let data = {
        nombre: '', direccion: '', telefono: undefined, diaEntrega: '', estado: 'activo',
        stock20: undefined, stock12: undefined, stockSif: undefined, stockDispenser: undefined, orden: undefined, notas: ''
    };

    function handleSubmit() {
        if (!data.nombre || !data.diaEntrega || !data.orden) {
            alert('Completá nombre, orden y día.'); return;
        }
        dispatch('crear', data);
        dispatch('cerrar')
    }

    const inputClass = "w-full bg-[#0c1222] border border-gray-700 rounded-md p-2 text-gray-200 focus:ring-blue-500 focus:border-blue-500";
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" on:click={() => dispatch('cerrar')}></div>
    <div class="relative w-full max-w-3xl bg-[#0c1222] border border-gray-700 rounded-lg shadow-lg p-6 max-h-[500px]">
        <h3 class="text-xl font-semibold mb-4">Crear cliente</h3>
        <form on:submit|preventDefault={handleSubmit}>
            <div class="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-h-[350px] overflow-y-auto">
                <input class={inputClass} placeholder="Nombre" required bind:value={data.nombre} />
                <input class={inputClass} placeholder="Dirección" bind:value={data.direccion} />
                <input class={inputClass} type="number" placeholder="Teléfono" bind:value={data.telefono} />
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
                <input class={inputClass} type="number" min="0" placeholder="Stock Dispenser" bind:value={data.stockDispenser} />
                <input class={inputClass} type="number" min="0" placeholder="Orden" bind:value={data.orden} />
                <textarea class="{inputClass} md:col-span-2 lg:col-span-4" placeholder="Notas" rows="2" bind:value={data.notas}></textarea>
            </div>
            <div class="w-full flex justify-center items-center gap-3 mt-4">
                <button type="button" class="px-2 py-2 rounded-md bg-gray-700 hover:bg-gray-600 w-[152px] h-10" on:click={() => dispatch('cerrar')}>
                    Cancelar
                </button>
                <button type="submit" class="px-2 py-2 rounded-md bg-blue-600 hover:bg-blue-700 w-[152px] h-10">
                    Confirmar
                </button>
            </div>
        </form>
    </div>
</div>