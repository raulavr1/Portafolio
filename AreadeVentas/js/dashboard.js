/**
 * dashboard.js — Home con KPIs, alertas y resumen ejecutivo
 */
function renderDashboard() {
  const kpis  = AppDB.stats.getKPIs();
  const profs = AppDB.proformas.getAll();
  const facs  = AppDB.facturas.getAll();
  const prods = AppDB.productos.getAll();
  const tend  = AppDB.stats.getTendenciaMensual();

  // KPI cards config
  const kpiCards = [
    {
      label    : 'Pedidos del Catálogo',
      value    : kpis.proformasActivas,
      icon     : 'ph-fill ph-shopping-bag',
      iconBg   : 'rgba(99,102,241,0.15)',
      color    : 'var(--accent-grad)',
      delta    : `${profs.filter(p=>p.estado==='aprobada'||p.estado==='convertida').length} concretadas`,
      deltaClass:''
    },
    {
      label    : 'Facturas por Cobrar',
      value    : kpis.facsPendientes,
      icon     : 'ph-fill ph-receipt',
      iconBg   : 'rgba(245,158,11,0.15)',
      color    : 'linear-gradient(135deg,#f59e0b,#f97316)',
      delta    : `${fmtCurrency(kpis.totalPorCobrar)} pendiente`,
      deltaClass:'down'
    },
    {
      label    : 'Ventas del Mes',
      value    : fmtCurrency(kpis.ventasMes),
      icon     : 'ph-fill ph-trend-up',
      iconBg   : 'rgba(16,185,129,0.15)',
      color    : 'linear-gradient(135deg,#10b981,#06b6d4)',
      delta    : `${facs.filter(f=>f.estado_pago==='cobrada').length} facturas cobradas`,
      deltaClass:'up'
    },
    {
      label    : 'Valor Inventario',
      value    : fmtCurrency(kpis.valorInventario),
      icon     : 'ph-fill ph-package',
      iconBg   : 'rgba(139,92,246,0.15)',
      color    : 'linear-gradient(135deg,#8b5cf6,#ec4899)',
      delta    : `${prods.length} productos activos`,
      deltaClass:''
    }
  ];

  // Recent proformas (last 5)
  const recentProfs = [...profs]
    .sort((a,b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 5);

  // Pending facturas
  const pendFacs = facs.filter(f => ['pendiente','parcial','vencida'].includes(f.estado_pago))
    .sort((a,b) => new Date(a.vencimiento_pago) - new Date(b.vencimiento_pago))
    .slice(0, 5);

  // Low stock alerts
  const lowStock = kpis.stockBajo;

  document.getElementById('main-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Resumen ejecutivo del área de ventas · ${new Date().toLocaleDateString('es',{day:'2-digit',month:'long',year:'numeric'})}</p>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      ${kpiCards.map(k => `
        <div class="kpi-card" style="--kpi-color:${k.color};--kpi-icon-bg:${k.iconBg}">
          <div class="kpi-icon-wrap"><i class="${k.icon}" style="color:var(--text-1)"></i></div>
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value">${k.value}</div>
          <div class="kpi-delta ${k.deltaClass}">${k.delta}</div>
        </div>
      `).join('')}
    </div>

    <!-- Charts row -->
    <div class="grid-2" style="margin-bottom:22px;">
      <div class="chart-card">
        <div class="chart-title">Tendencia de Ventas ${new Date().getFullYear()}</div>
        <div class="chart-subtitle">Total facturado por mes (todas las monedas)</div>
        <div class="chart-wrapper" style="height:220px;">
          <canvas id="chart-tendency"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Distribución por Cliente</div>
        <div class="chart-subtitle">Participación en ventas totales</div>
        <div class="chart-wrapper" style="height:220px;">
          <canvas id="chart-clients"></canvas>
        </div>
      </div>
    </div>

    <!-- Tables row -->
    <div class="grid-2" style="margin-bottom:22px;">
      <!-- Recent proformas -->
      <div class="card" style="padding:0;">
        <div class="section-header" style="padding:16px 20px 0;">
          <span class="section-title">Pedidos Recientes del Catálogo</span>
          <button class="btn btn-secondary btn-sm" onclick="Router.navigate('proformas')">
            Ver todos <i class="ph ph-arrow-right"></i>
          </button>
        </div>
        <div style="overflow:auto;">
          <table class="data-table">
            <thead><tr>
              <th>Número</th><th>Cliente</th><th>Total</th><th>Estado</th>
            </tr></thead>
            <tbody>
              ${recentProfs.length ? recentProfs.map(p => `
                <tr>
                  <td class="td-mono">${p.numero}</td>
                  <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.cliente}</td>
                  <td style="font-weight:700">${fmtCurrency(p.total, p.moneda)}</td>
                  <td>${proformaBadge(p.estado)}</td>
                </tr>
              `).join('') : `<tr><td colspan="4" class="table-empty"><i class="ph ph-shopping-bag"></i>Sin pedidos recientes</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pending facturas -->
      <div class="card" style="padding:0;">
        <div class="section-header" style="padding:16px 20px 0;">
          <span class="section-title">Cuentas por Cobrar</span>
          <button class="btn btn-secondary btn-sm" onclick="Router.navigate('facturacion')">
            Ver todas <i class="ph ph-arrow-right"></i>
          </button>
        </div>
        <div style="overflow:auto;">
          <table class="data-table">
            <thead><tr>
              <th>Factura</th><th>Cliente</th><th>Pendiente</th><th>Vence</th>
            </tr></thead>
            <tbody>
              ${pendFacs.length ? pendFacs.map(f => {
                const pend = f.total - (f.monto_cobrado||0);
                const exp  = isExpired(f.vencimiento_pago);
                return `<tr>
                  <td class="td-mono">${f.numero}</td>
                  <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.cliente}</td>
                  <td style="font-weight:700;color:var(--warning)">${fmtCurrency(pend, f.moneda)}</td>
                  <td style="color:${exp?'var(--danger)':'var(--text-2)'};">${fmtDate(f.vencimiento_pago)}</td>
                </tr>`;
              }).join('') : `<tr><td colspan="4" class="table-empty"><i class="ph ph-check-circle"></i>Sin pendientes</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Alerts -->
    ${lowStock.length ? `
    <div class="card" style="margin-bottom:22px;">
      <div class="section-header">
        <span class="section-title">⚠ Alertas de Inventario — Stock Bajo</span>
        <button class="btn btn-secondary btn-sm" onclick="Router.navigate('inventario')">
          Ir a Inventario <i class="ph ph-arrow-right"></i>
        </button>
      </div>
      <div class="alert-list">
        ${lowStock.map(p => {
          const cls = p.stock === 0 ? 'crit' : 'warn';
          return `<div class="alert-item ${cls}">
            <i class="ph-fill ph-warning-circle alert-icon" style="color:${p.stock===0?'var(--danger)':'var(--warning)'}"></i>
            <div style="flex:1">
              <div class="alert-text">${p.descripcion}</div>
              <div class="alert-sub">Código: ${p.codigo} · Stock actual: <strong>${p.stock} ${p.unidad}</strong> · Mínimo: ${p.stock_minimo}</div>
            </div>
            <span class="badge ${p.stock===0?'badge-danger':'badge-warning'}">${p.stock===0?'Sin stock':'Stock bajo'}</span>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    <!-- Bottom row: top products + summary -->
    <div class="grid-2">
      <div class="chart-card">
        <div class="chart-title">Top Productos por Ventas</div>
        <div class="chart-subtitle">Monto facturado acumulado</div>
        <div class="chart-wrapper" style="height:200px;">
          <canvas id="chart-top-products"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:14px">Resumen Rápido</div>
        ${buildQuickSummary(profs, facs, prods)}
      </div>
    </div>
  `;

  // Render charts
  renderTendencyChart(tend);
  renderClientsChart();
  renderTopProductsChart();
}

// ── Quick summary table ───────────────────────────────────────────────────────
function buildQuickSummary(profs, facs, prods) {
  const rows = [
    ['Total proformas', profs.length],
    ['  · Pendientes', profs.filter(p=>p.estado==='pendiente').length],
    ['  · Aprobadas',  profs.filter(p=>p.estado==='aprobada').length],
    ['  · Convertidas',profs.filter(p=>p.estado==='convertida').length],
    ['Total facturas',  facs.length],
    ['  · Cobradas',   facs.filter(f=>f.estado_pago==='cobrada').length],
    ['  · Pendientes', facs.filter(f=>f.estado_pago==='pendiente').length],
    ['  · Vencidas',   facs.filter(f=>f.estado_pago==='vencida').length],
    ['Total productos', prods.length],
    ['  · Stock bajo', prods.filter(p=>p.stock<=p.stock_minimo).length]
  ];
  return `<div style="display:flex;flex-direction:column;gap:6px;">
    ${rows.map((r,i) => `
      <div style="display:flex;justify-content:space-between;align-items:center;
        padding:6px 0; ${i>0&&i<4||i>4&&i<8||i>8?'':'border-bottom:1px solid var(--border)'};
        font-size:13px; color:${r[0].startsWith('  ')?'var(--text-3)':'var(--text-1)'};
        font-weight:${r[0].startsWith('  ')?'400':'600'}">
        <span>${r[0].trim()}</span>
        <span style="font-weight:700;color:${r[1]>0&&(r[0].includes('Venc')||r[0].includes('bajo'))?'var(--danger)':'var(--text-1)'}">${r[1]}</span>
      </div>
    `).join('')}
  </div>`;
}

// ── Charts ────────────────────────────────────────────────────────────────────
let chartTendency, chartClients, chartTopProducts;

function renderTendencyChart(tend) {
  const ctx = document.getElementById('chart-tendency');
  if (!ctx) return;
  if (chartTendency) chartTendency.destroy();
  chartTendency = new Chart(ctx, {
    type: 'line',
    data: {
      labels  : tend.labels,
      datasets: [{
        label        : 'Ventas',
        data         : tend.ventas,
        borderColor  : '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.12)',
        tension      : 0.4,
        fill         : true,
        pointRadius  : 4,
        pointBackgroundColor:'#6366f1',
        pointBorderColor:'#fff',
        pointBorderWidth:2
      }]
    },
    options: chartDefaults({ legend: false })
  });
}

function renderClientsChart() {
  const ctx = document.getElementById('chart-clients');
  if (!ctx) return;
  if (chartClients) chartClients.destroy();
  const data = AppDB.stats.getVentasPorCliente();
  chartClients = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels  : data.map(d => d.cliente.split(' ').slice(0,2).join(' ')),
      datasets: [{
        data           : data.map(d => d.total),
        backgroundColor: ['#6366f1','#8b5cf6','#10b981','#f59e0b','#3b82f6'],
        borderColor    : 'var(--bg-elevated)',
        borderWidth    : 3,
        hoverOffset    : 6
      }]
    },
    options: {
      ...chartDefaults({ legend: true }),
      cutout: '62%'
    }
  });
}

function renderTopProductsChart() {
  const ctx = document.getElementById('chart-top-products');
  if (!ctx) return;
  if (chartTopProducts) chartTopProducts.destroy();
  const data = AppDB.stats.getVentasPorProducto().slice(0, 6);
  chartTopProducts = new Chart(ctx, {
    type: 'bar',
    data: {
      labels  : data.map(d => d.name.length > 22 ? d.name.substr(0,22)+'…' : d.name),
      datasets: [{
        label          : 'Ventas $',
        data           : data.map(d => d.total),
        backgroundColor: 'rgba(99,102,241,0.7)',
        borderColor    : '#6366f1',
        borderWidth    : 1,
        borderRadius   : 6
      }]
    },
    options: { ...chartDefaults({ legend: false }), indexAxis: 'y' }
  });
}

// ── Shared Chart defaults ─────────────────────────────────────────────────────
function chartDefaults({ legend = true } = {}) {
  return {
    responsive         : true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display : legend,
        labels  : { color:'#475569', font:{ size:11, family:'Inter' }, boxWidth:12, padding:14 }
      },
      tooltip: {
        backgroundColor:'#ffffff',
        titleColor     :'#0f172a',
        bodyColor      :'#475569',
        borderColor    :'#cbd5e1',
        borderWidth    :1,
        padding        :10,
        cornerRadius   :8,
        boxShadow      :'0 4px 12px rgba(0,0,0,0.1)'
      }
    },
    scales: {
      x: {
        grid : { color:'rgba(0,0,0,0.05)' },
        ticks: { color:'#64748b', font:{ size:11 } }
      },
      y: {
        grid : { color:'rgba(0,0,0,0.05)' },
        ticks: { color:'#64748b', font:{ size:11 } }
      }
    }
  };
}
