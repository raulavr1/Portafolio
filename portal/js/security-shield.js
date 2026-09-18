/**
 * ═══════════════════════════════════════════════════════════════════
 * SECURITY SHIELD & INTEGRITY DEFENSE SYSTEM (v4.2 PRO)
 * Protocolo de Seguridad Operativa & Protección Anti-Ingeniería Inversa
 * ═══════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const CONFIG = Object.freeze({
    debugThresholdMs: 120,
    checkIntervalMs: 1000,
    enableOverlay: true,
    warningTitle: '🛡️ PROTOCOLO DE SEGURIDAD ACTIVO',
    warningMsg: 'Este panel de inteligencia opera bajo estricto cifrado de presentación. El uso de inspectores de código, depuradores y herramientas de ingeniería inversa está inhabilitado.'
  });

  let devToolsDetected = false;
  let overlayEl = null;

  // ─── 1. BLOQUEO DE MENÚ CONTEXTUAL (CLIC DERECHO) ───
  document.addEventListener('contextmenu', function (e) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    e.stopPropagation();
    showToastSecurity('Menú contextual desactivado por protocolo de seguridad.');
    return false;
  }, { capture: true });

  // ─── 2. BLOQUEO DE ATAJOS DE TECLADO DEVTOOLS & SOURCE ───
  window.addEventListener('keydown', function (e) {
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const key = e.key ? e.key.toUpperCase() : '';
    const code = e.keyCode || e.which;

    // F12
    if (code === 123 || key === 'F12') {
      preventTrigger(e, 'F12');
      return;
    }

    // Ctrl + Shift + I (Inspect)
    if (isCtrlOrMeta && isShift && (key === 'I' || code === 73)) {
      preventTrigger(e, 'Ctrl+Shift+I');
      return;
    }

    // Ctrl + Shift + J (Console)
    if (isCtrlOrMeta && isShift && (key === 'J' || code === 74)) {
      preventTrigger(e, 'Ctrl+Shift+J');
      return;
    }

    // Ctrl + Shift + C (Element Picker)
    if (isCtrlOrMeta && isShift && (key === 'C' || code === 67)) {
      preventTrigger(e, 'Ctrl+Shift+C');
      return;
    }

    // Ctrl + U (View Source)
    if (isCtrlOrMeta && (key === 'U' || code === 85)) {
      preventTrigger(e, 'Ctrl+U');
      return;
    }

    // Ctrl + S (Save Page)
    if (isCtrlOrMeta && (key === 'S' || code === 83)) {
      preventTrigger(e, 'Ctrl+S');
      return;
    }
  }, { capture: true });

  function preventTrigger(e, shortcutName) {
    e.preventDefault();
    e.stopPropagation();
    showToastSecurity('Atajo ' + shortcutName + ' restringido por política de protección.');
  }

  // ─── 3. SANITIZACIÓN DE CONSOLA & ADVERTENCIA FORENSE ───
  function printForensicNotice() {
    try {
      console.clear();
      console.log(
        '%c' + CONFIG.warningTitle,
        'color:#ef4444; font-size:18px; font-weight:900; background:#0f172a; padding:6px 14px; border-radius:6px;'
      );
      console.log(
        '%c' + CONFIG.warningMsg,
        'color:#f59e0b; font-size:12px; font-weight:700; line-height:1.5;'
      );
    } catch (_) {}
  }

  const noop = function () {};
  try {
    console.debug = noop;
    console.info = noop;
  } catch (_) {}

  // ─── 4. DETECCIÓN ACTIVA DE DEVTOOLS ───
  function checkDevTools() {
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    const isOpenGeometric = widthDiff > 160 || heightDiff > 160;

    let isOpenDebugger = false;
    const t0 = performance.now();
    try {
      (function () {}.constructor('debugger')());
    } catch (_) {}
    const t1 = performance.now();
    if (t1 - t0 > CONFIG.debugThresholdMs) {
      isOpenDebugger = true;
    }

    if (isOpenGeometric || isOpenDebugger) {
      if (!devToolsDetected) {
        devToolsDetected = true;
        onDevToolsDetected();
      }
    } else {
      if (devToolsDetected) {
        devToolsDetected = false;
        onDevToolsClosed();
      }
    }
  }

  function onDevToolsDetected() {
    printForensicNotice();
    if (CONFIG.enableOverlay) {
      showSecurityOverlay();
    }
  }

  function onDevToolsClosed() {
    hideSecurityOverlay();
  }

  // ─── 5. OVERLAY VISUAL DE PROTECCIÓN ───
  function showSecurityOverlay() {
    if (overlayEl) return;
    overlayEl = document.createElement('div');
    overlayEl.id = 'sec-shield-overlay';
    overlayEl.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;
      text-align: center;
      box-sizing: border-box;
    `;

    overlayEl.innerHTML = `
      <div style="max-width:480px; background:#1e293b; border:1.5px solid rgba(239,68,68,0.5); border-radius:18px; padding:32px 28px; box-shadow:0 24px 60px rgba(0,0,0,0.5);">
        <div style="width:64px; height:64px; border-radius:50%; background:rgba(239,68,68,0.15); border:1.5px solid #ef4444; display:flex; align-items:center; justify-content:center; margin:0 auto 18px; font-size:30px;">
          🛡️
        </div>
        <h2 style="font-size:18px; font-weight:800; color:#ffffff; margin:0 0 10px;">
          Inspección de Código Inhabilitada
        </h2>
        <p style="font-size:13px; color:#94a3b8; line-height:1.55; margin:0 0 20px;">
          Este entorno corporativo cuenta con protección activa contra ingeniería inversa y análisis de memoria. Por favor, <strong>cierre las herramientas de desarrollador</strong> para reanudar la visualización normal.
        </p>
        <button id="btnDismissSec" style="background:#ef4444; color:#ffffff; border:none; padding:10px 22px; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer;">
          Entendido
        </button>
      </div>
    `;

    document.body.appendChild(overlayEl);

    const btn = document.getElementById('btnDismissSec');
    if (btn) {
      btn.addEventListener('click', function () {
        hideSecurityOverlay();
      });
    }
  }

  function hideSecurityOverlay() {
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl);
      overlayEl = null;
    }
  }

  // ─── 6. TOAST NOTIFICACIÓN SUTIL ───
  let toastTimeout = null;
  function showToastSecurity(msg) {
    let toast = document.getElementById('sec-shield-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'sec-shield-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.95);
        color: #f8fafc;
        border: 1px solid rgba(239, 68, 68, 0.4);
        padding: 9px 18px;
        border-radius: 30px;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        z-index: 2147483646;
        pointer-events: none;
        transition: all 0.25s ease;
        opacity: 0;
        white-space: nowrap;
      `;
      document.body.appendChild(toast);
    }
    toast.innerHTML = `🛡️ <span>${msg}</span>`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      if (toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(10px)';
      }
    }, 2400);
  }

  // ─── 7. PURGA AUTOMÁTICA DE DATOS TEMPORALES Y PRIVACIDAD ───
  function purgeEphemeralData() {
    try {
      sessionStorage.clear();
      // Limpiar cualquier residuo de formulario
      const forms = document.querySelectorAll('form');
      forms.forEach(f => {
        try { f.reset(); } catch (_) {}
      });
    } catch (_) {}
  }

  // Purgar al cargar y antes de salir
  purgeEphemeralData();
  window.addEventListener('beforeunload', purgeEphemeralData);
  window.addEventListener('pagehide', purgeEphemeralData);

  setInterval(checkDevTools, CONFIG.checkIntervalMs);
  printForensicNotice();
})();
