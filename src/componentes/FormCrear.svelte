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
        notas: '',
        dispenser: false
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
            notas: (src.notas || '').trim(),
            dispenser: src.dispenser
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

    const inputClass = "w-full bg-white border border-gray-300 rounded-md p-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500 shadow-sm";
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm"
        on:click={() => !guardando && dispatch('cerrar')}
    ></div>

    <div class="relative w-full max-w-3xl bg-white border border-gray-300 rounded-lg shadow-lg p-6 max-h-[500px]">
        <h3 class="text-xl font-semibold mb-4">Crear cliente</h3>

        <form on:submit|preventDefault={handleSubmit}>
            <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto p-1">
                <h3 class="text-base font-semibold text-gray-900 col-span-full border-b border-gray-300 pb-1 mb-1">
                    Datos Generales:
                </h3>
                <div>
                    <p class="text-sm text-gray-500">Nombre</p>
                    <input class={inputClass} placeholder="Nombre" required bind:value={data.nombre} />
                </div>
                <div>
                    <p class="text-sm text-gray-500">Dirección</p>
                    <input class={inputClass} placeholder="Dirección" bind:value={data.direccion} />
                </div>
                <div>
                    <p class="text-sm text-gray-500">Teléfono</p>
                    <input class={inputClass} placeholder="Teléfono" bind:value={data.telefono} />
                </div>
                <div>
                    <p class="text-sm text-gray-500">Día de entrega</p>
                    <select class={inputClass} required bind:value={data.diaEntrega}>
                        <option value="" disabled>Seleccionar...</option>
                        <option>lunes</option><option>martes</option><option>miercoles</option>
                        <option>jueves</option><option>viernes</option><option>sabado</option><option>domingo</option>
                    </select>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Estado</p>
                    <select class={inputClass} required bind:value={data.estado}>
                        <option>activo</option><option>pausado</option>
                    </select>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Orden</p>
                    <input class={inputClass} type="number" min="0" placeholder="Ej: 1" bind:value={data.orden} />
                </div>
                <h3 class="text-base font-semibold text-gray-900 col-span-full border-b border-gray-300 pb-1 mt-4 mb-1">
                    Stock:
                </h3>
                <div>
                    <p class="text-sm text-gray-500">20 Litros</p>
                    <input class={inputClass} type="number" min="0" placeholder="0" bind:value={data.stock20} />
                </div>
                <div>
                    <p class="text-sm text-gray-500">12 Litros</p>
                    <input class={inputClass} type="number" min="0" placeholder="0" bind:value={data.stock12} />
                </div>
                <div>
                    <p class="text-sm text-gray-500">Sifones</p>
                    <input class={inputClass} type="number" min="0" placeholder="0" bind:value={data.stockSif} />
                </div>
                <div>
                    <p class="text-sm text-gray-500">Dispenser</p>
                    <input class={inputClass} type="number" min="0" placeholder="0" bind:value={data.stockDispenser} />
                </div>
                <div>
                    <p class="text-sm text-gray-500 mb-2">¿Tiene Dispenser?</p>
                    
                    <button 
                        title=""
                        type="button" 
                        class="relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-0 {data.dispenser ? 'bg-green-500' : 'bg-gray-200'}"
                        on:click={() => data.dispenser = !data.dispenser}
                    >
                        <span 
                            class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 {data.dispenser ? 'translate-x-6' : 'translate-x-1'}"
                        ></span>
                    </button>
                    
                    <span class="ml-2 text-sm {data.dispenser ? 'bg-green-500' : 'bg-gray-300'}">
                        {data.dispenser ? 'Si' : 'No'}
                    </span>
                </div>
                <div class="col-span-full mt-2">
                    <p class="text-sm text-gray-500">Notas</p>
                    <textarea class="{inputClass}" placeholder="Notas adicionales..." rows="2" bind:value={data.notas}></textarea>
                </div>
            </div>

            <div class="w-full flex justify-center items-center gap-3 mt-4">
                <button type="button" class="px-2 py-2 rounded-md bg-gray-200 hover:bg-gray-300 w-[152px] h-10" on:click={() => !guardando && dispatch('cerrar')}>
                    Cancelar
                </button>

                <button
                    type="submit"
                    class="px-2 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white w-[152px] h-10 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={guardando}
                >
                    {guardando ? 'Guardando…' : 'Confirmar'}
                </button>
            </div>
        </form>
    </div>
</div>
