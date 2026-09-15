/**
 * app.js — Router SPA + Utilidades globales
 */

// ─── Formatters ──────────────────────────────────────────────────────────────
function fmtCurrency(amount, currency = 'PEN') {
  const n = parseFloat(amount || 0);
  const sym = { PEN: 'S/ ', USD: '$ ', EUR: '€ ' };
  const s = sym[currency] || (currency + ' ');
  return s + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtNum(n, dec = 2) {
  return parseFloat(n || 0).toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function isExpired(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr + 'T00:00:00') < new Date(new Date().toDateString());
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr + 'T00:00:00') - new Date(new Date().toDateString());
  return Math.ceil(diff / 86400000);
}

// ─── Badge Helpers ────────────────────────────────────────────────────────────
function proformaBadge(estado) {
  const map = {
    pendiente  : '<span class="badge badge-warning">Pendiente</span>',
    aprobada   : '<span class="badge badge-success">Aprobada</span>',
    rechazada  : '<span class="badge badge-danger">Rechazada</span>',
    convertida : '<span class="badge badge-purple">Convertida</span>',
    vencida    : '<span class="badge badge-neutral">Vencida</span>'
  };
  return map[estado] || `<span class="badge badge-neutral">${estado}</span>`;
}

function facturaBadge(estado) {
  const map = {
    pendiente : '<span class="badge badge-warning">Pendiente</span>',
    parcial   : '<span class="badge badge-info">Pago Parcial</span>',
    cobrada   : '<span class="badge badge-success">Cobrada</span>',
    vencida   : '<span class="badge badge-danger">Vencida</span>'
  };
  return map[estado] || `<span class="badge badge-neutral">${estado}</span>`;
}

function stockBadge(stock, min) {
  if (stock === 0)      return '<span class="badge badge-danger">Sin stock</span>';
  if (stock <= min)     return '<span class="badge badge-warning">Stock bajo</span>';
  if (stock <= min * 1.5) return '<span class="badge badge-info">Stock OK</span>';
  return '<span class="badge badge-success">Stock OK</span>';
}

