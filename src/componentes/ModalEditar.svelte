<script>
    import { createEventDispatcher } from 'svelte';

    export let cliente;            // cliente a editar
    export let preciosBase = {};   // viene desde Principal.svelte
    export let movimientos = [];   // historial del cliente (entregas)
    export let guardando = false;  // opcional

    const dispatch = createEventDispatcher();
    let data = { ...cliente };
    console.log(data)
    // ===== AGREGAR PEDIDO (como EmpezarDia) =====
    let pedido = {
        cant20: '',
        cant12: '',
        cantSif: '',
        cantDisp: '',
        cobrado: '',
        medioPago: 'efectivo',
        notasEntrega: ''
    };

    // secciones desplegables
    let mostrarAgregarPedido = false;
    let mostrarHistorial = false;

    // CALCULOS pedido
    let totalPedido = 0;
    let cobradoPedido = 0;
    let pendientePedido = 0;

    $: {
        const q20   = Number(pedido.cant20) || 0;
        const q12   = Number(pedido.cant12) || 0;
        const qSif  = Number(pedido.cantSif) || 0;
        const qDisp = Number(pedido.cantDisp)|| 0;

        const p20   = Number(preciosBase.precio20) || 0;
        const p12   = Number(preciosBase.precio12) || 0;
        const pSif  = Number(preciosBase.precioSif) || 0;
        const pDisp = Number(preciosBase.precioDisp)|| 0;

        totalPedido = q20*p20 + q12*p12 + qSif*pSif + qDisp*pDisp;
        cobradoPedido = Number(pedido.cobrado) || 0;
        pendientePedido = totalPedido - cobradoPedido;
    }

    function registrarPedido() {
        const q20   = Number(pedido.cant20)  || 0;
        const q12   = Number(pedido.cant12)  || 0;
        const qSif  = Number(pedido.cantSif) || 0;
        const qDisp = Number(pedido.cantDisp)|| 0;

        const p20   = Number(preciosBase.precio20) || 0;
        const p12   = Number(preciosBase.precio12) || 0;
        const pSif  = Number(preciosBase.precioSif) || 0;
        const pDisp = Number(preciosBase.precioDisp)|| 0;

        const total = q20*p20 + q12*p12 + qSif*pSif + qDisp*pDisp;
        const cobrado = Number(pedido.cobrado) || 0;

        const estadoPago =
            cobrado >= total ? "pagado" :
            cobrado > 0      ? "parcial" :
                            "pendiente";

        const payload = {
            clienteId: cliente.id,
            nombreCliente: cliente.nombre,
            diaRuta: cliente.diaEntrega,
            entregado20: q20,
            entregado12: q12,
            entregadoSif: qSif,
            entregadoDisp: qDisp,
            precio20: p20,
            precio12: p12,
            precioSif: pSif,
            precioDisp: pDisp,
            montoTotal: total,
            montoCobrado: cobrado,
            medioPago: pedido.medioPago,
            estadoPago,
            notasEntrega: pedido.notasEntrega || ""
        };

        dispatch('registrarEntrega', payload);

        // reset
        pedido = {
            ...pedido,
            cant20: '',
            cant12: '',
            cantSif: '',
            cantDisp: '',
            cobrado: '',
            notasEntrega: ''
        };
    }

    function fmt(ts) {
        if (!ts) return '';
        try { return ts.toDate ? ts.toDate().toLocaleString() : new Date(ts).toLocaleString(); }
        catch { return ''; }
    }

    // ====== Guardar cliente ======
    const inputClass = "w-full bg-white border border-gray-300 rounded-md p-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500 shadow-sm";

    function handleSave() {
        dispatch('guardar', data);
        dispatch('cerrar');
    }

    // ====== RESUMEN DEL HISTORIAL ======
    $: totalComprado = movimientos.reduce((a,m)=>a+(m.montoTotal||0),0);
    $: totalCobrado  = movimientos.reduce((a,m)=>a+(m.montoCobrado||0),0);
    $: saldo = totalComprado - totalCobrado;  // >0 debe, <0 a favor

    // litros comprados en toda la historia
    $: total20  = movimientos.reduce((a,m)=>a+(m.entregado20  ||0),0);
    $: total12  = movimientos.reduce((a,m)=>a+(m.entregado12  ||0),0);
    $: totalSif = movimientos.reduce((a,m)=>a+(m.entregadoSif ||0),0);
    $: totalDisp= movimientos.reduce((a,m)=>a+(m.entregadoDisp||0),0);

    // cantidad de pedidos
    $: cantPedidos = movimientos.length;

    // ticket promedio
    $: ticketPromedio = cantPedidos ? (totalComprado / cantPedidos) : 0;

    // TOTAL fiado historico (solo lo que no se pagó de cada pedido)
    $: totalFiadoHistorico = movimientos.reduce(
        (a,m)=>a+((m.montoTotal||0)-(m.montoCobrado||0)),
        0
    );

    // ultima compra
    $: ultimoMovimiento = movimientos.length
        ? movimientos[movimientos.length - 1]
        : null;

    // distribucion de medios de pago (conteo simple)
    $: pagosPorMedio = movimientos.reduce((acc,m)=>{
        const medio = m.medioPago || 'desconocido';
        acc[medio] = (acc[medio] || 0) + 1;
        return acc;
    }, {});
