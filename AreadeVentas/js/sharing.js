/* ============================================================
   SHARING — Snapshots, Usuarios con PIN, Compartir por enlace
   ============================================================ */
'use strict';

(function () {

  /* ── Estado de usuarios ─────────────────────────────────────── */
  let users = JSON.parse(localStorage.getItem('vp_users') || 'null');
  if (!users || !users.length) {
    users = [
      { id: 'u_admin', name: 'Área de Ventas', role: 'Administrador', pin: '' },
      { id: 'u_ventas', name: 'Juan Pérez', role: 'Vendedor', pin: '1234' }
    ];
    localStorage.setItem('vp_users', JSON.stringify(users));
  }
  let activeUser = JSON.parse(localStorage.getItem('vp_active_user') || 'null') || users[0];

  function saveUsers() { localStorage.setItem('vp_users', JSON.stringify(users)); }
  function saveActiveUser() { localStorage.setItem('vp_active_user', JSON.stringify(activeUser)); }

  /* ── Modal de gestión de usuarios ───────────────────────────── */
  window.openUsersModal = function () {
    const usersList = users.map(u => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:10px;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(0,212,255,0.15);border:1px solid var(--neon-cyan);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--neon-cyan);">${u.name.charAt(0).toUpperCase()}</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text-1);">${u.name}</div>
            <div style="font-size:11px;color:var(--neon-cyan);font-family:var(--font-mono);">${u.role || 'Usuario'} ${u.pin ? '🔒 PIN' : ''}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          ${activeUser && activeUser.id === u.id
            ? '<span class="badge badge-success" style="align-self:center;">Activo</span>'
            : `<button class="btn btn-primary btn-sm" onclick="switchUser('${u.id}');closeModal();">Cambiar</button>`
          }
          ${(u.role === 'Administrador' || u.id === 'u_admin')
            ? '<span class="badge badge-purple" style="align-self:center;" title="Perfil Principal del Sistema"><i class="ph-fill ph-shield-check"></i> Principal</span>'
            : `<button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}');openUsersModal();" title="Eliminar usuario"><i class="ph ph-trash"></i></button>`
          }
        </div>
      </div>
    `).join('');

    openModal(
      '<i class="ph-fill ph-users-three" style="color:var(--neon-cyan)"></i> Gestión de Usuarios',
      `
        <div style="margin-bottom:16px;">
          <p style="font-size:13px;color:var(--text-2);margin-bottom:12px;">Administra los perfiles de usuario que tienen acceso al dashboard.</p>
          ${usersList}
        </div>
      `,
      [
        { label: '<i class="ph ph-user-plus"></i> Agregar usuario', cls: 'btn-primary', action: openAddUserModal },
        { label: 'Cerrar', cls: 'btn-secondary', action: closeModal }
      ]
    );
  };

  /* ── Actualizar footer con usuario activo ───────────────────── */
  window.updateUserFooter = function () {
    const nameEl  = document.getElementById('footer-name');
    const roleEl  = document.getElementById('footer-role');
    const avEl    = document.getElementById('footer-avatar');
    if (activeUser) {
      if (nameEl) nameEl.textContent = activeUser.name;
      if (roleEl) roleEl.textContent = activeUser.role || 'Usuario';
      if (avEl)   avEl.innerHTML     = `<span style="font-size:14px;font-weight:700;">${activeUser.name.charAt(0).toUpperCase()}</span>`;
    }
  };

  /* ── Render panel de usuarios en integraciones ──────────────── */
  window.renderUsersPanel = function () {
    const el = document.getElementById('users-panel');
    if (!el) return;

    const cards = users.map((u, i) => `
      <div class="user-card">
        <div class="user-avatar-lg">${u.name.charAt(0).toUpperCase()}</div>
        <div class="user-card-name">${u.name}</div>
        <div class="user-card-role">${u.role || 'Usuario'}</div>
        <div style="display:flex;gap:6px;justify-content:center;">
          ${activeUser && activeUser.id === u.id
            ? '<span class="badge badge-success">Activo</span>'
            : `<button class="btn btn-primary btn-sm" onclick="switchUser('${u.id}')">Cambiar</button>`
          }
          ${(u.role === 'Administrador' || u.id === 'u_admin')
            ? ''
            : `<button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')"><i class="ph ph-trash"></i></button>`
          }
        </div>
      </div>
    `).join('');

    el.innerHTML = `
      <div class="users-grid">
        ${cards}
        <div class="user-card user-card-add" onclick="openAddUserModal()">
          <div class="user-avatar-lg" style="background:rgba(0,212,255,0.05);color:var(--text-3)">
            <i class="ph ph-plus" style="font-size:22px;"></i>
          </div>
          <div style="font-size:13px;color:var(--text-3);margin-top:8px;">Agregar usuario</div>
        </div>
      </div>
    `;
  };

  /* ── Agregar usuario ────────────────────────────────────────── */
  window.openAddUserModal = function () {
    openModal(
      '<i class="ph-fill ph-user-plus" style="color:var(--neon-cyan)"></i> Agregar Usuario',
      `
        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Nombre</label>
          <input class="form-input" id="new-user-name" placeholder="Nombre del usuario" />
        </div>
        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Rol</label>
          <select class="form-select" id="new-user-role">
            <option value="Administrador">Administrador</option>
            <option value="Vendedor">Vendedor</option>
            <option value="Contador">Contador</option>
            <option value="Gerente">Gerente</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">PIN (4 dígitos · opcional)</label>
          <input class="form-input" id="new-user-pin" placeholder="0000" maxlength="4" type="password" pattern="[0-9]*" inputmode="numeric" />
          <small style="color:var(--text-3);font-size:11px;font-family:var(--font-mono);">Deja vacío para no requerir PIN</small>
        </div>
      `,
      [
        { label:'Cancelar', cls:'btn-secondary', action:closeModal },
        {
          label:'Crear usuario', cls:'btn-primary', action: () => {
            const name = document.getElementById('new-user-name')?.value.trim();
            const role = document.getElementById('new-user-role')?.value;
            const pin  = document.getElementById('new-user-pin')?.value.trim();
            if (!name) { showToast('Ingresa un nombre', 'warning'); return; }
            if (pin && !/^\d{4}$/.test(pin)) { showToast('El PIN debe tener exactamente 4 dígitos', 'warning'); return; }
            const user = { id: 'u_' + Date.now(), name, role, pin: pin || '' };
            users.push(user);
            saveUsers();
            closeModal();
            showToast(`✅ Usuario "${name}" creado`, 'success');
            renderUsersPanel();
          }
        }
      ]
    );
  };

  /* ── Eliminar usuario (Protegiendo al Administrador) ────────── */
  window.deleteUser = function (id) {
    const user = users.find(u => u.id === id);
    if (user && (user.role === 'Administrador' || user.id === 'u_admin')) {
      showToast('⚠️ El usuario Administrador no se puede eliminar', 'warning');
      return;
    }
    users = users.filter(u => u.id !== id);
    saveUsers();
    if (activeUser && activeUser.id === id) {
      activeUser = users[0] || null;
      saveActiveUser();
      updateUserFooter();
    }
    renderUsersPanel();
    showToast('Usuario eliminado', 'info');
  };

  /* ── Cambiar de usuario (con PIN si aplica) ─────────────────── */
  window.switchUser = function (id) {
    const user = users.find(u => u.id === id);
    if (!user) return;
    if (user.pin) {
      showPinChallenge(user, () => {
        activeUser = user;
        saveActiveUser();
        updateUserFooter();
        renderUsersPanel();
        showToast(`👤 Bienvenido, ${user.name}`, 'success');
      });
    } else {
      activeUser = user;
      saveActiveUser();
      updateUserFooter();
      renderUsersPanel();
      showToast(`👤 Bienvenido, ${user.name}`, 'success');
    }
  };

  /* ── Desafío de PIN inline ───────────────────────────────────── */
  function showPinChallenge(user, onSuccess) {
    let entered = '';
    openModal(
      `<i class="ph-fill ph-lock" style="color:var(--neon-cyan)"></i> PIN de ${user.name}`,
      `
        <div style="text-align:center;">
          <div class="pin-dots" id="modal-pin-dots">
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="pin-pad" style="max-width:200px;margin:0 auto;">
            ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
              <button class="pin-key ${k==='' ? 'btn-secondary' : k==='⌫'?'del':''}"
                onclick="pinKeyPress('${k}', this)">${k}</button>
            `).join('')}
          </div>
        </div>
      `,
      [{ label:'Cancelar', cls:'btn-secondary', action:closeModal }]
    );

    window.pinKeyPress = function(k) {
      if (k === '⌫') { entered = entered.slice(0,-1); }
      else if (k !== '' && entered.length < 4) { entered += k; }
      const dots = document.querySelectorAll('#modal-pin-dots span');
      dots.forEach((d, i) => d.classList.toggle('filled', i < entered.length));
      if (entered.length === 4) {
        setTimeout(() => {
          if (entered === user.pin) {
            closeModal();
            onSuccess();
          } else {
            entered = '';
            dots.forEach(d => d.classList.remove('filled'));
            showToast('PIN incorrecto', 'error');
          }
        }, 200);
      }
    };
  }

  /* ── Snapshot / Compartir ───────────────────────────────────── */

  /* Generar snapshot del estado completo */
  function generateSnapshot() {
    const snapshot = {
      version   : 1,
      timestamp : new Date().toISOString(),
      data      : {
        proformas : AppDB.getAll('proformas'),
        facturas  : AppDB.getAll('facturas'),
        inventario: AppDB.getAll('inventario'),
      }
    };
    return snapshot;
  }

  /* Exportar como archivo .vpdata */
  window.shareExportFile = function () {
    const snap = generateSnapshot();
    const json = JSON.stringify(snap, null, 2);
    const blob = new Blob([json], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `VentasPro_Backup_${new Date().toISOString().slice(0,10)}.vpdata`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Backup exportado como .vpdata', 'success');
  };

  /* Importar desde archivo .vpdata */
  window.shareImportFile = function (file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const snap = JSON.parse(e.target.result);
        if (!snap.data) { showToast('Archivo .vpdata inválido', 'error'); return; }
        ['proformas','facturas','inventario'].forEach(entity => {
          if (Array.isArray(snap.data[entity])) {
            snap.data[entity].forEach(r => AppDB.save(entity, r));
          }
        });
        const ts = snap.timestamp ? new Date(snap.timestamp).toLocaleString('es-PE') : 'Desconocido';
        showToast(`✅ Datos importados (backup del ${ts})`, 'success');
      } catch(err) {
        showToast('Error al leer el backup: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  /* Generar enlace de snapshot (codificado en base64, para redes locales) */
  window.shareGenerateLink = function () {
    const snap = generateSnapshot();
    const b64  = btoa(unescape(encodeURIComponent(JSON.stringify(snap))));
    const base = window.location.origin + window.location.pathname;
    const link = `${base}?snap=${b64.slice(0,200)}`; /* Truncado — solo preview */
    const box  = document.getElementById('share-link-display');
    if (box) {
      box.innerHTML = `
        <div style="margin-bottom:8px;font-size:11px;color:var(--text-3);font-family:var(--font-mono);">ENLACE GENERADO (requiere servidor ngrok activo):</div>
        <div class="share-link-box">${link}</div>
        <div style="margin-top:8px;display:flex;gap:8px;">
          <button class="btn btn-primary btn-sm" onclick="navigator.clipboard.writeText('${link.replace(/'/g,"\\'")}')||showToast('Copiado','success')">
            <i class="ph-fill ph-copy"></i> Copiar
          </button>
          <button class="btn btn-secondary btn-sm" onclick="shareExportFile()">
            <i class="ph-fill ph-file-arrow-down"></i> Exportar .vpdata completo
          </button>
        </div>
      `;
    }
  };

  /* ── Pantalla de login ───────────────────────────────────────── */
  window.showLoginScreen = function () {
    if (!users.length) { document.getElementById('login-screen').style.display = 'none'; return; }
    const ls = document.getElementById('login-screen');
    if (!ls) return;
    ls.style.display = 'flex';

    const profiles = document.getElementById('login-profiles');
    if (profiles) {
      profiles.innerHTML = users.map(u => `
        <button class="profile-btn" onclick="loginSelectUser('${u.id}')">
          <div class="profile-avatar">${u.name.charAt(0).toUpperCase()}</div>
          <div style="text-align:left">
            <div style="font-weight:700;">${u.name}</div>
            <div style="font-size:11px;color:var(--text-3);font-family:var(--font-mono);">${u.role || 'Usuario'}</div>
          </div>
          ${u.pin ? '<i class="ph ph-lock" style="margin-left:auto;color:var(--text-3);"></i>' : ''}
        </button>
      `).join('');
    }
  };

  let pendingLoginUser = null;
  let loginPin = '';

  window.loginSelectUser = function(id) {
    const user = users.find(u => u.id === id);
    if (!user) return;
    if (!user.pin) { completeLogin(user); return; }
    pendingLoginUser = user;
    loginPin = '';
    document.getElementById('login-pin-area').style.display = 'block';
    document.getElementById('login-profiles').style.display = 'none';
    /* Renderizar numpad */
    const pad = document.getElementById('pin-pad');
    if (pad) {
      pad.innerHTML = [1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k =>
        `<button class="pin-key ${k==='⌫'?'del':''}" onclick="loginPinKey('${k}')">${k}</button>`
      ).join('');
    }
  };

  window.loginPinKey = function(k) {
    if (k === '⌫') { loginPin = loginPin.slice(0,-1); }
    else if (k !== '' && loginPin.length < 4) { loginPin += k; }
    const dots = document.querySelectorAll('#pin-dots span');
    dots.forEach((d, i) => d.classList.toggle('filled', i < loginPin.length));
    if (loginPin.length === 4) {
      setTimeout(() => {
        if (loginPin === pendingLoginUser.pin) {
          completeLogin(pendingLoginUser);
        } else {
          loginPin = '';
          dots.forEach(d => d.classList.remove('filled'));
          showToast('PIN incorrecto', 'error');
        }
      }, 200);
    }
  };

  window.cancelLogin = function() {
    loginPin = '';
    pendingLoginUser = null;
    document.getElementById('login-pin-area').style.display = 'none';
    document.getElementById('login-profiles').style.display = 'flex';
    document.querySelectorAll('#pin-dots span').forEach(d => d.classList.remove('filled'));
  };

  function completeLogin(user) {
    activeUser = user;
    saveActiveUser();
    const ls = document.getElementById('login-screen');
    if (ls) ls.style.display = 'none';
    updateUserFooter();
    showToast(`👤 Bienvenido, ${user.name}`, 'success');
  }

  /* ── Gestionar usuarios desde el footer ─────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('manage-users-btn');
    if (btn) btn.addEventListener('click', () => navigate('integraciones'));
    updateUserFooter();
    /* Mostrar login si hay usuarios y no hay sesión activa */
    if (users.length && !activeUser) {
      setTimeout(showLoginScreen, 300);
    }
  });

})();
