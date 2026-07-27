/**
 * Controlador Principal
 */
document.addEventListener('DOMContentLoaded', () => {
    let dbData = null;
    let cart = [];
    let activeView = 'cliente';
  
    const mainContent = document.getElementById('main-content');
    const sidebar = document.getElementById('sidebar');
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    const sessionInfo = document.getElementById('session-info');
    const loginForm = document.getElementById('login-form');
    const btnLogout = document.getElementById('btn-logout');
  
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
      const session = AuthModule.getUserSession();
  
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
  
    sidebar.addEventListener('click', async (e) => {
      if (e.target.classList.contains('nav-btn')) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const view = e.target.getAttribute('data-view');
        await navigateTo(view);
      }
    });
  
    async function navigateTo(view) {
      activeView = view;
      await refreshDB();

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
  
      const selectMesaReserva = document.getElementById('reserva-mesa');
      const inputPersonasReserva = document.getElementById('reserva-personas');
      const inputFechaReserva = document.getElementById('reserva-fecha');

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
      }
      if (inputPersonasReserva) {
        inputPersonasReserva.addEventListener('input', () => {
          actualizarMesasReserva();
          validarCapacidad(selectMesaReserva, inputPersonasReserva);
        });
      }
      if (selectMesaReserva) {
        selectMesaReserva.addEventListener('change', () => validarCapacidad(selectMesaReserva, inputPersonasReserva));
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
        const mesaId = parseInt(selectMesaOrden.value, 10);
        const personas = parseInt(inputPersonasOrden.value, 10) || 1;

        if (!mesaPermitePedido(mesaId)) {
          alert('⚠️ Debes validar tu código de reserva antes de enviar un pedido.');
          return;
        }

        if (cart.length === 0) {
          alert('Agrega al menos un plato a tu pedido.');
          return;
        }

        const total = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  
        const nuevoPedido = {
          id: 'p_' + Date.now(),
          mesaId,
          personas,
          items: [...cart],
          total,
          estado: 'pendiente',
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
  
        dbData.pedidos.push(nuevoPedido);

        const mesa = dbData.mesas.find(m => m.id === mesaId);
        if (mesa && mesa.estado === 'disponible') mesa.estado = 'ocupada';

        cart = [];
        await persistAndReload('cliente');
        alert(`🚀 ¡Pedido para la Mesa #${mesaId} enviado a la cocina!`);
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
  
      btnToggleForm.addEventListener('click', () => {
        document.getElementById('form-plato-titulo').textContent = 'Nuevo Plato';
        document.getElementById('admin-plato-id').value = '';
        formPlato.reset();
        formPlato.classList.remove('hidden');
      });
  
      btnCancelarPlato.addEventListener('click', () => {
        formPlato.classList.add('hidden');
      });
  
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
  
    // LOGIN
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const u = document.getElementById('login-username').value;
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
    init();
  });