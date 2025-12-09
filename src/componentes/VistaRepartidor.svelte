<script>
    export let dia = 'todos';
    export let filtroDia;
    export let abrirEmpezarDia;
    
    // Mejoramos el estilo del input para que coincida con la estética de tu login
    const inputClass = "w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none transition-colors";
</script>

<div class="w-full max-w-md mx-auto p-4">
    
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col gap-3">
        
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Filtrar Ruta
        </p>

        <div class="flex flex-col sm:flex-row gap-3 items-stretch">
            <div class="flex-grow">
                <select class={inputClass} bind:value={dia}>
                    <option value="lunes">Lunes</option>
                    <option value="martes">Martes</option>
                    <option value="miercoles">Miércoles</option>
                    <option value="jueves">Jueves</option>
                    <option value="viernes">Viernes</option>
                    <option value="sabado">Sábado</option>
                    <option value="domingo">Domingo</option>
                </select>
            </div>

            <button
                class="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white transition-all shadow-sm
                {filtroDia === 'todos' 
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'}"
                on:click={abrirEmpezarDia}
                disabled={filtroDia === 'todos'}
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                </svg>
                
                <span>
                    Empezar
                    {#if filtroDia !== 'todos'}
                        <span class="opacity-90 font-light ml-1 capitalize">{filtroDia}</span>
                    {/if}
                </span>
            </button>
        </div>
    </div>
</div>