<script>
    import { createEventDispatcher } from 'svelte';
    export let cliente;
    const dispatch = createEventDispatcher();
    let data = { ...cliente };
    const inputClass = "w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-gray-200 focus:ring-blue-500 focus:border-blue-500";
    function handleSave() {
        dispatch('guardar', data);
        dispatch('cerrar')
    }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" on:click={() => dispatch('cerrar')}></div>
    <div class="relative w-full max-w-3xl bg-[#0c1222] border border-gray-700 rounded-lg shadow-lg p-6 max-h-[500px]">
        <h3 class="text-xl font-semibold mb-4">Editar cliente</h3>
        <form on:submit|preventDefault={handleSave}>
            <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto p-1">
                <h3 class="text-base font-semibold text-white col-span-full border-b border-gray-700 pb-1 mb-1">
                    Datos Generales:
                </h3>
                <div>
                    <p class="text-sm text-gray-400">Nombre</p>
                    <input class={inputClass} placeholder="Nombre" required bind:value={data.nombre} />
                </div>
                <div>
                    <p class="text-sm text-gray-400">Dirección</p>
                    <input class={inputClass} placeholder="Dirección" bind:value={data.direccion} />
                </div>
                <div>
                    <p class="text-sm text-gray-400">Teléfono</p>
                    <input class={inputClass} placeholder="Teléfono" bind:value={data.telefono} />
                </div>
                <div>
                    <p class="text-sm text-gray-400">Día de entrega</p>
                    <select class={inputClass} required bind:value={data.diaEntrega}>
                        <option value="" disabled>Seleccionar...</option>
                        <option>lunes</option><option>martes</option><option>miercoles</option>
                        <option>jueves</option><option>viernes</option><option>sabado</option><option>domingo</option>
                    </select>
                </div>
                <div>
                    <p class="text-sm text-gray-400">Estado</p>
                    <select class={inputClass} required bind:value={data.estado}>
                        <option>activo</option><option>pausado</option>
                    </select>
                </div>
                <div>
                    <p class="text-sm text-gray-400">Orden</p>
                    <input class={inputClass} type="number" min="0" placeholder="Ej: 1" bind:value={data.orden} />
                </div>
                <h3 class="text-base font-semibold text-white col-span-full border-b border-gray-700 pb-1 mt-4 mb-1">
                    Stock:
                </h3>
                <div>
                    <p class="text-sm text-gray-400">20 Litros</p>
                    <input class={inputClass} type="number" min="0" placeholder="0" bind:value={data.stock20} />
                </div>
                <div>
                    <p class="text-sm text-gray-400">12 Litros</p>
                    <input class={inputClass} type="number" min="0" placeholder="0" bind:value={data.stock12} />
                </div>
                <div>
                    <p class="text-sm text-gray-400">Sifones</p>
                    <input class={inputClass} type="number" min="0" placeholder="0" bind:value={data.stockSif} />
                </div>
                <div>
                    <p class="text-sm text-gray-400">Dispenser</p>
                    <input class={inputClass} type="number" min="0" placeholder="0" bind:value={data.stockDispenser} />
                </div>
                <div class="col-span-full mt-2">
                    <p class="text-sm text-gray-400">Notas</p>
                    <textarea class="{inputClass}" placeholder="Notas adicionales..." rows="2" bind:value={data.notas}></textarea>
                </div>
            </div>
            <div class="w-full flex justify-center items-center gap-3 mt-4">
                <button type="button" class="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600" on:click={() => dispatch('cerrar')}>
                Cancelar
                </button>
                <button type="submit" class="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700">
                Guardar cambios
                </button>
            </div>
        </form>
    </div>
</div>