</script>

<div class="fixed inset-0 z-60 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" on:click={() => dispatch('cerrar')}></div>

    <div class="relative w-full max-w-3xl bg-white border border-gray-300 rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
        <!-- Título + botones azules -->
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-semibold">Editar cliente</h3>

            <div class="flex gap-2">
                <button
                    type="button"
                    class="px-3 py-1.5 rounded-md text-xs bg-blue-600 hover:bg-blue-700 text-white text-gray-900"
                    on:click={() => (mostrarAgregarPedido = !mostrarAgregarPedido)}
                >
                    {mostrarAgregarPedido ? '▼ Agregar pedido' : '▶ Agregar pedido'}
                </button>

                <button
                    type="button"
                    class="px-3 py-1.5 rounded-md text-xs bg-blue-600 hover:bg-blue-700 text-white text-gray-900"
                    on:click={() => (mostrarHistorial = !mostrarHistorial)}
                >
                    {mostrarHistorial ? '▼ Historial' : '▶ Historial'}
                </button>
            </div>
        </div>

        <!-- ============================
            FORM ORIGINAL 
        ============================== -->
        <form on:submit|preventDefault={handleSave}>
            <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto p-1">

                <h3 class="text-base font-semibold text-gray-900 col-span-full border-b border-gray-300 pb-1 mb-1">
                    Datos Generales:
                </h3>

                <div>
                    <p class="text-sm text-gray-500">Nombre</p>
                    <input class={inputClass} required bind:value={data.nombre} />
                </div>
                <div>
                    <p class="text-sm text-gray-500">Dirección</p>
                    <input class={inputClass} bind:value={data.direccion} />
                </div>
                <div>
                    <p class="text-sm text-gray-500">Teléfono</p>
                    <input class={inputClass} bind:value={data.telefono} />
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
                    <select class={inputClass} bind:value={data.estado}>
                        <option>activo</option><option>pausado</option>
                    </select>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Orden</p>
                    <input class={inputClass} type="number" bind:value={data.orden} />
                </div>

                <!-- STOCK -->
                <h3 class="text-base font-semibold text-gray-900 col-span-full border-b border-gray-300 pb-1 mt-4 mb-1">
                    Stock:
                </h3>

                <div>
                    <p class="text-sm text-gray-500">20 Litros</p>
                    <input class={inputClass} type="number" bind:value={data.stock20} />
                </div>
                <div>
                    <p class="text-sm text-gray-500">12 Litros</p>
                    <input class={inputClass} type="number" bind:value={data.stock12} />
                </div>
                <div>
                    <p class="text-sm text-gray-500">Sifones</p>
                    <input class={inputClass} type="number" bind:value={data.stockSif} />
                </div>
                <div>
                    <p class="text-sm text-gray-500">Jugos / Amargos</p>
                    <input class={inputClass} type="number" bind:value={data.stockDispenser} />
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
                    <textarea class={inputClass} rows="2" bind:value={data.notas}></textarea>
                </div>
            </div>

            <div class="w-full flex justify-center items-center gap-3 mt-4">
                <button
                    type="button"
                    class="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
                    on:click={() => dispatch('cerrar')}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    class="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                    disabled={guardando}
                >
                    {guardando ? 'Guardando…' : 'Guardar cambios'}
                </button>
            </div>
        </form>

        <!-- ==================================
            AGREGAR PEDIDO (DESPLEGABLE)
        ================================== -->
        {#if mostrarAgregarPedido}
            <div class="mt-6 border-t border-gray-300 pt-4">
                <h3 class="text-base font-semibold text-gray-900 mb-2">Agregar pedido</h3>

                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <p class="text-xs text-gray-500">Sifones</p>
                        <input class={inputClass} type="number" bind:value={pedido.cantSif} />
                    </div>

                    <div>
                        <p class="text-xs text-gray-500">20L</p>
                        <input class={inputClass} type="number" bind:value={pedido.cant20} />
                    </div>

                    <div>
                        <p class="text-xs text-gray-500">12L</p>
                        <input class={inputClass} type="number" bind:value={pedido.cant12} />
                    </div>

                    <div>
                        <p class="text-xs text-gray-500">Jugos/Amargos</p>
                        <input class={inputClass} type="number" bind:value={pedido.cantDisp} />
                    </div>

                    <div>
                        <p class="text-xs text-gray-500">Monto cobrado</p>
                        <input class={inputClass} type="number" bind:value={pedido.cobrado} />
                    </div>

                    <div>
                        <p class="text-xs text-gray-500">Medio de pago</p>
                        <select class={inputClass} bind:value={pedido.medioPago}>
                            <option value="efectivo">efectivo</option>
                            <option value="mercado_pago">mercado pago</option>
                            <option value="fiado">fiado</option>
                        </select>
                    </div>

                    <div class="col-span-full">
                        <p class="text-xs text-gray-500">Notas</p>
                        <textarea class={inputClass} rows="2" bind:value={pedido.notasEntrega}></textarea>
                    </div>
                </div>

                <p class="text-sm text-gray-700 mt-2">
                    Total: <b>${totalPedido}</b> • Cobrado: <b>${cobradoPedido}</b> •
                    Pendiente: <b class="text-amber-500">${pendientePedido}</b>
                </p>

                <div class="flex justify-end mt-3">
                    <button
                        type="button"
                        class="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-sm"
                        on:click={registrarPedido}
                    >
                        💾 Registrar pedido
                    </button>
                </div>
            </div>
        {/if}

        <!-- ==================================
            HISTORIAL DEL CLIENTE (DESPLEGABLE)
        ================================== -->
        {#if mostrarHistorial}
            <div class="mt-6 border-t border-gray-300 pt-4">

                <h3 class="text-base font-semibold text-gray-900 mb-2">Historial de pedidos</h3>

                <p class="text-xs text-gray-700 mb-1">
                    Total comprado: <b>${totalComprado}</b> •
                    Cobrado: <b>${totalCobrado}</b> •
                    Saldo:
                    <span class={saldo > 0 ? "text-amber-500" : "text-emerald-600"}>
                        ${saldo}
                    </span>
                    {#if saldo > 0}(debe){:else if saldo < 0}(a favor){/if}
                </p>

                <p class="text-xs text-gray-700 mb-1">
                    Litros totales:
                    20L <b>{total20}</b> •
                    12L <b>{total12}</b> •
                    Sifones <b>{totalSif}</b> •
                    Jugos/Amargos <b>{totalDisp}</b>
                </p>

                <p class="text-xs text-gray-700 mb-1">
                    Pedidos registrados: <b>{cantPedidos}</b> •
                    Ticket promedio: <b>${ticketPromedio.toFixed(0)}</b>
                </p>

                <p class="text-xs text-gray-700 mb-1">
                    Total fiado historico:
                    <b class="text-amber-500">${totalFiadoHistorico}</b>
                </p>

                {#if ultimoMovimiento}
                    <p class="text-xs text-gray-700 mb-1">
                        Ultima compra:
                        <b>{fmt(ultimoMovimiento.fecha)}</b> •
                        Total: <b>${ultimoMovimiento.montoTotal}</b> •
                        Medio de pago: <b>{ultimoMovimiento.medioPago}</b>
                    </p>
                {/if}

                <p class="text-xs text-gray-500 mb-2">
                    Medios de pago usados:
                    {#each Object.entries(pagosPorMedio) as [medio, cant]}
                        <span class="ml-2">{medio}: {cant}</span>
                    {/each}
                </p>

                {#if movimientos.length === 0}
                    <p class="text-xs text-gray-500">Sin movimientos.</p>
                {:else}
                    <div class="max-h-40 overflow-y-auto text-xs">
                        <table class="w-full border-collapse">
                            <thead>
                                <tr class="border-b border-gray-300 text-gray-500">
                                    <th class="py-1 text-left">Fecha</th>
                                    <th class="py-1 text-right">Total</th>
                                    <th class="py-1 text-right">Cobrado</th>
                                    <th class="py-1 text-right">Pendiente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each movimientos as m (m.id)}
                                    <tr class="border-b border-gray-800">
                                        <td class="py-1">{fmt(m.fecha)}</td>
                                        <td class="py-1 text-right">${m.montoTotal}</td>
                                        <td class="py-1 text-right text-emerald-600">${m.montoCobrado}</td>
                                        <td class="py-1 text-right text-amber-500">
                                            {(m.montoTotal || 0) - (m.montoCobrado || 0)}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>
