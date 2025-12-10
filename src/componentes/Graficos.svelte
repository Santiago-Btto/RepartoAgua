<script>
    import { onMount } from 'svelte';
    import { db } from '../firebase.js';
    import {
        collection,
        query,
        orderBy,
        onSnapshot
    } from 'firebase/firestore';

    let entregas = [];
    let gastos = [];
    let syncMsg = '';
    let mesInput;

    // carga en vivo de entregas y gastos
    onMount(() => {
        // entregas
        const qEnt = query(
            collection(db, 'entregas'),
            orderBy('fecha', 'desc')
        );

        syncMsg = 'cargando datos...';
        const unsubEnt = onSnapshot(qEnt, (snap) => {
            entregas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            syncMsg = `entregas cargadas: ${entregas.length}`;
        });

        // gastos
        const qGas = query(
            collection(db, 'gastosRecorrido'),
            orderBy('fecha', 'desc')
        );

        const unsubGas = onSnapshot(qGas, (snap) => {
            gastos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        });

        return () => {
            unsubEnt();
            unsubGas();
        };
    });

    // fechas
    function toJsDate(ts) {
        if (!ts) return null;
        try {
            return ts.toDate ? ts.toDate() : new Date(ts);
        } catch {
            return null;
        }
    }

    function monthKeyFromTs(ts) {
        const d = toJsDate(ts);
        if (!d) return null;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`; 
    }

    function formatMonthLabel(key) {
        if (!key) return '';
        const [y, m] = key.split('-');
        return `${m}/${y}`;
    }

    function abrirMonthPicker() {
        if (mesInput && typeof mesInput.showPicker === 'function') {
            mesInput.showPicker();
        }
    }

    // -------- gastos por mes (activos/pasivos) --------
    $: gastosPorMes = gastos.reduce((acc, g) => {
        const mk = monthKeyFromTs(g.fecha);
        if (!mk) return acc;

        const agua  = Number(g.gastoAgua)        || 0;
        const soda  = Number(g.gastoSoda)        || 0;
        const comb  = Number(g.gastoCombustible) || 0;
        const extra = Number(g.gastoExtra)       || 0;

        const activos = agua + soda;
        const pasivos = comb + extra;

        if (!acc[mk]) {
            acc[mk] = { activos: 0, pasivos: 0, total: 0 };
        }
        acc[mk].activos += activos;
        acc[mk].pasivos += pasivos;
        acc[mk].total   += activos + pasivos;

        return acc;
    }, {});

    $: gastosMesArray = Object.entries(gastosPorMes)
        .sort((a, b) => a[0].localeCompare(b[0])) // cronologico
        .map(([key, val]) => ({
            key,
            label: formatMonthLabel(key),
            ...val
        }));

    // mes seleccionado (por defecto ultimo mes con datos)
    let mesSeleccionadoKey = '';
    $: if (!mesSeleccionadoKey && gastosMesArray.length) {
        mesSeleccionadoKey = gastosMesArray[gastosMesArray.length - 1].key;
    }

    $: mesSeleccionado = gastosMesArray.find(g => g.key === mesSeleccionadoKey) || null;

    // entregas filtradas por el mismo mes
    $: entregasFiltradasMes =
        mesSeleccionadoKey
            ? entregas.filter(e => monthKeyFromTs(e.fecha) === mesSeleccionadoKey)
            : entregas;

    // medios de pago (sobre entregasFiltradasMes) 
    $: pagosPorMedio = entregasFiltradasMes.reduce((acc, e) => {
        const medio = e.medioPago || 'sin_dato';
        acc[medio] = (acc[medio] || 0) + 1;
        return acc;
    }, {});

    $: cantEfectivo    = pagosPorMedio.efectivo     || 0;
    $: cantMercadoPago = pagosPorMedio.mercado_pago || 0;
    $: cantFiado       = pagosPorMedio.fiado        || 0;

    $: totalPagos = cantEfectivo + cantMercadoPago + cantFiado;

    // unidades vendidas (sobre entregasFiltradasMes)
    $: total20  = entregasFiltradasMes.reduce((a, e) => a + (Number(e.entregado20)  || 0), 0);
    $: total12  = entregasFiltradasMes.reduce((a, e) => a + (Number(e.entregado12)  || 0), 0);
    $: totalSif = entregasFiltradasMes.reduce((a, e) => a + (Number(e.entregadoSif) || 0), 0);
    $: totalDisp= entregasFiltradasMes.reduce((a, e) => a + (Number(e.entregadoDisp)|| 0), 0);

    $: totalUnidades = total20 + total12 + totalSif + totalDisp;

    
    function buildDonutSegments(rawSegments) {
        const R = 60;
        const C = 2 * Math.PI * R;
        const total = rawSegments.reduce((a, s) => a + (s.value || 0), 0);

        let offset = 0;
        return rawSegments.map(s => {
            const value = s.value || 0;
            const percent = total > 0 ? value / total : 0;
            const length = percent * C;

            const seg = {
                ...s,
                percent,
                dasharray: `${length} ${C - length}`,
                dashoffset: -offset
            };

            offset += length;
            return seg;
        });
    }

    const pct = (p) => Math.round(p * 100);

    // donut gastos
    $: segmentosGastos = buildDonutSegments([
        {
            label: 'Activos (Agua + Soda)',
            short: 'Activos',
            value: mesSeleccionado ? mesSeleccionado.activos : 0,
            color: '#34d399'
        },
        {
            label: 'Pasivos (Combustible + Extra)',
            short: 'Pasivos',
            value: mesSeleccionado ? mesSeleccionado.pasivos : 0,
            color: '#fbbf24'
        }
    ]);

    // donut medios de pago
    $: segmentosPagos = buildDonutSegments([
        { label: 'Efectivo',       short: 'Efectivo',       value: cantEfectivo,    color: '#10b981' },
        { label: 'Mercado pago',   short: 'Mercado pago',   value: cantMercadoPago, color: '#0ea5e9' },
        { label: 'Fiado',          short: 'Fiado',          value: cantFiado,       color: '#fbbf24' }
    ]);

    // donut unidades
    $: segmentosUnidades = buildDonutSegments([
        { label: 'Bidones 20L',     short: '20L',           value: total20,  color: '#3b82f6' },
        { label: 'Bidones 12L',     short: '12L',           value: total12,  color: '#6366f1' },
        { label: 'Sifones',         short: 'Sifones',       value: totalSif, color: '#22c55e' },
        { label: 'Jugos / Amargos', short: 'Jugos/Amargos', value: totalDisp,color: '#a855f7' }
    ]);
</script>

<div class="max-w-5xl mx-auto p-4 grid gap-4">
    <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
            <h2 class="text-xl font-semibold">Graficos 📈</h2>
            <p class="text-xs text-gray-500 mt-1">{syncMsg}</p>
        </div>
        <p class="text-xs text-gray-500">
            Datos generados a partir de entregas y gastos registrados.
        </p>
    </header>

    <!-- gastos activos vs pasivos por mes -->
    <section class="bg-white border border-gray-300 rounded-lg p-3">
        <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold text-gray-800">
                Gastos activos vs pasivos por mes
            </h3>

            <div class="flex items-center gap-4 text-[11px] text-gray-700">
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-sm bg-emerald-400"></span>
                    <span>Activos (Agua + Soda)</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-sm bg-amber-400"></span>
                    <span>Pasivos (Combustible + Extra)</span>
                </div>

                {#if gastosMesArray.length}
                    <input
                        type="month"
                        class="bg-white border border-gray-300 rounded-md px-2 py-1 text-gray-800"
                        bind:this={mesInput}
                        bind:value={mesSeleccionadoKey}
                        on:click={abrirMonthPicker}
                        on:keydown|preventDefault
                    />
                {/if}
            </div>
        </div>

        {#if mesSeleccionado && mesSeleccionado.total > 0}
            <div class="flex flex-col md:flex-row items-center gap-6 mt-2">
                <div class="flex flex-col items-center">
                    <svg viewBox="0 0 140 140" class="w-32 h-32">
                        <circle
                            cx="70" cy="70" r="60"
                            fill="transparent"
                            stroke="rgba(209,213,219,1)"
                            stroke-width="18"
                        />
                        {#each segmentosGastos as seg}
                            <circle
                                cx="70" cy="70" r="60"
                                fill="transparent"
                                stroke={seg.color}
                                stroke-width="18"
                                stroke-linecap="round"
                                stroke-dasharray={seg.dasharray}
                                stroke-dashoffset={seg.dashoffset}
                                transform="rotate(-90 70 70)"
                            />
                        {/each}
                    </svg>
                    <p class="text-[11px] text-gray-600 mt-1">
                        Mes {mesSeleccionado.label} • Total: ${mesSeleccionado.total}
                    </p>
                </div>

                <div class="text-xs text-gray-700 space-y-1">
                    {#each segmentosGastos as seg}
                        <div class="flex items-center gap-2">
                            <span
                                class="w-3 h-3 rounded-sm"
                                style={`background:${seg.color}`}
                            ></span>
                            <span class="font-medium">{seg.short}:</span>
                            <span>${seg.value}</span>
                            <span class="text-gray-500">
                                ({pct(seg.percent)}%)
                            </span>
                        </div>
                    {/each}
                </div>
            </div>
        {:else}
            <p class="text-xs text-gray-500 mt-1">
                No hay gastos registrados para el mes seleccionado.
            </p>
        {/if}
    </section>

    <!-- distribucion de medios de pago -->
    <section class="bg-white border border-gray-300 rounded-lg p-3">
        <h3 class="text-sm font-semibold text-gray-800 mb-2">
            Distribucion de medios de pago
        </h3>

        {#if totalPagos === 0}
            <p class="text-xs text-gray-500">
                No hay operaciones registradas para el mes seleccionado.
            </p>
        {:else}
            <div class="flex flex-col md:flex-row items-center gap-6 mt-1">
                <div class="flex flex-col items-center">
                    <svg viewBox="0 0 140 140" class="w-32 h-32">
                        <circle
                            cx="70" cy="70" r="60"
                            fill="transparent"
                            stroke="rgba(209,213,219,1)"
                            stroke-width="18"
                        />
                        {#each segmentosPagos as seg}
                            <circle
                                cx="70" cy="70" r="60"
                                fill="transparent"
                                stroke={seg.color}
                                stroke-width="18"
                                stroke-linecap="round"
                                stroke-dasharray={seg.dasharray}
                                stroke-dashoffset={seg.dashoffset}
                                transform="rotate(-90 70 70)"
                            />
                        {/each}
                    </svg>
                    <p class="text-[11px] text-gray-600 mt-1">
                        Total operaciones: {totalPagos}
                    </p>
                </div>

                <div class="text-xs text-gray-700 space-y-1">
                    {#each segmentosPagos as seg}
                        <div class="flex items-center gap-2">
                            <span
                                class="w-3 h-3 rounded-sm"
                                style={`background:${seg.color}`}
                            ></span>
                            <span class="font-medium">{seg.short}:</span>
                            <span>{seg.value}</span>
                            <span class="text-gray-500">
                                ({pct(seg.percent)}%)
                            </span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </section>

    <!-- unidades vendidas -->
    <section class="bg-white border border-gray-300 rounded-lg p-3">
        <h3 class="text-sm font-semibold text-gray-800 mb-2">
            Unidades vendidas (historico)
        </h3>

        {#if totalUnidades === 0}
            <p class="text-xs text-gray-500">
                No hay unidades registradas para el mes seleccionado.
            </p>
        {:else}
            <div class="flex flex-col md:flex-row items-center gap-6 mt-1">
                <div class="flex flex-col items-center">
                    <svg viewBox="0 0 140 140" class="w-32 h-32">
                        <circle
                            cx="70" cy="70" r="60"
                            fill="transparent"
                            stroke="rgba(209,213,219,1)"
                            stroke-width="18"
                        />
                        {#each segmentosUnidades as seg}
                            <circle
                                cx="70" cy="70" r="60"
                                fill="transparent"
                                stroke={seg.color}
                                stroke-width="18"
                                stroke-linecap="round"
                                stroke-dasharray={seg.dasharray}
                                stroke-dashoffset={seg.dashoffset}
                                transform="rotate(-90 70 70)"
                            />
                        {/each}
                    </svg>
                    <p class="text-[11px] text-gray-600 mt-1">
                        Total unidades vendidas: {totalUnidades}
                    </p>
                </div>

                <div class="text-xs text-gray-700 space-y-1">
                    {#each segmentosUnidades as seg}
                        <div class="flex items-center gap-2">
                            <span
                                class="w-3 h-3 rounded-sm"
                                style={`background:${seg.color}`}
                            ></span>
                            <span class="font-medium">{seg.short}:</span>
                            <span>{seg.value}</span>
                            <span class="text-gray-500">
                                ({pct(seg.percent)}%)
                            </span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </section>
</div>
