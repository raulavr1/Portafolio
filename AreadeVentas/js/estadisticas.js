/* ============================================================
   ESTADÍSTICAS — Visualización de datos profesional y legible
   ============================================================ */
'use strict';

(function () {
  const charts = {};
  let selectedMonth = 'all'; // 'all' o 0..11
  let selectedYear  = '2026'; // '2026', '2025', 'all'

  /* ── Colores de alto contraste para Dark Mode ── */
  const C = {
    cyan   : '#00d4ff',
    green  : '#00ff88',
    purple : '#a855f7',
    orange : '#ff6b2b',
    pink   : '#ff2d78',
    yellow : '#ffd600',
    blue   : '#3b82f6',
    teal   : '#14b8a6',
    white  : '#ffffff',
    text   : '#f8fafc',
    text2  : '#cbd5e1',
    border : 'rgba(0, 212, 255, 0.2)',
  };

  /* Opciones base para ApexCharts */
  function getBaseOpts() {
    return {
      chart: {
        background: 'transparent',
        fontFamily: "'JetBrains Mono', 'Inter', sans-serif",
        foreColor: C.text2,
        toolbar: { show: false },
        animations: { enabled: true, easing: 'easeinout', speed: 400 },
      },
      grid: { borderColor: C.border, strokeDashArray: 4 },
      tooltip: {
        theme: 'dark',
        style: { fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" },
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '11px',
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: '700',
          colors: ['#ffffff'],
        },
      },
    };
  }

  /* ── Formateo seguro de moneda ── */
  function fmt(val, currency = 'PEN') {
    if (typeof fmtCurrency === 'function') return fmtCurrency(val, currency);
    const sym = { PEN: 'S/ ', USD: '$ ', EUR: '€ ' };
    return (sym[currency] || 'S/ ') + Number(val || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* ── Nombres de meses ── */
  const MESES_NOMBRES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  /* ── Obtener datos filtrados por Mes y Año ── */
  function getStats() {
    const rawProf = (typeof AppDB !== 'undefined' && AppDB.proformas) ? AppDB.proformas.getAll() : ((AppDB && AppDB.getAll) ? AppDB.getAll('proformas') : []);
    const rawFact = (typeof AppDB !== 'undefined' && AppDB.facturas) ? AppDB.facturas.getAll() : ((AppDB && AppDB.getAll) ? AppDB.getAll('facturas') : []);
    const rawInv  = (typeof AppDB !== 'undefined' && AppDB.productos) ? AppDB.productos.getAll() : ((AppDB && AppDB.getAll) ? AppDB.getAll('inventario') : []);

    function parseDate(dStr) {
      if (!dStr) return new Date(0);
      return new Date(dStr.includes('T') ? dStr : dStr + 'T00:00:00');
    }

    /* Filtrar facturas y pedidos por mes y año seleccionados */
    function passesFilter(dStr) {
      const d = parseDate(dStr);
      if (selectedYear !== 'all' && d.getFullYear().toString() !== selectedYear) return false;
      if (selectedMonth !== 'all' && d.getMonth().toString() !== selectedMonth) return false;
      return true;
    }

    const filtFact = rawFact.filter(f => passesFilter(f.fecha));
    const filtProf = rawProf.filter(p => passesFilter(p.fecha));

    /* KPIs comerciales */
    const totalVentas        = filtFact.reduce((s, f) => s + (Number(f.total) || 0), 0);
    const factPagadas        = filtFact.filter(f => ['cobrada', 'pagada'].includes(f.estado_pago || f.estado));
    const cobrado            = factPagadas.reduce((s, f) => s + (Number(f.total) || 0), 0);
    const pendiente          = filtFact.filter(f => !['cobrada', 'pagada'].includes(f.estado_pago || f.estado)).reduce((s, f) => s + (Number(f.total) || 0), 0);
    const invVal             = rawInv.reduce((s, p) => s + (Number(p.precio || p.precio_venta || 0) * Number(p.stock || 0)), 0);

    const pedidosEnEspera    = filtProf.filter(p => p.estado === 'en_espera' || p.estado === 'pendiente').length;
    const pedidosConcretados = filtProf.filter(p => p.estado === 'aprobada' || p.estado === 'convertida').length;
    const pedidosVencidos    = filtProf.filter(p => p.estado === 'vencida').length;
    const pedidosTotal       = filtProf.length;
    const tasaCierre         = pedidosTotal > 0 ? Math.round((pedidosConcretados / pedidosTotal) * 100) : 0;

    /* 1. Tendencia mensual de ventas vs pedidos */
    const targetYear = selectedYear === 'all' ? 2026 : Number(selectedYear);
    const tendFact = new Array(12).fill(0);
    const tendProf = new Array(12).fill(0);

    rawFact.forEach(f => {
      const fd = parseDate(f.fecha);
      if (fd.getFullYear() === targetYear) {
        tendFact[fd.getMonth()] += Number(f.total) || 0;
      }
    });
    rawProf.forEach(p => {
      const fd = parseDate(p.fecha);
      if (fd.getFullYear() === targetYear) {
        tendProf[fd.getMonth()] += Number(p.total) || 0;
      }
    });

    /* 2. Ventas por Categoría (Barras Verticales) */
    const prodMap = {};
    rawInv.forEach(p => { prodMap[p.id] = p; });
    const catMap  = {};

    filtFact.forEach(f => {
      (f.items || []).forEach(it => {
        const prod = prodMap[it.producto_id];
        const cat  = (prod && prod.categoria) || it.categoria || 'Accesorios';
        catMap[cat] = (catMap[cat] || 0) + (Number(it.subtotal) || 0);
      });
    });

    const catLabels = Object.keys(catMap).length ? Object.keys(catMap) : ['Networking', 'Seguridad', 'Cables', 'Infraestructura', 'Energía'];
    const catValues = catLabels.map(c => Math.round(catMap[c] || 0));

    /* 3. Stock por Producto (Barras Horizontales de Inventario) */
    const topStockProds = [...rawInv]
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 8);

    const stockProdNames = topStockProds.map(p => (p.descripcion || p.nombre || p.codigo).slice(0, 24));
    const stockProdUnits = topStockProds.map(p => Number(p.stock || 0));

    /* 4. Top Clientes (Barras Horizontales de Facturación) */
    const clienteMap = {};
    filtFact.forEach(f => {
      const c = f.cliente || 'Anónimo';
      clienteMap[c] = (clienteMap[c] || 0) + (Number(f.total) || 0);
    });

    const sortedClientes = Object.entries(clienteMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topClientesLabels = sortedClientes.map(([name]) => name);
    const topClientesValues = sortedClientes.map(([, total]) => Math.round(total));

    /* 5. Por Moneda */
    const byMoneda = { PEN: 0, USD: 0, EUR: 0 };
    filtFact.forEach(f => {
      const m = f.moneda || 'PEN';
      byMoneda[m] = (byMoneda[m] || 0) + (Number(f.total) || 0);
    });
    const totalM = (byMoneda.PEN + byMoneda.USD * 3.8 + byMoneda.EUR * 4.1) || 1;
    const radialPct = [
      Math.round((byMoneda.PEN / totalM) * 100),
      Math.round(((byMoneda.USD * 3.8) / totalM) * 100),
      Math.round(((byMoneda.EUR * 4.1) / totalM) * 100),
    ];

    /* 6. Donut Estados */
    const estadoMap = {};
    filtFact.forEach(f => {
      const e = f.estado_pago || f.estado || 'pendiente';
      estadoMap[e] = (estadoMap[e] || 0) + 1;
    });

    return {
      kpis: {
        totalVentas,
        cobrado,
        pendiente,
        invVal,
        totalFact: filtFact.length,
        pedidosEnEspera,
        pedidosConcretados,
        pedidosVencidos,
        pedidosTotal,
        tasaCierre
      },
      mesesLabels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      tendFact, tendProf,
      catLabels, catValues,
      stockProdNames, stockProdUnits,
      topClientesLabels, topClientesValues,
      radialPct, byMoneda,
      estadoMap,
    };
  }

  /* ── Destruir chart ── */
  function destroyChart(key) {
    if (charts[key]) {
      try { charts[key].destroy(); } catch (_) {}
      delete charts[key];
    }
  }

  /* ── Chart 1: Tendencia Mensual (Area Spline) ── */
  function renderTendencia(data) {
    destroyChart('tend');
    const el = document.getElementById('chart-tendencia');
    if (!el || typeof ApexCharts === 'undefined') return;

    charts.tend = new ApexCharts(el, {
      ...getBaseOpts(),
      chart: { ...getBaseOpts().chart, type: 'area', height: 270 },
      series: [
        { name: 'Facturado Concretado (S/)', data: data.tendFact.map(v => Math.round(v)) },
        { name: 'Pedidos Solicitados (S/)',  data: data.tendProf.map(v => Math.round(v)) },
      ],
      xaxis: { categories: data.mesesLabels, labels: { style: { colors: C.text2, fontSize: '11px' } }, axisBorder: { show: false } },
      yaxis: { labels: { formatter: v => `S/ ${(v / 1000).toFixed(0)}k`, style: { colors: C.text2, fontSize: '11px' } } },
      colors: [C.cyan, C.purple],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.01, stops: [0, 90, 100] } },
      stroke: { curve: 'smooth', width: [3, 2.5], dashArray: [0, 4] },
      markers: { size: [4, 3], colors: ['#070b14'], strokeColors: [C.cyan, C.purple], strokeWidth: 2 },
      legend: { position: 'top', horizontalAlign: 'right', labels: { colors: C.text2 } },
      dataLabels: { enabled: false },
      tooltip: { ...getBaseOpts().tooltip, y: { formatter: v => fmt(v, 'PEN') } },
    });
    charts.tend.render();
  }

  /* ── Chart 2: Ventas por Categoría (Barras Verticales) ── */
  function renderCategorias(data) {
    destroyChart('cat');
    const el = document.getElementById('chart-categorias');
    if (!el || typeof ApexCharts === 'undefined') return;

    charts.cat = new ApexCharts(el, {
      ...getBaseOpts(),
      chart: { ...getBaseOpts().chart, type: 'bar', height: 270 },
      series: [{ name: 'Ventas (S/)', data: data.catValues }],
      xaxis: { categories: data.catLabels, labels: { style: { colors: C.text2, fontSize: '11px', fontWeight: '600' } } },
      yaxis: { labels: { formatter: v => `S/ ${(v / 1000).toFixed(0)}k`, style: { colors: C.text2, fontSize: '11px' } } },
      colors: [C.cyan, C.green, C.purple, C.orange, C.yellow, C.blue],
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '45%',
          distributed: true,
          dataLabels: { position: 'top' }
        }
      },
      legend: { show: false },
      dataLabels: {
        enabled: true,
        formatter: v => v > 0 ? `S/ ${v.toLocaleString('es-PE')}` : '',
        offsetY: -22,
        style: { fontSize: '11px', colors: ['#00d4ff'], fontFamily: "'JetBrains Mono', monospace", fontWeight: '700' }
      },
      tooltip: { ...getBaseOpts().tooltip, y: { formatter: v => fmt(v, 'PEN') } },
    });
    charts.cat.render();
  }

  /* ── Chart 3: Stock de Inventario (Barras Horizontales) ── */
  function renderStock(data) {
    destroyChart('stock');
    const el = document.getElementById('chart-stock');
    if (!el || typeof ApexCharts === 'undefined') return;

    charts.stock = new ApexCharts(el, {
      ...getBaseOpts(),
      chart: { ...getBaseOpts().chart, type: 'bar', height: 270 },
      series: [{ name: 'Unidades en Stock', data: data.stockProdUnits }],
      xaxis: {
        categories: data.stockProdNames,
        labels: { style: { colors: C.text2, fontSize: '11px' } }
      },
      yaxis: { labels: { style: { colors: C.text2, fontSize: '11px', fontWeight: '600' } } },
      colors: [C.teal],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 5,
          barHeight: '55%',
          dataLabels: { position: 'inside' }
        }
      },
      legend: { show: false },
      dataLabels: {
        enabled: true,
        formatter: v => `${v} uds`,
        style: { fontSize: '11px', colors: ['#ffffff'], fontFamily: "'JetBrains Mono', monospace", fontWeight: '700' }
      },
      tooltip: { ...getBaseOpts().tooltip, y: { formatter: v => `${v} unidades` } },
    });
    charts.stock.render();
  }

  /* ── Chart 4: Top Clientes (Barras Horizontales Ultra Legibles) ── */
  function renderClientes(data) {
    destroyChart('cli');
    const el = document.getElementById('chart-clientes');
    if (!el || typeof ApexCharts === 'undefined') return;

    if (!data.topClientesValues.length) {
      el.innerHTML = `<p style="color:var(--text-2);text-align:center;padding:60px;font-family:var(--font-mono);font-size:12px;">Sin ventas en el período seleccionado</p>`;
      return;
    }

    charts.cli = new ApexCharts(el, {
      ...getBaseOpts(),
      chart: { ...getBaseOpts().chart, type: 'bar', height: 270 },
      series: [{ name: 'Facturado (S/)', data: data.topClientesValues }],
      xaxis: {
        categories: data.topClientesLabels,
        labels: { formatter: v => `S/ ${(v / 1000).toFixed(0)}k`, style: { colors: C.text2, fontSize: '11px' } }
      },
      yaxis: {
        labels: {
          style: { colors: '#ffffff', fontSize: '11.5px', fontWeight: '700' }
        }
      },
      colors: [C.orange],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 5,
          barHeight: '50%',
          distributed: true,
          dataLabels: { position: 'inside' }
        }
      },
      legend: { show: false },
      dataLabels: {
        enabled: true,
        formatter: v => fmt(v, 'PEN'),
        style: {
          fontSize: '11px',
          colors: ['#ffffff'],
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: '800'
        },
        dropShadow: { enabled: true, top: 1, left: 1, blur: 2, color: '#000000', opacity: 0.9 }
      },
      tooltip: { ...getBaseOpts().tooltip, y: { formatter: v => fmt(v, 'PEN') } },
    });
    charts.cli.render();
  }

  /* ── Chart 5: Monedas (RadialBar) ── */
  function renderMonedas(data) {
    destroyChart('rad');
    const el = document.getElementById('chart-monedas');
    if (!el || typeof ApexCharts === 'undefined') return;

    charts.rad = new ApexCharts(el, {
      ...getBaseOpts(),
      chart: { ...getBaseOpts().chart, type: 'radialBar', height: 270 },
      series: data.radialPct,
      labels: ['Soles (S/)', 'Dólares ($)', 'Euros (€)'],
      colors: [C.cyan, C.green, C.purple],
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: { size: '42%', background: 'transparent' },
          track: { background: 'rgba(255,255,255,0.06)', strokeWidth: '97%', margin: 4 },
          dataLabels: {
            name: { fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: C.text2, offsetY: -10 },
            value: { fontSize: '16px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#ffffff', formatter: v => v + '%', offsetY: 4 },
            total: {
              show: true, label: 'Equiv. Soles',
              formatter: () => fmt(data.byMoneda.PEN + data.byMoneda.USD * 3.8 + data.byMoneda.EUR * 4.1, 'PEN'),
              fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: C.cyan,
            }
          }
        }
      },
      legend: { show: true, position: 'bottom', labels: { colors: C.text2 } },
      dataLabels: { enabled: false }
    });
    charts.rad.render();
  }

  /* ── Chart 6: Estado de Facturas (Donut) ── */
  function renderEstados(data) {
    destroyChart('est');
    const el = document.getElementById('chart-estados');
    if (!el || typeof ApexCharts === 'undefined') return;

    const labels   = Object.keys(data.estadoMap);
    const vals     = Object.values(data.estadoMap);
    const colorMap = { cobrada: C.green, pagada: C.green, pendiente: C.yellow, vencida: C.pink, anulada: C.text2 };
    const colors   = labels.map(l => colorMap[l] || C.cyan);

    if (!vals.length) {
      el.innerHTML = `<p style="color:var(--text-2);text-align:center;padding:60px;font-family:var(--font-mono);font-size:12px;">Sin facturas en el período</p>`;
      return;
    }

    charts.est = new ApexCharts(el, {
      ...getBaseOpts(),
      chart: { ...getBaseOpts().chart, type: 'donut', height: 270, animations: { enabled: false } },
      series: vals,
      labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
      colors,
      plotOptions: {
        pie: {
          expandOnClick: false,
          donut: {
            size: '65%',
            background: 'transparent',
            labels: {
              show: true,
              name: { fontSize: '11px', color: C.text2, fontFamily: "'JetBrains Mono', monospace", offsetY: -4 },
              value: { fontSize: '17px', fontWeight: 800, color: '#ffffff', fontFamily: "'JetBrains Mono', monospace", formatter: v => v + ' fact.', offsetY: 4 },
              total: { show: true, label: 'Total', color: C.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', formatter: w => w.globals.seriesTotals.reduce((a, b) => a + b, 0) + ' fact.' }
            }
          }
        }
      },
      stroke: { show: false, width: 0, lineCap: 'round' },
      legend: { position: 'bottom', labels: { colors: Array(labels.length).fill(C.text2) }, itemMargin: { horizontal: 8 } },
      dataLabels: { enabled: false },
      states: { hover: { filter: { type: 'darken', value: 0.15 } }, active: { filter: { type: 'none' } } },
    });
    charts.est.render();
  }

  /* ── Render KPIs ── */
  function renderKPIs(kpis) {
    const kpiEl = document.getElementById('kpi-row');
    if (!kpiEl) return;
    kpiEl.innerHTML = `
      <div class="kpi-card" style="--kpi-glow:rgba(255,214,0,0.15);--kpi-icon-bg:rgba(255,214,0,0.15);--kpi-icon-border:rgba(255,214,0,0.4);--kpi-icon-color:#ffd600;cursor:pointer;" onclick="if(window.navigate)window.navigate('proformas');">
        <div class="kpi-icon-wrap"><i class="ph-fill ph-bell-ringing"></i></div>
        <div class="kpi-label">PEDIDOS EN ESPERA</div>
        <div class="kpi-value" style="color:#ffd600;">${kpis.pedidosEnEspera}</div>
        <div class="kpi-trend" style="color:#fde68a;"><i class="ph ph-warning"></i><span>${kpis.pedidosEnEspera > 0 ? 'Requiere atención inmediata' : 'Todo atendido'}</span></div>
      </div>
      <div class="kpi-card" style="--kpi-glow:rgba(0,255,170,0.15);--kpi-icon-bg:rgba(0,255,170,0.15);--kpi-icon-border:rgba(0,255,170,0.4);--kpi-icon-color:#00ffaa;">
        <div class="kpi-icon-wrap"><i class="ph-fill ph-check-circle"></i></div>
        <div class="kpi-label">VENTAS CONCRETADAS</div>
        <div class="kpi-value" style="color:#00ffaa;">${kpis.pedidosConcretados}</div>
        <div class="kpi-trend" style="color:var(--neon-green)"><i class="ph ph-trend-up"></i><span>${kpis.tasaCierre}% efectividad de cierre</span></div>
      </div>
      <div class="kpi-card" style="--kpi-glow:rgba(0,212,255,0.15);--kpi-icon-bg:rgba(0,212,255,0.15);--kpi-icon-border:rgba(0,212,255,0.4);--kpi-icon-color:#00d4ff;">
        <div class="kpi-icon-wrap"><i class="ph-fill ph-receipt"></i></div>
        <div class="kpi-label">TOTAL FACTURADO</div>
        <div class="kpi-value">${fmt(kpis.totalVentas, 'PEN')}</div>
        <div class="kpi-trend"><i class="ph ph-file-text" style="color:var(--neon-cyan)"></i><span class="kpi-trend-up">${kpis.totalFact} facturas registradas</span></div>
      </div>
      <div class="kpi-card" style="--kpi-glow:rgba(0,255,136,0.15);--kpi-icon-bg:rgba(0,255,136,0.15);--kpi-icon-border:rgba(0,255,136,0.4);--kpi-icon-color:#00ff88;">
        <div class="kpi-icon-wrap"><i class="ph-fill ph-currency-circle-dollar"></i></div>
        <div class="kpi-label">COBRADO C/ BAUCHER</div>
        <div class="kpi-value">${fmt(kpis.cobrado, 'PEN')}</div>
        <div class="kpi-trend" style="color:var(--neon-green)"><i class="ph ph-shield-check"></i><span>Justificado en caja/bancos</span></div>
      </div>
      <div class="kpi-card" style="--kpi-glow:rgba(255,115,64,0.15);--kpi-icon-bg:rgba(255,115,64,0.15);--kpi-icon-border:rgba(255,115,64,0.4);--kpi-icon-color:#ff7340;">
        <div class="kpi-icon-wrap"><i class="ph-fill ph-clock"></i></div>
        <div class="kpi-label">POR COBRAR</div>
        <div class="kpi-value" style="color:#ff7340;">${fmt(kpis.pendiente, 'PEN')}</div>
        <div class="kpi-trend kpi-trend-down"><i class="ph ph-hourglass-high"></i><span>Saldos en espera</span></div>
      </div>
      <div class="kpi-card" style="--kpi-glow:rgba(168,85,247,0.15);--kpi-icon-bg:rgba(168,85,247,0.15);--kpi-icon-border:rgba(168,85,247,0.4);--kpi-icon-color:#a855f7;">
        <div class="kpi-icon-wrap"><i class="ph-fill ph-package"></i></div>
        <div class="kpi-label">VALOR INVENTARIO</div>
        <div class="kpi-value">${fmt(kpis.invVal, 'PEN')}</div>
        <div class="kpi-trend"><i class="ph ph-stack"></i><span>Stock disponible</span></div>
      </div>
    `;
  }

  /* ── Render ejecutor ── */
  function doRender() {
    const data = getStats();
    renderKPIs(data.kpis);

    const monPen = document.getElementById('mon-pen');
    const monUsd = document.getElementById('mon-usd');
    const monEur = document.getElementById('mon-eur');
    if (monPen) monPen.textContent = fmt(data.byMoneda.PEN, 'PEN');
    if (monUsd) monUsd.textContent = fmt(data.byMoneda.USD, 'USD');
    if (monEur) monEur.textContent = fmt(data.byMoneda.EUR, 'EUR');

    renderTendencia(data);
    renderCategorias(data);
    renderStock(data);
    renderClientes(data);
    renderMonedas(data);
    renderEstados(data);
  }

  function renderWithRetry(attempts = 0) {
    if (typeof ApexCharts !== 'undefined') {
      doRender();
    } else if (attempts < 25) {
      setTimeout(() => renderWithRetry(attempts + 1), 100);
    }
  }

  /* ── Build HTML structure ── */
  function buildHTML() {
    const monthOpts = [
      '<option value="all">📅 Todos los meses</option>',
      ...MESES_NOMBRES.map((name, idx) => `<option value="${idx}">${name}</option>`)
    ].join('');

    return `
<div class="page-hero page-hero--stats">
  <div class="page-hero-bg"></div>
  <div class="page-hero-content">
    <div class="page-hero-left">
      <div class="page-hero-icon" style="--hero-icon-color:#f59e0b;--hero-icon-bg:rgba(245,158,11,0.15);--hero-icon-border:rgba(245,158,11,0.3);">
        <i class="ph-fill ph-chart-bar-horizontal"></i>
      </div>
      <div>
        <div class="page-hero-eyebrow">Panel Principal</div>
        <h1 class="page-hero-title">Estadísticas de Ventas</h1>
        <p class="page-hero-subtitle">Control en tiempo real de Pedidos del Catálogo, Facturación Electrónica e Inventario</p>
      </div>
    </div>
  </div>
</div>


<!-- Barra de Filtros de Período -->
<div class="filter-bar filter-bar--stats" style="margin-bottom:18px;">
  <div class="filter-pill-group">
    <i class="ph ph-calendar-blank" style="color:#f59e0b;font-size:15px;flex-shrink:0;"></i>
    <select class="select-pill" id="select-month-filter">
      ${monthOpts}
    </select>
    <select class="select-pill" id="select-year-filter">
      <option value="2026" selected>2026</option>
      <option value="2025">2025</option>
      <option value="2024">2024</option>
      <option value="all">Todos</option>
    </select>
    <button class="pill-btn pill-btn-primary" id="btn-quick-this-month">
      <i class="ph ph-calendar-check"></i> Este mes
    </button>
    <button class="pill-btn pill-btn-ghost" id="btn-quick-reset-filter">
      <i class="ph ph-arrow-counter-clockwise"></i> Ver todo
    </button>
  </div>
</div>


<!-- KPI Row -->
<div class="kpi-grid" id="kpi-row" style="margin-bottom:24px; grid-template-columns:repeat(3,1fr);"></div>

<!-- Row 1: Tendencia + Monedas -->
<div class="grid-2" style="margin-bottom:20px;">
  <div class="chart-card">
    <div class="chart-title">📈 Tendencia de Facturación y Pedidos del Catálogo</div>
    <div class="chart-subtitle">Comparativa mensual de montos facturados vs solicitudes recibidas</div>
    <div id="chart-tendencia" style="min-height:270px;"></div>
  </div>
  <div class="chart-card">
    <div class="chart-title">💱 Distribución por Moneda</div>
    <div class="chart-subtitle">Participación acumulada en Soles (S/), Dólares ($) y Euros (€)</div>
    <div id="chart-monedas" style="min-height:270px;"></div>
    <div style="display:flex;gap:24px;justify-content:center;margin-top:4px;">
      <div style="text-align:center;">
        <div class="mono-text" style="font-size:10px;color:var(--text-2)">SOLES</div>
        <div class="mono-text" style="font-size:13px;font-weight:700;color:var(--neon-cyan)" id="mon-pen">S/ 0</div>
      </div>
      <div style="text-align:center;">
        <div class="mono-text" style="font-size:10px;color:var(--text-2)">DÓLARES</div>
        <div class="mono-text" style="font-size:13px;font-weight:700;color:var(--neon-green)" id="mon-usd">$ 0</div>
      </div>
      <div style="text-align:center;">
        <div class="mono-text" style="font-size:10px;color:var(--text-2)">EUROS</div>
        <div class="mono-text" style="font-size:13px;font-weight:700;color:var(--neon-purple)" id="mon-eur">€ 0</div>
      </div>
    </div>
  </div>
</div>

<!-- Row 2: Ventas por Categoría + Stock por Producto -->
<div class="grid-2" style="margin-bottom:20px;">
  <div class="chart-card">
    <div class="chart-title">📊 Ventas por Categoría de Producto</div>
    <div class="chart-subtitle">Monto total facturado por categoría en el período</div>
    <div id="chart-categorias" style="min-height:270px;"></div>
  </div>
  <div class="chart-card">
    <div class="chart-title">📦 Nivel de Stock por Producto (Inventario)</div>
    <div class="chart-subtitle">Unidades disponibles en almacén por producto principal</div>
    <div id="chart-stock" style="min-height:270px;"></div>
  </div>
</div>

<!-- Row 3: Top Clientes + Estado de Facturas -->
<div class="grid-2" style="margin-bottom:20px;">
  <div class="chart-card">
    <div class="chart-title">🏆 Top Clientes por Facturación</div>
    <div class="chart-subtitle">Ranking de clientes con mayor monto acumulado</div>
    <div id="chart-clientes" style="min-height:270px;"></div>
  </div>
  <div class="chart-card">
    <div class="chart-title">🔵 Estado de Facturas</div>
    <div class="chart-subtitle">Distribución de facturas cobradas, pendientes y vencidas</div>
    <div id="chart-estados" style="min-height:270px;"></div>
  </div>
</div>
`;
  }

  /* ── Init ── */
  function init() {
    const mc = document.getElementById('main-content');
    if (!mc) return;
    mc.innerHTML = buildHTML();

    const mSelect = document.getElementById('select-month-filter');
    const ySelect = document.getElementById('select-year-filter');
    const btnThis = document.getElementById('btn-quick-this-month');
    const btnReset= document.getElementById('btn-quick-reset-filter');

    if (mSelect) {
      mSelect.addEventListener('change', () => {
        selectedMonth = mSelect.value;
        renderWithRetry();
      });
    }

    if (ySelect) {
      ySelect.addEventListener('change', () => {
        selectedYear = ySelect.value;
        renderWithRetry();
      });
    }

    if (btnThis) {
      btnThis.addEventListener('click', () => {
        const now = new Date();
        selectedMonth = now.getMonth().toString();
        selectedYear  = now.getFullYear().toString();
        if (mSelect) mSelect.value = selectedMonth;
        if (ySelect) ySelect.value = selectedYear;
        renderWithRetry();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        selectedMonth = 'all';
        selectedYear  = '2026';
        if (mSelect) mSelect.value = 'all';
        if (ySelect) ySelect.value = '2026';
        renderWithRetry();
      });
    }

    setTimeout(renderWithRetry, 60);
  }

  window.initEstadisticas   = init;
  window.renderEstadisticas = init;

  window.destroyEstadisticas = function () {
    Object.keys(charts).forEach(k => destroyChart(k));
  };
})();
