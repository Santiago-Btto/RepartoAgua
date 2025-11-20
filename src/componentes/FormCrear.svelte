<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let guardando = false; 
    export let diaInicial = '';
    export let ordenInicial = '';

    let data = {
        nombre: '',
        direccion: '',
        telefono: '',
        diaEntrega: '',
        estado: 'activo',
        stock20: '',
        stock12: '',
        stockSif: '',
        stockDispenser: '',
        orden: '',
        notas: ''
    };

    $: if (diaInicial && data.diaEntrega !== diaInicial) {
        data.diaEntrega = diaInicial;
    }
    $: if (ordenInicial && !data.orden) {
        data.orden = ordenInicial;
    }

    function sanitizeForCreate(src) {
        return {
            nombre: (src.nombre || '').trim(),
            direccion: (src.direccion || '').trim(),
            telefono: (src.telefono ?? '').toString().trim(),
            diaEntrega: src.diaEntrega,
            estado: src.estado || 'activo',
            stock20: Number(src.stock20) || 0,
            stock12: Number(src.stock12) || 0,
            stockSif: Number(src.stockSif) || 0,
            stockDispenser: Number(src.stockDispenser) || 0,
            orden: Number(src.orden),
            notas: (src.notas || '').trim()
        };
    }

    function handleSubmit() {
        if (!data.nombre || !data.diaEntrega || !data.orden) {
            alert('Completá nombre, orden y día.');
            return;
        }
        const payload = sanitizeForCreate(data);
        dispatch('crear', payload); // el padre guarda, cierra y muestra el mensaje
    }

    const inputClass =
        "w-full bg-[#0c1222] border border-gray-700 rounded-md p-2 text-gray-200 focus:ring-blue-500 focus:border-blue-500";
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm"
        on:click={() => !guardando && dispatch('cerrar')}
    ></div>

    <div class="relative w-full max-w-3xl bg-[#0c1222] border border-gray-700 rounded-lg shadow-lg p-6 max-h-[500px]">
        <h3 class="text-xl font-semibold mb-4">Crear cliente</h3>

        <form on:submit|preventDefault={handleSubmit}>
            <div class="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-h-[350px] overflow-y-auto">
                <input class={inputClass} placeholder="Nombre *" required bind:value={data.nombre} />
                <input class={inputClass} placeholder="Dirección" bind:value={data.direccion} />
                <input class={inputClass} type="number" placeholder="Teléfono" bind:value={data.telefono} />

                <select class={inputClass} required bind:value={data.diaEntrega}>
                    <option value="" disabled>Día de entrega *</option>
                    <option>lunes</option><option>martes</option><option>miercoles</option>
                    <option>jueves</option><option>viernes</option><option>sabado</option><option>domingo</option>
                </select>

                <select class={inputClass} bind:value={data.estado}>
                    <option>activo</option><option>pausado</option>
                </select>

                <input class={inputClass} type="number" min="0" placeholder="Stock 20 L" bind:value={data.stock20} />
                <input class={inputClass} type="number" min="0" placeholder="Stock 12 L" bind:value={data.stock12} />
                <input class={inputClass} type="number" min="0" placeholder="Stock Sifones" bind:value={data.stockSif} />
                <input class={inputClass} type="number" min="0" placeholder="Stock Dispenser" bind:value={data.stockDispenser} />
                <input class={inputClass} type="number" min="0" placeholder="Orden *" required bind:value={data.orden} />

                <textarea class={`${inputClass} md:col-span-2 lg:col-span-4`} placeholder="Notas" rows="2" bind:value={data.notas}></textarea>
            </div>

            <div class="w-full flex justify-center items-center gap-3 mt-4">
                <button type="button" class="px-2 py-2 rounded-md bg-gray-700 hover:bg-gray-600 w-[152px] h-10" on:click={() => !guardando && dispatch('cerrar')}>
                    Cancelar
                </button>

                <button
                    type="submit"
                    class="px-2 py-2 rounded-md bg-blue-600 hover:bg-blue-700 w-[152px] h-10 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={guardando}
                >
                    {guardando ? 'Guardando…' : 'Confirmar'}
                </button>
            </div>
        </form>
    </div>
</div>