function stockClass(stock, min) {
  if (stock === 0)        return 'crit';
  if (stock <= min)       return 'crit';
  if (stock <= min * 1.5) return 'warn';
  return 'ok';
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function showModal(title, bodyHTML, footerHTML = '', size = '') {
  document.getElementById('modal-title').innerHTML  = title;
  document.getElementById('modal-body').innerHTML   = bodyHTML;
  document.getElementById('modal-footer').innerHTML = footerHTML;
  const box = document.getElementById('modal-box');
  box.className = 'modal' + (size ? ' modal-' + size : '');
  document.getElementById('modal-overlay').classList.add('active');
  document.body.classList.add('modal-open');
  ScrollLock.lock();
}

/* ── Control Universal de Scroll (Fondo 100% Inmóvil y Estable) ───────────── */
window.ScrollLock = {
  lock() {},
  unlock() {},
  reset() {}
};

// Bloquear absolutamente cualquier intento de scroll hacia el fondo mientras haya un modal
window.addEventListener('wheel', function(e) {
  if (!document.body.classList.contains('modal-open')) return;
  const overlay = document.querySelector('.modal-overlay.active');
  if (!overlay) return;

  const scrollContainer = e.target.closest('.modal-body, .items-table-wrap, [style*="overflow"]');
  if (scrollContainer) {
    const canScroll = scrollContainer.scrollHeight > scrollContainer.clientHeight;
    if (canScroll) {
      const isUp = e.deltaY < 0;
      const isDown = e.deltaY > 0;
      const atTop = scrollContainer.scrollTop <= 0 && isUp;
      const atBottom = (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 1) && isDown;
      if (!atTop && !atBottom) {
        return; // Permite scroll fluido dentro del modal
      }
    }
  }

  // Prevenir que el scroll se encadene o mueva el dashboard de fondo
  e.preventDefault();
}, { passive: false });

window.addEventListener('touchmove', function(e) {
  if (!document.body.classList.contains('modal-open')) return;
  const overlay = document.querySelector('.modal-overlay.active');
  if (!overlay) return;
  const scrollContainer = e.target.closest('.modal-body, [style*="overflow"]');
  if (!scrollContainer) {
    e.preventDefault();
  }
}, { passive: false });


/**
 * openModal — versión mejorada con array de botones
 * @param {string} title
 * @param {string} bodyHTML
 * @param {Array<{label, cls, action}>} buttons
 * @param {string} size — 'sm'|'lg'|'xl'
 */
function openModal(title, bodyHTML, buttons = [], size = '') {
  document.getElementById('modal-title').innerHTML = title;
  document.getElementById('modal-body').innerHTML  = bodyHTML;
  const footer = document.getElementById('modal-footer');
  footer.innerHTML = '';
  buttons.forEach(btn => {
    const b = document.createElement('button');
    b.className = `btn ${btn.cls || 'btn-secondary'}`;
    b.innerHTML = btn.label;
    b.addEventListener('click', btn.action);
    footer.appendChild(b);
  });
  const box = document.getElementById('modal-box');
  box.className = 'modal' + (size ? ' modal-' + size : '');
  document.getElementById('modal-overlay').classList.add('active');
  document.body.classList.add('modal-open');
  ScrollLock.lock();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  document.body.classList.remove('modal-open');
  ScrollLock.unlock();
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function showConfirm(title, message, onConfirm, danger = true) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-body').innerHTML =
    `<p style="color:var(--text-2);font-size:14px;line-height:1.6;">${message}</p>`;
  document.getElementById('confirm-footer').innerHTML = `
    <button class="btn btn-secondary btn-sm" id="confirm-cancel-btn">Cancelar</button>
    <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-sm" id="confirm-ok-btn">Confirmar</button>
  `;
  document.getElementById('confirm-overlay').classList.add('active');
  ScrollLock.lock();

  document.getElementById('confirm-cancel-btn').onclick = () => {
    document.getElementById('confirm-overlay').classList.remove('active');
    ScrollLock.unlock();
  };
  document.getElementById('confirm-ok-btn').onclick = () => {
    document.getElementById('confirm-overlay').classList.remove('active');
    ScrollLock.unlock();
    onConfirm();
  };
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const icons = { success: 'ph-check-circle', error: 'ph-x-circle', warning: 'ph-warning', info: 'ph-info' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <i class="ph-fill ${icons[type] || icons.info} toast-icon"></i>
    <span style="flex:1;color:var(--text-1)">${message}</span>
  `;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 320);
  }, 3400);
}

// ─── Sidebar Badges ───────────────────────────────────────────────────────────
function updateSidebarBadges() {
  try {
    const kpis = AppDB.stats.getKPIs();
    const allPros = AppDB.proformas ? AppDB.proformas.getAll() : [];
    const pedidosEnEspera = allPros.filter(p => p.estado === 'en_espera' || p.estado === 'pendiente').length;

    const bp = document.getElementById('badge-proformas');
    const bf = document.getElementById('badge-facturas');
    const bs = document.getElementById('badge-stock');

    if (bp) {
      if (pedidosEnEspera > 0) {
        bp.textContent = `${pedidosEnEspera} ALERTA`;
        bp.className = 'nav-badge nav-badge-warn';
        bp.style.background = 'linear-gradient(135deg, #ffd600, #ff2a85)';
        bp.style.color = '#060a17';
        bp.style.fontWeight = '800';
        bp.style.boxShadow = '0 0 10px rgba(255, 214, 0, 0.6)';
        bp.style.display = 'inline-flex';
      } else {
        bp.textContent = kpis.proformasActivas || '';
        bp.className = 'nav-badge';
        bp.style.background = '';
        bp.style.color = '';
        bp.style.boxShadow = '';
      }
    }
    if (bf) bf.textContent = kpis.facsPendientes   || '';
    if (bs) bs.textContent = kpis.stockBajo.length  || '';

    const dot = document.getElementById('notif-badge-dot');
    if (dot) {
      const prods = AppDB.productos ? AppDB.productos.getAll() : [];
      const facs  = AppDB.facturas ? AppDB.facturas.getAll() : [];
      const lowStock = prods.filter(p => p.stock <= p.stock_minimo).length;
      const pendingFacs = facs.filter(f => f.estado_pago === 'pendiente' || f.estado_pago === 'vencida').length;
      dot.style.display = (lowStock + pendingFacs + pedidosEnEspera) > 0 ? 'block' : 'none';
    }
  } catch(e) {}
}

window.openNotificationsModal = function() {
  const prods     = AppDB.productos ? AppDB.productos.getAll() : [];
  const facturas  = AppDB.facturas ? AppDB.facturas.getAll() : [];
  const proformas = AppDB.proformas ? AppDB.proformas.getAll() : [];

  const lowStock     = prods.filter(p => p.stock <= p.stock_minimo);
  const pendingFacs  = facturas.filter(f => f.estado_pago === 'pendiente' || f.estado_pago === 'vencida');
  const pedidosEspera= proformas.filter(p => p.estado === 'en_espera' || p.estado === 'pendiente');

  const totalAlerts = lowStock.length + pendingFacs.length + pedidosEspera.length;

  let contentHtml = '';

  if (totalAlerts === 0) {
    contentHtml = `
      <div style="text-align:center;padding:32px 16px;">
        <i class="ph-fill ph-check-circle" style="font-size:48px;color:var(--neon-green);margin-bottom:10px;display:block;"></i>
        <h3 style="font-size:16px;color:#fff;margin-bottom:4px;">¡Todo al día!</h3>
        <p style="font-size:13px;color:var(--text-3);">No hay pedidos en espera, stock bajo ni facturas vencidas.</p>
      </div>
    `;
  } else {
    contentHtml = `
      <div style="display:flex;flex-direction:column;gap:14px;max-height:380px;overflow-y:auto;">
        ${pedidosEspera.length ? `
          <div style="background:rgba(255,214,0,0.1);border:1px solid rgba(255,214,0,0.4);border-radius:12px;padding:14px;">
            <div style="font-size:13.5px;font-weight:700;color:#ffd600;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
              <span><i class="ph-fill ph-bell-ringing"></i> Pedidos en Espera (${pedidosEspera.length} clientes)</span>
              <button class="btn btn-primary btn-xs" onclick="closeModal();Router.navigate('proformas')">Atender pedidos</button>
            </div>
            <div style="font-size:12px;color:var(--text-2);line-height:1.6;">
              ${pedidosEspera.slice(0, 4).map(p => `• <strong>${p.cliente}</strong> (${p.numero}) — S/ ${parseFloat(p.total).toFixed(2)} ${p.telefono ? '· Tel: ' + p.telefono : ''}`).join('<br>')}
            </div>
          </div>
        ` : ''}
        ${lowStock.length ? `
          <div style="background:rgba(255,45,120,0.08);border:1px solid rgba(255,45,120,0.3);border-radius:12px;padding:14px;">
            <div style="font-size:13.5px;font-weight:700;color:var(--neon-pink);margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
              <span><i class="ph-fill ph-warning"></i> Stock Bajo (${lowStock.length} productos)</span>
              <button class="btn btn-secondary btn-xs" onclick="closeModal();Router.navigate('inventario')">Ver inventario</button>
            </div>
            <div style="font-size:12px;color:var(--text-2);line-height:1.6;">
              ${lowStock.slice(0, 4).map(p => `• <strong>${p.descripcion}</strong>: ${p.stock} ${p.unidad} (mínimo ${p.stock_minimo})`).join('<br>')}
              ${lowStock.length > 4 ? `<br><small style="color:var(--text-3)">… y ${lowStock.length - 4} productos más</small>` : ''}
            </div>
          </div>
        ` : ''}

        ${pendingFacs.length ? `
          <div style="background:rgba(255,224,0,0.08);border:1px solid rgba(255,224,0,0.3);border-radius:12px;padding:14px;">
            <div style="font-size:13.5px;font-weight:700;color:var(--neon-yellow);margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
              <span><i class="ph-fill ph-receipt"></i> Facturas Pendientes / Vencidas (${pendingFacs.length})</span>
              <button class="btn btn-secondary btn-xs" onclick="closeModal();Router.navigate('facturacion')">Ver facturas</button>
            </div>
            <div style="font-size:12px;color:var(--text-2);line-height:1.6;">
              ${pendingFacs.slice(0, 3).map(f => `• Factura <strong>${f.numero}</strong> (${f.cliente}): S/ ${f.total.toFixed(2)}`).join('<br>')}
            </div>
          </div>
        ` : ''}


      </div>
    `;
  }

  openModal(
    `<i class="ph-fill ph-bell" style="color:var(--neon-cyan)"></i> Alertas del Sistema (${totalAlerts})`,
    contentHtml,
    [{ label: 'Cerrar', cls: 'btn-secondary', action: closeModal }]
  );
};

// ─── Router ───────────────────────────────────────────────────────────────────
const Router = (function () {
  const pages = {
    estadisticas : { title: 'Estadísticas de Ventas', icon: 'ph-fill ph-chart-bar',  render: () => initEstadisticas() },
    catalogo     : { title: 'Catálogo de Productos',   icon: 'ph-fill ph-storefront', render: () => renderCatalogo() },
    proformas    : { title: 'Gestión de Pedidos',     icon: 'ph-fill ph-shopping-bag', render: () => renderProformas() },
    pedidos      : { title: 'Gestión de Pedidos',     icon: 'ph-fill ph-shopping-bag', render: () => renderProformas() },
    facturacion  : { title: 'Facturación',             icon: 'ph-fill ph-receipt',    render: () => renderFacturacion() },
    inventario   : { title: 'Inventario',              icon: 'ph-fill ph-package',    render: () => renderInventario() },
  };

  let current = 'estadisticas';

  function navigate(pageKey) {
    /* Destruir charts de estadísticas si salimos de esa página */
    if (current === 'estadisticas' && pageKey !== 'estadisticas') {
      if (typeof destroyEstadisticas === 'function') destroyEstadisticas();
    }
    const page = pages[pageKey] || pages['estadisticas'];
    current = pageKey;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`[data-page="${pageKey}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Update topbar title
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = page.title;

    // Show tech spinner then render
    const content = document.getElementById('main-content');
    content.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:16px;"><div class="tech-spinner"></div><p class="mono-text" style="color:var(--neon-cyan);font-size:11px;letter-spacing:2px;">CARGANDO…</p></div>`;
    requestAnimationFrame(() => page.render());
  }

  function getCurrent() { return current; }

  /* Exponer navigate globalmente para módulos externos */
  window.navigate = navigate;

  /* ── Manejo robusto del menú lateral en móviles ─────────────── */
  window.closeMobileSidebar = function() {
    if (document.body.classList.contains('sidebar-open')) {
      document.body.classList.remove('sidebar-open');
      ScrollLock.unlock();
    }
  };

  window.toggleSidebar = function() {
    const isMobile = window.innerWidth <= 900;
    const sidebar  = document.getElementById('sidebar');
    const mainWrap = document.getElementById('main-wrapper');

    if (isMobile) {
      if (sidebar)  sidebar.classList.remove('collapsed');
      if (mainWrap) mainWrap.classList.remove('expanded');
      const wasOpen = document.body.classList.contains('sidebar-open');
      if (wasOpen) {
        document.body.classList.remove('sidebar-open');
        ScrollLock.unlock();
      } else {
        document.body.classList.add('sidebar-open');
        ScrollLock.lock();
      }
    } else {
      document.body.classList.remove('sidebar-open');
      ScrollLock.reset();
      if (sidebar)  sidebar.classList.toggle('collapsed');
      if (mainWrap) mainWrap.classList.toggle('expanded');
    }
  };

  window.addEventListener('resize', () => {
    const sidebar  = document.getElementById('sidebar');
    const mainWrap = document.getElementById('main-wrapper');
    if (window.innerWidth <= 900) {
      if (sidebar)  sidebar.classList.remove('collapsed');
      if (mainWrap) mainWrap.classList.remove('expanded');
    } else {
      if (document.body.classList.contains('sidebar-open')) {
        document.body.classList.remove('sidebar-open');
        ScrollLock.reset();
      }
    }
  });

  function init() {
    // Nav click handlers
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        navigate(el.dataset.page);
      });
    });

    // Sidebar toggle — desktop collapses, mobile off-canvas
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
      });
    }

    // Direct backdrop click handler for closing sidebar
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        closeMobileSidebar();
      });
      backdrop.addEventListener('touchstart', (e) => {
        e.preventDefault();
        closeMobileSidebar();
      }, { passive: false });
    }

    // Close sidebar on mobile when nav item clicked
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => {
        if (window.innerWidth <= 900) closeMobileSidebar();
      });
    });

    // Manage users button
    const userBtn = document.getElementById('manage-users-btn');
    if (userBtn) {
      userBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof openUsersModal === 'function') {
          openUsersModal();
        } else {
          showToast('Módulo de usuarios cargando...', 'info');
        }
      });
    }

    // Reset / Clear data options modal
    window.appClearAllData = function() {
      closeModal();
      showConfirm('Vaciar toda la información', '¿Estás seguro de vaciar todos los registros? El dashboard quedará completamente limpio para que importes tu propia información.', () => {
        AppDB.clearAllData();
        showToast('🧹 Toda la información ha sido vaciada', 'warning');
        updateSidebarBadges();
        navigate(current);
      });
    };

    window.appSeedDemoProducts = function() {
      localStorage.removeItem('vp_data_cleared');
      AppDB.resetDemo();
      showToast('✨ 15 productos con imágenes y precios cargados al Inventario y Catálogo', 'success');
      updateSidebarBadges();
      navigate(current || 'inventario');
    };

    window.appResetDemoData = function() {
      closeModal();
      showConfirm('Restablecer datos demo', 'Esto restaurará los datos de ejemplo iniciales. ¿Continuar?', () => {
        AppDB.resetDemo();
        showToast('✅ Datos de prueba restaurados', 'success');
        updateSidebarBadges();
        navigate(current);
      });
    };

    document.getElementById('reset-btn').addEventListener('click', () => {
      openModal(
        '<i class="ph-fill ph-flask" style="color:var(--neon-cyan)"></i> Modo Demostración',
        `
          <div style="text-align:center;padding:8px 0 20px;">
            <div style="width:64px;height:64px;border-radius:16px;background:rgba(0,212,255,0.12);border:1px solid rgba(0,212,255,0.35);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
              <i class="ph-fill ph-flask" style="font-size:32px;color:#00d4ff;"></i>
            </div>
            <h3 style="font-size:17px;color:#fff;margin-bottom:8px;font-weight:800;">Entorno de Demostración Activo</h3>
            <p style="font-size:13px;color:var(--text-2);line-height:1.65;max-width:400px;margin:0 auto 20px;">
              Este dashboard está diseñado exclusivamente para explorar sus funcionalidades. 
              Todas las interacciones — creación, edición y eliminación de registros — son <strong style="color:var(--neon-cyan);">completamente simuladas</strong> 
              y no generan ningún tipo de persistencia real ni comunicación con servidores externos.
            </p>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.25);border-radius:10px;padding:13px;display:flex;align-items:flex-start;gap:10px;">
              <i class="ph-fill ph-shield-check" style="font-size:18px;color:var(--neon-cyan);flex-shrink:0;margin-top:1px;"></i>
              <div>
                <div style="font-size:12.5px;font-weight:700;color:#fff;margin-bottom:3px;">Datos de ejemplo precargados</div>
                <div style="font-size:11.5px;color:var(--text-3);">El sistema incluye 15 productos, proformas y facturas de muestra para que pueda explorar cada módulo sin restricciones.</div>
              </div>
            </div>
            <div style="background:rgba(0,255,157,0.05);border:1px solid rgba(0,255,157,0.2);border-radius:10px;padding:13px;display:flex;align-items:flex-start;gap:10px;">
              <i class="ph-fill ph-eye" style="font-size:18px;color:var(--neon-green);flex-shrink:0;margin-top:1px;"></i>
              <div>
                <div style="font-size:12.5px;font-weight:700;color:#fff;margin-bottom:3px;">Solo lectura interactiva</div>
                <div style="font-size:11.5px;color:var(--text-3);">Los cambios que realice serán visibles durante su sesión, pero se restablecerán al recargar la página.</div>
              </div>
            </div>
            <div style="background:rgba(192,66,255,0.05);border:1px solid rgba(192,66,255,0.2);border-radius:10px;padding:13px;display:flex;align-items:flex-start;gap:10px;">
              <i class="ph-fill ph-lock" style="font-size:18px;color:var(--purple);flex-shrink:0;margin-top:1px;"></i>
              <div>
                <div style="font-size:12.5px;font-weight:700;color:#fff;margin-bottom:3px;">Sin conexión a servidores</div>
                <div style="font-size:11.5px;color:var(--text-3);">Ninguna acción envía datos a internet. Todo opera localmente en su navegador.</div>
              </div>
            </div>
          </div>
        `,
        [
          { label: 'Entendido', cls: 'btn-primary', action: closeModal }
        ]
      );
    });

    // Notification bell button
    const notifBtn = document.getElementById('notif-btn');
    if (notifBtn) {
      notifBtn.addEventListener('click', () => {
        if (typeof openNotificationsModal === 'function') openNotificationsModal();
      });
    }

    // Modal close
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('modal-overlay')) closeModal();
    });
    document.getElementById('modal-close').addEventListener('click', closeModal);

    // Confirm close
    document.getElementById('confirm-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('confirm-overlay'))
        document.getElementById('confirm-overlay').classList.remove('active');
    });
    document.getElementById('confirm-close').addEventListener('click', () => {
      document.getElementById('confirm-overlay').classList.remove('active');
    });

    // Topbar date (reloj vivo)
    function updateClock() {
      const now = new Date();
      const el  = document.getElementById('current-date');
      if (el) el.textContent = now.toLocaleDateString('es-PE', { weekday:'short', day:'2-digit', month:'short', year:'numeric' }) +
        '  ' + now.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    }
    updateClock();
    setInterval(updateClock, 1000);

    // Start on estadisticas
    navigate('estadisticas');
  }

  return { init, navigate, getCurrent };
})();

// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  AppDB.init();
  updateSidebarBadges();
  Router.init();
});
