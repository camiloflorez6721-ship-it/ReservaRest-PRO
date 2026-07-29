/**
 * Controlador Principal
 */
document.addEventListener('DOMContentLoaded', () => {
    let dbData = null;
    let cart = [];
    let activeView = 'cliente';
  
    const mainContent = document.getElementById('main-content');
    const sidebar = document.getElementById('sidebar');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    const sessionInfo = document.getElementById('session-info');
    const loginForm = document.getElementById('login-form');
    const btnLogout = document.getElementById('btn-logout');
    const passwordInput = document.getElementById('login-password');
    const passwordToggle = document.getElementById('btn-toggle-password');
    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
    let inactivityTimer = null;

    function setFieldError(inputId, errorId, message) {
      const input = document.getElementById(inputId);
      const error = document.getElementById(errorId);
      if (input) {
        input.classList.toggle('input-invalid', Boolean(message));
      }
      if (error) {
        error.textContent = message || '';
        error.classList.toggle('show', Boolean(message));
      }
    }

    function clearFieldError(inputId, errorId) {
      setFieldError(inputId, errorId, '');
    }

    function validateLoginForm() {
      let valid = true;
      const username = document.getElementById('login-username').value.trim();
      const password = passwordInput.value.trim();

      if (username.length < 3) {
        setFieldError('login-username', 'login-username-error', 'Ingresa un usuario válido.');
        valid = false;
      } else {
        clearFieldError('login-username', 'login-username-error');
      }

      if (password.length < 4) {
        setFieldError('login-password', 'login-password-error', 'La contraseña debe tener al menos 4 caracteres.');
        valid = false;
      } else {
        clearFieldError('login-password', 'login-password-error');
      }

      return valid;
    }

    function validateReservaFormUI() {
      let valid = true;
      const nombre = document.getElementById('reserva-nombre').value.trim();
      const telefono = document.getElementById('reserva-telefono').value.trim();
      const personas = document.getElementById('reserva-personas').value.trim();
      const mesa = document.getElementById('reserva-mesa').value;
      const fecha = document.getElementById('reserva-fecha').value;

      const nombreValido = /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(nombre);
      if (!nombre || !nombreValido) {
        setFieldError('reserva-nombre', 'reserva-nombre-error', 'Ingresa un nombre válido, solo letras y espacios.');
        valid = false;
      } else {
        clearFieldError('reserva-nombre', 'reserva-nombre-error');
      }

      if (!/^[0-9+\s()-]{7,15}$/.test(telefono)) {
        setFieldError('reserva-telefono', 'reserva-telefono-error', 'Ingresa un teléfono válido de 7 a 15 dígitos.');
        valid = false;
      } else {
        clearFieldError('reserva-telefono', 'reserva-telefono-error');
      }

      const personasNum = parseInt(personas, 10);
      if (!personas || personasNum < 1 || personasNum > 20) {
        setFieldError('reserva-personas', 'reserva-personas-error', 'El número de personas debe estar entre 1 y 20.');
        valid = false;
      } else {
        clearFieldError('reserva-personas', 'reserva-personas-error');
      }

      if (!mesa) {
        setFieldError('reserva-mesa', 'reserva-mesa-error', 'Selecciona una mesa disponible.');
        valid = false;
      } else {
        clearFieldError('reserva-mesa', 'reserva-mesa-error');
      }

      if (!fecha) {
        setFieldError('reserva-fecha', 'reserva-fecha-error', 'Selecciona una fecha y hora válidas.');
        valid = false;
      } else {
        const fechaReserva = new Date(fecha);
        if (fechaReserva <= new Date()) {
          setFieldError('reserva-fecha', 'reserva-fecha-error', 'La reserva debe ser en una fecha futura.');
          valid = false;
        } else {
          clearFieldError('reserva-fecha', 'reserva-fecha-error');
        }
      }

      return valid;
    }

    function validatePlatoFormUI() {
      let valid = true;
      const nombre = document.getElementById('admin-plato-nombre').value.trim();
      const precio = document.getElementById('admin-plato-precio').value.trim();
      const desc = document.getElementById('admin-plato-desc').value.trim();

      if (nombre.length < 3) {
        setFieldError('admin-plato-nombre', 'admin-plato-nombre-error', 'El nombre del plato debe tener al menos 3 caracteres.');
        valid = false;
      } else {
        clearFieldError('admin-plato-nombre', 'admin-plato-nombre-error');
      }

      if (!precio || parseFloat(precio) <= 0) {
        setFieldError('admin-plato-precio', 'admin-plato-precio-error', 'Ingresa un precio mayor a cero.');
        valid = false;
      } else {
        clearFieldError('admin-plato-precio', 'admin-plato-precio-error');
      }

      if (desc.length < 5) {
        setFieldError('admin-plato-desc', 'admin-plato-desc-error', 'Agrega una descripción más detallada.');
        valid = false;
      } else {
        clearFieldError('admin-plato-desc', 'admin-plato-desc-error');
      }

      return valid;
    }

    function generarCodigoEntrega() {
      const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let codigo = '';
      do {
        codigo = Array.from({ length: 5 }, () => caracteres[Math.floor(Math.random() * caracteres.length)]).join('');
      } while (dbData?.pedidos?.some(p => p.codigoEntrega === codigo));
      return codigo;
    }

    function validateDatosEntregaUI(tipoPedido) {
      let valid = true;
      const nombreInput = document.getElementById('cliente-nombre-recoger');
      const telefonoInput = document.getElementById('cliente-telefono-recoger');
      const direccionInput = document.getElementById('cliente-direccion-entrega');

      if (tipoPedido === 'local') {
        clearFieldError('cliente-nombre-recoger', 'cliente-nombre-recoger-error');
        clearFieldError('cliente-telefono-recoger', 'cliente-telefono-recoger-error');
        clearFieldError('cliente-direccion-entrega', 'cliente-direccion-entrega-error');
        return true;
      }

      const nombre = nombreInput?.value.trim() || '';
      const telefono = telefonoInput?.value.trim() || '';
      const direccion = direccionInput?.value.trim() || '';

      const nombreValido = /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]{3,80}$/.test(nombre);
      if (!nombreValido) {
        setFieldError('cliente-nombre-recoger', 'cliente-nombre-recoger-error', 'Ingresa un nombre válido, solo letras y espacios.');
        valid = false;
      } else {
        clearFieldError('cliente-nombre-recoger', 'cliente-nombre-recoger-error');
      }

      if (!/^[0-9+\s()-]{7,15}$/.test(telefono)) {
        setFieldError('cliente-telefono-recoger', 'cliente-telefono-recoger-error', 'Ingresa un teléfono válido de 7 a 15 dígitos.');
        valid = false;
      } else {
        clearFieldError('cliente-telefono-recoger', 'cliente-telefono-recoger-error');
      }

      if (tipoPedido === 'domicilio') {
        if (!direccion || direccion.length < 5) {
          setFieldError('cliente-direccion-entrega', 'cliente-direccion-entrega-error', 'La dirección es obligatoria para domicilio.');
          valid = false;
        } else {
          clearFieldError('cliente-direccion-entrega', 'cliente-direccion-entrega-error');
        }
      } else {
        clearFieldError('cliente-direccion-entrega', 'cliente-direccion-entrega-error');
      }

      return valid;
    }
  
    async function refreshDB(forceReload = false) {
      if (forceReload || !dbData) {
        dbData = await StorageModule.initDB();
      }
      if (ReservasModule.normalizarEstados(dbData)) {
        await StorageModule.saveDB(dbData);
      }
      return dbData;
    }

    async function init() {
      await refreshDB(true);
      const session = await AuthModule.restoreSession();
  
      if (session) {
        showApp(session);
      } else {
        showLogin();
      }
    }
  
    function showLogin() {
      appScreen.classList.add('hidden');
      sessionInfo.classList.add('hidden');
      loginScreen.classList.remove('hidden');
      sidebar.classList.remove('open');
      document.body.classList.remove('menu-open');
    }
  
    function showApp(session) {
      loginScreen.classList.add('hidden');
      sessionInfo.classList.remove('hidden');
      appScreen.classList.remove('hidden');
  
      document.getElementById('user-display-name').textContent = session.name;
      document.getElementById('user-role-badge').textContent = session.role;
  
      document.querySelectorAll('.nav-btn').forEach(btn => {
        const view = btn.getAttribute('data-view');
        btn.style.display = AuthModule.hasPermission(view) ? 'block' : 'none';
      });
  
      const firstVisibleBtn = document.querySelector('.nav-btn[style="display: block;"]');
      if (firstVisibleBtn) firstVisibleBtn.click();
    }
  
    function closeMobileMenu() {
      sidebar.classList.remove('open');
      document.body.classList.remove('menu-open');
      if (mobileMenuToggle) {
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
      }
    }

    function resetInactivityTimer() {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }

      inactivityTimer = setTimeout(() => {
        if (AuthModule.getUserSession()) {
          AuthModule.logout();
          showLogin();
          alert('Tu sesión ha expirado por inactividad. Inicia sesión nuevamente.');
        }
      }, INACTIVITY_TIMEOUT_MS);
    }

    function setupInactivityTracker() {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      events.forEach((eventName) => {
        document.addEventListener(eventName, resetInactivityTimer, { passive: true });
      });
      resetInactivityTimer();
    }

    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('open');
        document.body.classList.toggle('menu-open', isOpen);
        mobileMenuToggle.setAttribute('aria-expanded', String(isOpen));
      });
    }

    sidebar.addEventListener('click', async (e) => {
      if (e.target.classList.contains('nav-btn')) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const view = e.target.getAttribute('data-view');
        await navigateTo(view);
        closeMobileMenu();
      }
    });
  
    async function navigateTo(view) {
      activeView = view;
      await refreshDB();
      closeMobileMenu();

      if (view === 'cliente') {
        mainContent.innerHTML = UIModules.renderCliente(dbData);
        bindClientEvents();
      } else if (view === 'cocina') {
        mainContent.innerHTML = UIModules.renderCocina(dbData);
        bindCocinaEvents();
      } else if (view === 'mesero') {
        mainContent.innerHTML = UIModules.renderMesero(dbData);
        bindMeseroEvents();
      } else if (view === 'panel') {
        mainContent.innerHTML = UIModules.renderAdmin(dbData);
        bindAdminEvents();
      } else if (view === 'mesas') {
        mainContent.innerHTML = UIModules.renderMesas(dbData);
      } else if (view === 'usuarios') {
        mainContent.innerHTML = UIModules.renderUsuarios();
        document.getElementById('btn-reset-demo').addEventListener('click', async () => {
          if (confirm('¿Deseas reiniciar la base de datos a sus valores iniciales?')) {
            dbData = await StorageModule.initDB(true);
            alert('Sistema restablecido correctamente.');
            location.reload();
          }
        });
      }
    }

    async function persistAndReload(view) {
      await StorageModule.saveDB(dbData);
      await navigateTo(view);
    }

    function validarCapacidad(selectEl, inputEl) {
      if (!selectEl || !inputEl || !selectEl.selectedOptions.length) return;
      const selectedOption = selectEl.selectedOptions[0];
      const capacidadMax = parseInt(selectedOption.getAttribute('data-capacidad'), 10) || 4;
      const numPersonas = parseInt(inputEl.value, 10) || 1;

      if (numPersonas > capacidadMax) {
        alert(`⚠️ La mesa seleccionada solo tiene capacidad para ${capacidadMax} personas.`);
        inputEl.value = capacidadMax;
      }
    }

    function actualizarMesasReserva() {
      const fechaInput = document.getElementById('reserva-fecha');
      const personasInput = document.getElementById('reserva-personas');
      const selectMesa = document.getElementById('reserva-mesa');
      const hint = document.getElementById('reserva-mesas-hint');
      if (!fechaInput || !personasInput || !selectMesa) return;

      const fecha = fechaInput.value;
      const personas = personasInput.value;
      const previa = selectMesa.value;

      if (!fecha) {
        selectMesa.innerHTML = '<option value="">— Elige fecha y personas primero —</option>';
        if (hint) hint.textContent = 'Selecciona fecha y número de personas para ver mesas disponibles.';
        return;
      }

      const disponibles = ReservasModule.getMesasDisponibles(dbData, fecha, personas);

      if (disponibles.length === 0) {
        selectMesa.innerHTML = '<option value="">— Sin mesas disponibles —</option>';
        if (hint) hint.textContent = 'No hay mesas libres para ese horario y número de personas.';
        return;
      }

      selectMesa.innerHTML = disponibles.map(m =>
        `<option value="${m.id}" data-capacidad="${m.capacidad}">Mesa #${m.numero} (máx. ${m.capacidad} pers.)</option>`
      ).join('');

      if (previa && disponibles.some(m => String(m.id) === previa)) {
        selectMesa.value = previa;
      }

      if (hint) {
        hint.textContent = `${disponibles.length} mesa(s) disponible(s) para el horario seleccionado.`;
      }
    }

    function enviarSmsReserva(reserva) {
      return { ok: false, mensaje: 'El envío real de SMS requiere un servicio externo.' };
    }

    async function checkInReserva(reservaId, currentView) {
      const reserva = dbData.reservas.find(r => r.id === reservaId);
      if (!reserva) return;

      const estado = ReservasModule.getEstadoEfectivo(reserva);
      if (estado !== 'programada') {
        alert('Esta reserva ya no está activa.');
        navigateTo(currentView);
        return;
      }

      reserva.estado = 'llegado';
      reserva.codigoValidado = false;
      const mesa = dbData.mesas.find(m => m.id === parseInt(reserva.mesaId, 10));
      if (mesa) mesa.estado = 'ocupada';

      enviarSmsReserva(reserva);
      await persistAndReload(currentView);

      alert(`🎉 ¡Llegada confirmada! Mesa #${reserva.mesaId} marcada como OCUPADA.\n\nEl cliente debe ingresar su código (${reserva.codigo}) en el menú para pedir.`);
    }

    async function cancelarReserva(reservaId, currentView) {
      const reserva = dbData.reservas.find(r => r.id === reservaId);
      if (!reserva) return;

      if (!confirm(`¿Cancelar la reserva de ${reserva.nombre} para la Mesa #${reserva.mesaId}?`)) return;

      reserva.estado = 'cancelada';
      await persistAndReload(currentView);
      alert('Reserva cancelada correctamente.');
    }

    function mostrarModalCodigoReserva(codigo, nombre, mesaId, fecha) {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-codigo">
          <h2>✅ ¡Reserva Confirmada!</h2>
          <p style="margin:12px 0; color:#555;">Hola <strong>${StorageModule.sanitize(nombre)}</strong>, guarda este código:</p>
          <div class="codigo-display">${StorageModule.sanitize(codigo)}</div>
          <p style="font-size:0.9rem; color:#666;">
            Mesa #${mesaId} · ${ReservasModule.formatFecha(fecha)}
          </p>
          <p style="font-size:0.85rem; color:#888; margin:16px 0;">
            Cuando llegues al restaurante, el mesero confirmará tu llegada. Luego selecciona tu mesa e ingresa este código para acceder al menú.
          </p>
          <button id="btn-cerrar-modal-codigo" class="btn btn-primary btn-block">Entendido</button>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.querySelector('#btn-cerrar-modal-codigo').addEventListener('click', () => overlay.remove());
    }

    function evaluarAccesoMesa(mesaId) {
      const panelCodigo = document.getElementById('panel-validacion-codigo');
      const panelBloqueada = document.getElementById('panel-mesa-bloqueada');
      const panelMenu = document.getElementById('panel-menu-pedido');
      const bannerAutorizado = document.getElementById('acceso-autorizado-banner');
      const mesaNumeroEl = document.getElementById('codigo-mesa-numero');
      const errorCodigo = document.getElementById('codigo-error-msg');

      if (!panelCodigo || !panelMenu) return;

      panelCodigo.classList.add('hidden');
      panelBloqueada?.classList.add('hidden');
      panelMenu.classList.add('hidden');
      bannerAutorizado?.classList.add('hidden');
      if (errorCodigo) {
        errorCodigo.classList.add('hidden');
        errorCodigo.textContent = '';
      }

      const acceso = ReservasModule.evaluarAccesoMesa(dbData, mesaId);

      if (acceso.tipo === 'libre') {
        panelMenu.classList.remove('hidden');
        return;
      }

      if (acceso.tipo === 'codigo_requerido') {
        panelCodigo.classList.remove('hidden');
        if (mesaNumeroEl && acceso.mesa) mesaNumeroEl.textContent = acceso.mesa.numero;
        return;
      }

      if (acceso.tipo === 'autorizado') {
        panelMenu.classList.remove('hidden');
        bannerAutorizado?.classList.remove('hidden');
        return;
      }

      panelBloqueada?.classList.remove('hidden');
    }

    function mesaPermitePedido(mesaId) {
      const acceso = ReservasModule.evaluarAccesoMesa(dbData, mesaId);
      return acceso.tipo === 'libre' || acceso.tipo === 'autorizado';
    }

    function setupGlobalActions() {
      mainContent.addEventListener('click', (e) => {
        const checkInBtn = e.target.closest('.btn-checkin-reserva');
        if (checkInBtn) {
          checkInReserva(checkInBtn.getAttribute('data-id'), activeView);
          return;
        }
        const cancelBtn = e.target.closest('.btn-cancel-reserva');
        if (cancelBtn) {
          cancelarReserva(cancelBtn.getAttribute('data-id'), activeView);
        }
      });
    }
  
    // EVENTOS CLIENTE
    function bindClientEvents() {
      const tabOrden = document.getElementById('tab-btn-ordenar');
      const tabReserva = document.getElementById('tab-btn-reservar');
      const secOrden = document.getElementById('section-ordenar');
      const secReserva = document.getElementById('section-reserva');
  
      const selectMesaOrden = document.getElementById('cliente-mesa-id');
      const inputPersonasOrden = document.getElementById('cliente-num-personas');
      const selectTipoPedido = document.getElementById('tipo-pedido');
      const clienteMesaWrapper = document.getElementById('cliente-mesa-wrapper');
      const clientePersonasWrapper = document.getElementById('cliente-personas-wrapper');
      const pedidoTipoInfo = document.getElementById('pedido-tipo-info');
      const datosEntregaWrapper = document.getElementById('datos-entrega-wrapper');
      const clienteDireccionWrapper = document.getElementById('cliente-direccion-wrapper');
      const inputNombreRecoger = document.getElementById('cliente-nombre-recoger');
      const inputTelefonoRecoger = document.getElementById('cliente-telefono-recoger');
      const inputDireccionEntrega = document.getElementById('cliente-direccion-entrega');
  
      const selectMesaReserva = document.getElementById('reserva-mesa');
      const inputPersonasReserva = document.getElementById('reserva-personas');
      const inputFechaReserva = document.getElementById('reserva-fecha');
      const inputNombreReserva = document.getElementById('reserva-nombre');
      const inputTelefonoReserva = document.getElementById('reserva-telefono');

      if (selectTipoPedido) {
        const actualizarTipoPedido = () => {
          const tipo = selectTipoPedido.value;
          const esLocal = tipo === 'local';
          const esDomicilio = tipo === 'domicilio';
          const esLlevar = tipo === 'llevar';
          const panelMenu = document.getElementById('panel-menu-pedido');
          const panelCodigo = document.getElementById('panel-validacion-codigo');
          const bannerAutorizado = document.getElementById('acceso-autorizado-banner');
          const errorCodigo = document.getElementById('codigo-error-msg');

          if (clienteMesaWrapper) clienteMesaWrapper.classList.toggle('hidden', !esLocal);
          if (clientePersonasWrapper) clientePersonasWrapper.classList.toggle('hidden', !esLocal);
          if (datosEntregaWrapper) datosEntregaWrapper.classList.toggle('hidden', esLocal);
          if (clienteDireccionWrapper) clienteDireccionWrapper.classList.toggle('hidden', !esDomicilio);
          if (pedidoTipoInfo) {
            if (esLlevar) {
              pedidoTipoInfo.textContent = '📦 Tu pedido será preparado para recoger en el restaurante. El mesero lo atenderá cuando llegues al local.';
              pedidoTipoInfo.classList.remove('hidden');
            } else if (esDomicilio) {
              pedidoTipoInfo.textContent = '🚚 Tu pedido será preparado para entregar a domicilio. El mesero confirmará el código cuando llegue el domiciliario.';
              pedidoTipoInfo.classList.remove('hidden');
            } else {
              pedidoTipoInfo.classList.add('hidden');
            }
          }

          if (!esLocal) {
            if (selectMesaOrden) selectMesaOrden.value = '';
            if (inputPersonasOrden) inputPersonasOrden.value = '1';
            if (selectMesaOrden) {
              validarCapacidad(selectMesaOrden, inputPersonasOrden);
            }
            panelMenu?.classList.remove('hidden');
            panelCodigo?.classList.add('hidden');
            bannerAutorizado?.classList.add('hidden');
            if (errorCodigo) {
              errorCodigo.classList.add('hidden');
              errorCodigo.textContent = '';
            }
          } else {
            evaluarAccesoMesa(parseInt(selectMesaOrden?.value || '0', 10));
          }
        };

        selectTipoPedido.addEventListener('change', actualizarTipoPedido);
        actualizarTipoPedido();
      }

      if (selectMesaOrden && inputPersonasOrden) {
        selectMesaOrden.addEventListener('change', () => {
          validarCapacidad(selectMesaOrden, inputPersonasOrden);
          evaluarAccesoMesa(parseInt(selectMesaOrden.value, 10));
        });
        inputPersonasOrden.addEventListener('input', () => validarCapacidad(selectMesaOrden, inputPersonasOrden));
        evaluarAccesoMesa(parseInt(selectMesaOrden.value, 10));
      }

      if (inputFechaReserva) {
        inputFechaReserva.addEventListener('change', actualizarMesasReserva);
        inputFechaReserva.addEventListener('input', () => clearFieldError('reserva-fecha', 'reserva-fecha-error'));
      }
      if (inputPersonasReserva) {
        inputPersonasReserva.addEventListener('input', () => {
          clearFieldError('reserva-personas', 'reserva-personas-error');
          actualizarMesasReserva();
          validarCapacidad(selectMesaReserva, inputPersonasReserva);
        });
      }
      if (selectMesaReserva) {
        selectMesaReserva.addEventListener('change', () => {
          clearFieldError('reserva-mesa', 'reserva-mesa-error');
          validarCapacidad(selectMesaReserva, inputPersonasReserva);
        });
      }
      if (inputNombreReserva) {
        inputNombreReserva.addEventListener('input', () => clearFieldError('reserva-nombre', 'reserva-nombre-error'));
      }
      if (inputTelefonoReserva) {
        inputTelefonoReserva.addEventListener('input', () => {
          const sanitized = inputTelefonoReserva.value.replace(/[^0-9+\s()-]/g, '');
          if (inputTelefonoReserva.value !== sanitized) {
            inputTelefonoReserva.value = sanitized;
          }
          clearFieldError('reserva-telefono', 'reserva-telefono-error');
        });
      }
      if (inputNombreRecoger) {
        inputNombreRecoger.addEventListener('input', () => {
          const sanitized = inputNombreRecoger.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, '');
          if (inputNombreRecoger.value !== sanitized) {
            inputNombreRecoger.value = sanitized;
          }
          clearFieldError('cliente-nombre-recoger', 'cliente-nombre-recoger-error');
        });
      }
      if (inputTelefonoRecoger) {
        inputTelefonoRecoger.addEventListener('input', () => {
          const sanitized = inputTelefonoRecoger.value.replace(/[^0-9+\s()-]/g, '');
          if (inputTelefonoRecoger.value !== sanitized) {
            inputTelefonoRecoger.value = sanitized;
          }
          clearFieldError('cliente-telefono-recoger', 'cliente-telefono-recoger-error');
        });
      }
      if (inputDireccionEntrega) {
        inputDireccionEntrega.addEventListener('input', () => clearFieldError('cliente-direccion-entrega', 'cliente-direccion-entrega-error'));
      }
  
      tabOrden.addEventListener('click', () => {
        secOrden.classList.remove('hidden');
        secReserva.classList.add('hidden');
        if (selectMesaOrden) {
          evaluarAccesoMesa(parseInt(selectMesaOrden.value, 10));
        }
      });
  
      tabReserva.addEventListener('click', () => {
        secReserva.classList.remove('hidden');
        secOrden.classList.add('hidden');
        actualizarMesasReserva();
      });
  
      document.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.getAttribute('data-id');
          const nombre = e.target.getAttribute('data-nombre');
          const precio = parseFloat(e.target.getAttribute('data-precio'));
  
          const exist = cart.find(i => i.id === id);
          if (exist) exist.cantidad++;
          else cart.push({ id, nombre, precio, cantidad: 1 });
  
          updateCartUI();
        });
      });
  
      document.getElementById('btn-enviar-pedido-cocina').addEventListener('click', async () => {
        const tipoPedido = selectTipoPedido ? selectTipoPedido.value : 'local';
        const personas = parseInt(inputPersonasOrden.value, 10) || 1;

        if (tipoPedido === 'local') {
          const mesaId = parseInt(selectMesaOrden.value, 10);
          if (!mesaId || Number.isNaN(mesaId)) {
            alert('Selecciona una mesa para consumir en el local.');
            return;
          }
          if (!mesaPermitePedido(mesaId)) {
            alert('⚠️ Debes validar tu código de reserva antes de enviar un pedido.');
            return;
          }
        }

        if (!validateDatosEntregaUI(tipoPedido)) {
          alert('Completa los datos del cliente antes de enviar este pedido.');
          return;
        }

        if (cart.length === 0) {
          alert('Agrega al menos un plato a tu pedido.');
          return;
        }

        const total = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
        const codigoEntrega = tipoPedido === 'llevar' ? generarCodigoEntrega() : '';
        const nombreCliente = document.getElementById('cliente-nombre-recoger')?.value.trim() || '';
        const telefonoCliente = document.getElementById('cliente-telefono-recoger')?.value.trim() || '';
        const direccionEntrega = document.getElementById('cliente-direccion-entrega')?.value.trim() || '';

        const nuevoPedido = {
          id: 'p_' + Date.now(),
          mesaId: tipoPedido === 'local' ? parseInt(selectMesaOrden.value, 10) : 0,
          personas,
          tipo: tipoPedido,
          items: [...cart],
          total,
          estado: 'pendiente',
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          codigoEntrega,
          nombreCliente,
          telefonoCliente,
          direccionEntrega,
          codigoConfirmado: false
        };
  
        dbData.pedidos.push(nuevoPedido);

        if (tipoPedido === 'local') {
          const mesa = dbData.mesas.find(m => m.id === nuevoPedido.mesaId);
          if (mesa && mesa.estado === 'disponible') mesa.estado = 'ocupada';
        }

        cart = [];
        await persistAndReload('cliente');
        const mensajePedido = tipoPedido === 'domicilio'
          ? '🚚 ¡Pedido a domicilio enviado! El mesero lo marcará como entregado cuando llegue.'
          : tipoPedido === 'llevar'
            ? `🛍️ ¡Pedido para llevar enviado! Código de recogida: ${codigoEntrega}`
            : `🚀 ¡Pedido para la Mesa #${nuevoPedido.mesaId} enviado a la cocina!`;
        alert(mensajePedido);
      });

      const formValidarCodigo = document.getElementById('form-validar-codigo');
      if (formValidarCodigo) {
        formValidarCodigo.addEventListener('submit', async (e) => {
          e.preventDefault();
          const mesaId = parseInt(selectMesaOrden.value, 10);
          const codigo = document.getElementById('input-codigo-reserva').value;
          const errorEl = document.getElementById('codigo-error-msg');

          const resultado = ReservasModule.validarCodigoAcceso(dbData, mesaId, codigo);
          if (!resultado.ok) {
            if (errorEl) {
              errorEl.textContent = resultado.error;
              errorEl.classList.remove('hidden');
            }
            return;
          }

          resultado.reserva.codigoValidado = true;
          await StorageModule.saveDB(dbData);
          document.getElementById('input-codigo-reserva').value = '';
          evaluarAccesoMesa(mesaId);
        });
      }

      const formReserva = document.getElementById('form-reserva-cliente');
      if (formReserva) {
        formReserva.addEventListener('submit', async (e) => {
          e.preventDefault();

          const datos = {
            mesaId: parseInt(document.getElementById('reserva-mesa').value, 10),
            nombre: document.getElementById('reserva-nombre').value.trim(),
            telefono: document.getElementById('reserva-telefono').value.trim(),
            fecha: document.getElementById('reserva-fecha').value,
            personas: document.getElementById('reserva-personas').value
          };

          const validacion = ReservasModule.validarNuevaReserva(dbData, datos);
          if (!validacion.ok) {
            alert(`⚠️ ${validacion.error}`);
            return;
          }

          const codigo = ReservasModule.generarCodigoReserva(dbData);

          dbData.reservas.push({
            id: 'res_' + Date.now(),
            mesaId: datos.mesaId,
            nombre: datos.nombre,
            telefono: datos.telefono,
            fecha: datos.fecha,
            personas: parseInt(datos.personas, 10),
            codigo,
            codigoValidado: false,
            estado: 'programada',
            creadaEn: new Date().toISOString()
          });

          await StorageModule.saveDB(dbData);
          formReserva.reset();
          mostrarModalCodigoReserva(codigo, datos.nombre, datos.mesaId, datos.fecha);
          navigateTo('cliente');
        });
      }
    }
  
    function updateCartUI() {
      const container = document.getElementById('cart-items-list');
      const totalEl = document.getElementById('cart-total-price');
      const btnSend = document.getElementById('btn-enviar-pedido-cocina');
  
      if (cart.length === 0) {
        container.innerHTML = '<p style="color:#888;">No has agregado platos aún.</p>';
        totalEl.textContent = '0';
        btnSend.disabled = true;
        return;
      }
  
      let total = 0;
      container.innerHTML = cart.map(i => {
        total += i.precio * i.cantidad;
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; background:#f9f9f9; padding:8px; border-radius:6px;">
            <div>
              <strong>${i.nombre}</strong><br>
              <small style="color:#666;">$${i.precio.toLocaleString()} c/u</small>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <button class="btn btn-secondary btn-sm btn-cart-dec" data-id="${i.id}" style="padding:2px 8px;">-</button>
              <span><strong>${i.cantidad}</strong></span>
              <button class="btn btn-secondary btn-sm btn-cart-inc" data-id="${i.id}" style="padding:2px 8px;">+</button>
              <button class="btn btn-danger btn-sm btn-cart-remove" data-id="${i.id}" style="padding:2px 8px; margin-left:5px;">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
  
      totalEl.textContent = total.toLocaleString();
      btnSend.disabled = false;
  
      document.querySelectorAll('.btn-cart-inc').forEach(b => {
        b.addEventListener('click', (e) => {
          const id = e.target.getAttribute('data-id');
          const item = cart.find(x => x.id === id);
          if (item) item.cantidad++;
          updateCartUI();
        });
      });
  
      document.querySelectorAll('.btn-cart-dec').forEach(b => {
        b.addEventListener('click', (e) => {
          const id = e.target.getAttribute('data-id');
          const item = cart.find(x => x.id === id);
          if (item) {
            item.cantidad--;
            if (item.cantidad <= 0) cart = cart.filter(x => x.id !== id);
          }
          updateCartUI();
        });
      });
  
      document.querySelectorAll('.btn-cart-remove').forEach(b => {
        b.addEventListener('click', (e) => {
          const id = e.target.getAttribute('data-id');
          cart = cart.filter(x => x.id !== id);
          updateCartUI();
        });
      });
    }
  
    // EVENTOS COCINA
    function bindCocinaEvents() {
      document.querySelectorAll('.btn-cocina-state').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          const next = e.target.getAttribute('data-next');
          const p = dbData.pedidos.find(x => x.id === id);
          if (p) {
            p.estado = next;
            await StorageModule.saveDB(dbData);
            navigateTo('cocina');
          }
        });
      });
    }
  
    // EVENTOS MESERO
    function bindMeseroEvents() {
  
      document.querySelectorAll('.btn-mesero-deliver').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          const p = dbData.pedidos.find(x => x.id === id);
          if (p) {
            p.estado = 'servido';
            await StorageModule.saveDB(dbData);
            navigateTo('mesero');
          }
        });
      });

      document.querySelectorAll('.btn-verificar-codigo').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          const p = dbData.pedidos.find(x => x.id === id);
          const input = document.querySelector(`.input-verificar-codigo[data-id="${id}"]`);
          const codigoIngresado = input?.value.trim().toUpperCase() || '';

          if (!p || !p.codigoEntrega) return;
          if (!codigoIngresado) {
            alert('Ingresa el código que proporcionó el cliente.');
            return;
          }

          if (codigoIngresado === p.codigoEntrega.toUpperCase()) {
            p.codigoConfirmado = true;
            p.estado = p.estado === 'listo' ? 'listo' : 'servido';
            await StorageModule.saveDB(dbData);
            navigateTo('mesero');
            alert('✅ Código verificado correctamente.');
          } else {
            alert('❌ El código no coincide. Verifica la información con el cliente.');
          }
        });
      });

      document.querySelectorAll('.btn-mesero-entregado').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          const p = dbData.pedidos.find(x => x.id === id);
          if (!p) return;

          p.estado = 'entregado';
          p.codigoConfirmado = true;

          if (p.tipo === 'local' && p.mesaId) {
            const mesa = dbData.mesas.find(m => m.id === p.mesaId);
            if (mesa) mesa.estado = 'disponible';
            ReservasModule.finalizarReservaMesa(dbData, p.mesaId);
          }

          await StorageModule.saveDB(dbData);
          navigateTo('mesero');
          alert(p.tipo === 'local' ? '✅ Pedido marcado como entregado y la mesa liberada.' : '✅ Pedido marcado como entregado.');
        });
      });
  
      document.querySelectorAll('.btn-mesero-pay').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          const p = dbData.pedidos.find(x => x.id === id);
          if (p) {
            p.estado = 'pagado';
            
            dbData.caja.ventasDelDia += p.total;
            dbData.caja.pedidosPagados.push(p);
  
            const mesa = dbData.mesas.find(m => m.id === p.mesaId);
            if (mesa) mesa.estado = 'disponible';

            ReservasModule.finalizarReservaMesa(dbData, p.mesaId);

            await StorageModule.saveDB(dbData);
            alert(`💵 Cobrado $${p.total.toLocaleString()} - Mesa #${p.mesaId} liberada.`);
            navigateTo('mesero');
          }
        });
      });
    }
  
    // EVENTOS ADMIN Y EDICIÓN DE CARTA
    function bindAdminEvents() {
  
      // Cierre de caja
      const btnCierre = document.getElementById('btn-cerrar-caja');
      if (btnCierre) {
        btnCierre.addEventListener('click', async () => {
          if (confirm(`¿Deseas realizar el Cierre de Caja? Total acumulado: $${dbData.caja.ventasDelDia.toLocaleString()}`)) {
            dbData.caja.ventasDelDia = 0;
            dbData.caja.pedidosPagados = [];
            await StorageModule.saveDB(dbData);
            alert('🔒 Caja cerrada y reiniciada para el nuevo turno.');
            navigateTo('panel');
          }
        });
      }
  
      // --- GESTIÓN DE CARTA (PLATOS) ---
      const formPlato = document.getElementById('form-plato-admin');
      const btnToggleForm = document.getElementById('btn-toggle-nuevo-plato');
      const btnCancelarPlato = document.getElementById('btn-cancelar-plato');
      const inputNombrePlato = document.getElementById('admin-plato-nombre');
      const inputPrecioPlato = document.getElementById('admin-plato-precio');
      const inputDescPlato = document.getElementById('admin-plato-desc');
  
      btnToggleForm.addEventListener('click', () => {
        document.getElementById('form-plato-titulo').textContent = 'Nuevo Plato';
        document.getElementById('admin-plato-id').value = '';
        formPlato.reset();
        formPlato.classList.remove('hidden');
      });
  
      btnCancelarPlato.addEventListener('click', () => {
        formPlato.classList.add('hidden');
      });

      if (inputNombrePlato) {
        inputNombrePlato.addEventListener('input', () => clearFieldError('admin-plato-nombre', 'admin-plato-nombre-error'));
      }
      if (inputPrecioPlato) {
        inputPrecioPlato.addEventListener('input', () => clearFieldError('admin-plato-precio', 'admin-plato-precio-error'));
      }
      if (inputDescPlato) {
        inputDescPlato.addEventListener('input', () => clearFieldError('admin-plato-desc', 'admin-plato-desc-error'));
      }
  
      // Cargar datos para Editar Plato
      document.querySelectorAll('.btn-edit-plato').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.getAttribute('data-id');
          const nombre = e.target.getAttribute('data-nombre');
          const precio = e.target.getAttribute('data-precio');
          const desc = e.target.getAttribute('data-desc');
  
          document.getElementById('admin-plato-id').value = id;
          document.getElementById('admin-plato-nombre').value = nombre;
          document.getElementById('admin-plato-precio').value = precio;
          document.getElementById('admin-plato-desc').value = desc;
  
          document.getElementById('form-plato-titulo').textContent = 'Editar Plato';
          formPlato.classList.remove('hidden');
        });
      });
  
      // Eliminar Plato
      document.querySelectorAll('.btn-delete-plato').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          if (confirm('¿Seguro que deseas eliminar este plato de la carta?')) {
            dbData.platos = dbData.platos.filter(p => p.id !== id);
            await StorageModule.saveDB(dbData);
            alert('🗑️ Plato eliminado.');
            navigateTo('panel');
          }
        });
      });
  
      // Guardar Plato (Crear o Editar)
      formPlato.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validatePlatoFormUI()) {
          return;
        }

        const id = document.getElementById('admin-plato-id').value;
        const nombre = document.getElementById('admin-plato-nombre').value;
        const precio = parseFloat(document.getElementById('admin-plato-precio').value);
        const desc = document.getElementById('admin-plato-desc').value;
  
        if (id) {
          // Modo Editar
          const plato = dbData.platos.find(p => p.id === id);
          if (plato) {
            plato.nombre = nombre;
            plato.precio = precio;
            plato.desc = desc;
          }
        } else {
          // Modo Crear
          dbData.platos.push({
            id: 'p_' + Date.now(),
            nombre,
            precio,
            desc
          });
        }
  
        await StorageModule.saveDB(dbData);
        alert('✅ Plato guardado correctamente.');
        navigateTo('panel');
      });
    }
  
    if (passwordInput && passwordToggle) {
      passwordToggle.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        passwordToggle.textContent = isPassword ? '☾' : '☼';
        passwordToggle.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
        passwordToggle.setAttribute('aria-pressed', String(isPassword));
        passwordInput.focus();
      });
    }

    if (document.getElementById('login-username')) {
      document.getElementById('login-username').addEventListener('input', () => clearFieldError('login-username', 'login-username-error'));
    }
    if (passwordInput) {
      passwordInput.addEventListener('input', () => clearFieldError('login-password', 'login-password-error'));
    }

    // LOGIN
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        if (!validateLoginForm()) {
          return;
        }

        const u = document.getElementById('login-username').value.trim();
        const p = document.getElementById('login-password').value;
        const session = await AuthModule.login(u, p);
        loginForm.reset();
        showApp(session);
      } catch (err) {
        alert(err.message);
      }
    });
  
    btnLogout.addEventListener('click', () => {
      AuthModule.logout();
      showLogin();
    });
  
    setupGlobalActions();
    setupInactivityTracker();
    init();
  });