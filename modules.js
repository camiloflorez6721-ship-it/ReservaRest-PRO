/**
 * Módulo de Renderizado de Vistas por Perfil
 */
const UIModules = (() => {
    const sanitize = StorageModule.sanitize;
    const { formatFecha, getMinDatetimeLocal, getEstadoEfectivo, filtrarPendientes, etiquetaEstado, esHoy, ordenarPorFecha } = ReservasModule;

    function renderTarjetaReserva(r, { showCheckIn = false, showCancel = false } = {}) {
      const estado = getEstadoEfectivo(r);
      const badge = etiquetaEstado(estado);
      const esHoyReserva = esHoy(r.fecha);

      return `
        <div class="reserva-card ${esHoyReserva ? 'hoy' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:start; gap:8px;">
            <strong>Mesa #${r.mesaId} · ${sanitize(r.nombre)}</strong>
            <span class="badge ${badge.clase}">${badge.texto}</span>
          </div>
          <p style="font-size:0.85rem; color:#555; margin:5px 0;">Tel: ${sanitize(r.telefono)} · ${r.personas} pers.</p>
          <p style="font-size:0.85rem; color:#555;">📅 ${formatFecha(r.fecha)}${esHoyReserva ? ' <strong>(Hoy)</strong>' : ''}</p>
          ${r.codigo ? `<p style="font-size:0.8rem; color:#888; margin-top:4px;">Código cliente: <code>${sanitize(r.codigo)}</code></p>` : ''}
          ${estado === 'llegado' && !r.codigoValidado ? '<p style="font-size:0.8rem; color:var(--status-preparing); margin-top:4px;">⏳ Esperando validación del cliente</p>' : ''}
          <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
            ${showCheckIn ? `
              <button class="btn btn-primary btn-sm btn-checkin-reserva" data-id="${r.id}" style="flex:1;">
                📍 Confirmar Llegada
              </button>
            ` : ''}
            ${showCancel ? `
              <button class="btn btn-danger btn-sm btn-cancel-reserva" data-id="${r.id}">Cancelar</button>
            ` : ''}
          </div>
        </div>
      `;
    }
  
    return {
      // VISTA PERFIL CLIENTE
      renderCliente(db) {
        return `
          <div class="qr-header-card">
            <h2>👋 ¡Bienvenido a ReservaRest!</h2>
            <p>Selecciona tu tipo de solicitud:</p>
            <div style="margin-top: 15px; display: flex; justify-content: center; gap: 10px;">
              <button id="tab-btn-ordenar" class="btn btn-primary">Estoy en el Local (Hacer Pedido)</button>
              <button id="tab-btn-reservar" class="btn btn-secondary">Crear Reserva Futura</button>
            </div>
          </div>
  
          <!-- FORMULARIO DE RESERVA FUTURA -->
          <div id="section-reserva" class="hidden" style="background:white; padding:20px; border-radius:12px; box-shadow:var(--shadow);">
            <h3>📅 Crear Reserva Futura</h3>
            <p class="reserva-hint">Las reservas tienen una duración estimada de ${ReservasModule.DURACION_MINUTOS / 60} horas por mesa.</p>
            <form id="form-reserva-cliente" style="margin-top:15px;">
              <div class="form-group">
                <label>Fecha y Hora</label>
                <input type="datetime-local" id="reserva-fecha" min="${getMinDatetimeLocal()}" required>
                <div class="form-error-message" id="reserva-fecha-error"></div>
              </div>
              <div class="form-group">
                <label>Número de personas</label>
                <input type="number" id="reserva-personas" min="1" value="2" required>
                <div class="form-error-message" id="reserva-personas-error"></div>
              </div>
              <div class="form-group">
                <label>Selecciona la Mesa</label>
                <select id="reserva-mesa" required>
                  <option value="">— Elige fecha y personas primero —</option>
                </select>
                <div class="form-error-message" id="reserva-mesa-error"></div>
                <p id="reserva-mesas-hint" class="reserva-hint">Selecciona fecha y número de personas para ver mesas disponibles.</p>
              </div>
              <div class="form-group">
                <label>Tu Nombre</label>
                <input type="text" id="reserva-nombre" placeholder="Nombre completo" required maxlength="80" inputmode="text" pattern="[A-Za-zÁÉÍÓÚáéíóúÑñ ]+" autocomplete="name">
                <div class="form-error-message" id="reserva-nombre-error"></div>
              </div>
              <div class="form-group">
                <label>Teléfono</label>
                <input type="tel" id="reserva-telefono" placeholder="Ej: 3001234567" required maxlength="15" inputmode="tel" pattern="[0-9+\s()-]{7,15}">
                <div class="form-error-message" id="reserva-telefono-error"></div>
              </div>
              <button type="submit" class="btn btn-primary btn-block">Confirmar Reserva</button>
            </form>
          </div>
  
          <!-- CARTA DIGITAL Y PEDIDO EN EL LOCAL -->
          <div id="section-ordenar">
            <div style="background:white; padding:15px; border-radius:12px; display:flex; gap:15px; margin-bottom:15px; flex-wrap:wrap;">
              <div class="form-group" style="margin:0; flex:1; min-width:220px;">
                <label><strong>Tipo de pedido:</strong></label>
                <select id="tipo-pedido">
                  <option value="local">Consumir en el local</option>
                  <option value="llevar">Para llevar / recoger</option>
                  <option value="domicilio">A domicilio</option>
                </select>
              </div>
              <div id="cliente-mesa-wrapper" class="form-group" style="margin:0; flex:1; min-width:220px;">
                <label><strong>Selecciona tu Mesa:</strong></label>
                <select id="cliente-mesa-id">
                  ${db.mesas.map(m => {
                    const estadoLabel = m.estado === 'ocupada' ? ' — OCUPADA' : ' — Disponible';
                    return `<option value="${m.id}" data-capacidad="${m.capacidad}" data-estado="${m.estado}">Mesa #${m.numero} (Máx: ${m.capacidad} pers.)${estadoLabel}</option>`;
                  }).join('')}
                </select>
              </div>
              <div id="cliente-personas-wrapper" class="form-group" style="margin:0; flex:1; min-width:200px;">
                <label><strong>N° de Personas:</strong></label>
                <input type="number" id="cliente-num-personas" min="1" value="1">
              </div>
            </div>

            <div id="datos-entrega-wrapper" class="hidden" style="background:#faf7f2; border:1px dashed #c8b59a; padding:14px; border-radius:12px; margin-bottom:15px;">
              <div class="form-group" style="margin-bottom:10px;">
                <label><strong>Tu nombre</strong></label>
                <input type="text" id="cliente-nombre-recoger" placeholder="Nombre completo" maxlength="80" inputmode="text" pattern="[A-Za-zÁÉÍÓÚáéíóúÑñ ]+">
                <div class="form-error-message" id="cliente-nombre-recoger-error"></div>
              </div>
              <div class="form-group" style="margin-bottom:10px;">
                <label><strong>Teléfono</strong></label>
                <input type="tel" id="cliente-telefono-recoger" placeholder="Ej: 3001234567" maxlength="15" inputmode="tel" pattern="[0-9+\s()-]{7,15}">
                <div class="form-error-message" id="cliente-telefono-recoger-error"></div>
              </div>
              <div id="cliente-direccion-wrapper" class="hidden">
                <div class="form-group" style="margin-bottom:0;">
                  <label><strong>Dirección para domicilio</strong></label>
                  <textarea id="cliente-direccion-entrega" rows="2" placeholder="Ingresa la dirección completa"></textarea>
                  <div class="form-error-message" id="cliente-direccion-entrega-error"></div>
                </div>
              </div>
            </div>

            <div id="pedido-tipo-info" class="hidden" style="background:#f8f9fa; border:1px dashed #ccc; padding:12px 14px; border-radius:10px; margin-bottom:15px; color:#555;">
              📦 Tu pedido será preparado para recoger en el restaurante. El mesero lo atenderá cuando llegue al local.
            </div>

            <div id="panel-mesa-bloqueada" class="mesa-bloqueada-panel hidden">
              <h3>🚫 Mesa no disponible</h3>
              <p style="margin-top:8px; color:#555;">Esta mesa está ocupada por otro cliente. Selecciona una mesa disponible o valida tu reserva si tienes código.</p>
            </div>

            <div id="panel-validacion-codigo" class="codigo-panel hidden">
              <h3>🔐 Validación de Reserva</h3>
              <p style="margin:10px 0; color:#555;">La Mesa #<span id="codigo-mesa-numero">—</span> está reservada a tu nombre.</p>
              <p style="font-size:0.9rem; color:#666;">Ingresa el código que recibiste al crear tu reserva para acceder al menú.</p>
              <form id="form-validar-codigo" style="margin-top:16px;">
                <div class="form-group">
                  <input type="text" id="input-codigo-reserva" placeholder="RR-XXXXXX" maxlength="12" autocomplete="off" required>
                </div>
                <p id="codigo-error-msg" class="hidden" style="color:var(--status-occupied); font-size:0.85rem; margin-bottom:10px;"></p>
                <button type="submit" class="btn btn-primary">✅ Validar e Ingresar al Menú</button>
              </form>
            </div>

            <div id="panel-menu-pedido" class="hidden">
              <div id="acceso-autorizado-banner" class="hidden" style="background:#e8f5e9; border:1px solid #a5d6a7; padding:10px 14px; border-radius:8px; margin-bottom:12px; font-size:0.9rem;">
                ✅ Reserva validada — puedes realizar tu pedido.
              </div>

              <h3>🍽️ Menú de Platos</h3>
              <div class="menu-grid">
                ${db.platos.map(p => `
                  <div class="menu-card">
                    <div>
                      <h4>${sanitize(p.nombre)}</h4>
                      <p style="font-size:0.85rem; color:#666;">${sanitize(p.desc)}</p>
                      <strong style="color:var(--primary);">$${p.precio.toLocaleString()}</strong>
                    </div>
                    <button class="btn btn-primary btn-sm btn-add-cart" data-id="${p.id}" data-nombre="${sanitize(p.nombre)}" data-precio="${p.precio}" style="margin-top:10px;">
                      + Agregar
                    </button>
                  </div>
                `).join('')}
              </div>

              <!-- RESUMEN DEL PEDIDO -->
              <div class="cart-summary">
                <h3>🛒 Tu Pedido</h3>
                <div id="cart-items-list" style="margin:15px 0;">
                  <p style="color:#888;">No has agregado platos aún.</p>
                </div>
                <h4>Total: $<span id="cart-total-price">0</span></h4>
                <button id="btn-enviar-pedido-cocina" class="btn btn-success btn-block" style="margin-top:15px;" disabled>
                  🚀 Enviar Pedido a Cocina
                </button>
              </div>
            </div>
          </div>
        `;
      },
  
      // VISTA PERFIL COCINA
      renderCocina(db) {
        const pedidosActivos = db.pedidos.filter(p => p.estado !== 'servido' && p.estado !== 'pagado' && p.estado !== 'entregado');
        return `
          <h2>👨‍🍳 Panel de Cocina</h2>
          <p>Órdenes entrantes</p>
          <div class="orders-grid">
            ${pedidosActivos.length === 0 ? '<p>No hay pedidos pendientes en cocina. 🎉</p>' :
              pedidosActivos.map(p => `
                <div class="order-card ${p.estado === 'listo' ? 'ready' : (p.estado === 'preparando' ? 'preparing' : '')}">
                  <div style="display:flex; justify-content:space-between; gap:8px;">
                    <h3>${p.tipo === 'llevar' ? '🛍️ Para llevar' : `Mesa #${p.mesaId}`}</h3>
                    <span class="badge ${p.estado === 'listo' ? 'badge-info' : 'badge-warning'}">${p.estado}</span>
                  </div>
                  <p style="font-size:0.85rem; color:#555;">${p.tipo === 'llevar' ? 'Recoger en restaurante' : p.tipo === 'domicilio' ? 'Entrega a domicilio' : `Mesa #${p.mesaId}`} · Personas: ${p.personas} · Hora: ${p.hora}</p>
                  ${p.codigoEntrega ? `<p style="font-size:0.8rem; color:var(--primary); margin-top:6px; font-weight:700;">Código: ${sanitize(p.codigoEntrega)}</p>` : ''}
                  ${p.nombreCliente ? `<p style="font-size:0.8rem; color:#666; margin-top:4px;">Cliente: ${sanitize(p.nombreCliente)}</p>` : ''}
                  <hr style="margin:10px 0;">
                  <ul>
                    ${p.items.map(i => `<li><strong>${i.cantidad}x</strong> ${sanitize(i.nombre)}</li>`).join('')}
                  </ul>
                  <div style="margin-top:15px;">
                    ${p.estado === 'pendiente' ? `
                      <button class="btn btn-warning btn-block btn-cocina-state" data-id="${p.id}" data-next="preparando">🍳 Empezar a Preparar</button>
                    ` : ''}
                    ${p.estado === 'preparando' ? `
                      <button class="btn btn-success btn-block btn-cocina-state" data-id="${p.id}" data-next="listo">🔔 ¡Plato Listo!</button>
                    ` : ''}
                    ${p.estado === 'listo' ? `
                      <p style="color:var(--status-ready); text-align:center; font-weight:bold;">Avisado al Mesero 👍</p>
                    ` : ''}
                  </div>
                </div>
              `).join('')
            }
          </div>
        `;
      },
  
      // VISTA PERFIL MESERO
      renderMesero(db) {
        const pedidosMesero = db.pedidos.filter(p => p.estado !== 'pagado' && p.estado !== 'entregado');
        const reservasPendientes = filtrarPendientes(db.reservas);
        const reservasHoy = reservasPendientes.filter(r => esHoy(r.fecha));
        const reservasProximas = reservasPendientes.filter(r => !esHoy(r.fecha));

        const renderListaReservas = (lista) => lista.length === 0
          ? '<p style="margin-top:5px; font-size:0.9rem;">Sin reservas en este grupo.</p>'
          : `<div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:10px;">
              ${lista.map(r => renderTarjetaReserva(r, { showCheckIn: true })).join('')}
            </div>`;

        return `
          <h2>🛎️ Panel de Mesero</h2>
          <p>Gestión de entregas, reservas y cobros</p>

          <div style="background:#fff3cd; border:1px solid #ffeeba; padding:15px; border-radius:12px; margin-bottom:20px;">
            <h3>📅 Reservas de Hoy (${reservasHoy.length})</h3>
            ${renderListaReservas(reservasHoy)}
          </div>

          <div style="background:#e8f5e9; border:1px solid #c8e6c9; padding:15px; border-radius:12px; margin-bottom:20px;">
            <h3>🗓️ Próximas Reservas (${reservasProximas.length})</h3>
            ${renderListaReservas(reservasProximas)}
          </div>
  
          <div class="orders-grid">
            ${pedidosMesero.length === 0 ? '<p>No hay mesas activas con pedidos.</p>' :
              pedidosMesero.map(p => `
                <div class="order-card ${p.estado === 'listo' ? 'ready' : ''}">
                  <div style="display:flex; justify-content:space-between; gap:8px;">
                    <h3>${p.tipo === 'llevar' ? '🛍️ Para llevar' : `Mesa #${p.mesaId}`}</h3>
                    <span class="badge">${p.estado}</span>
                  </div>
                  <p style="margin-top:5px; font-size:0.9rem; color:#555;">${p.tipo === 'llevar' ? 'Recoger en restaurante' : p.tipo === 'domicilio' ? 'Entrega a domicilio' : `Mesa #${p.mesaId}`}</p>
                  ${p.codigoEntrega ? `<p style="margin-top:6px; font-size:0.85rem; color:var(--primary); font-weight:700;">Código: ${sanitize(p.codigoEntrega)}</p>` : ''}
                  ${p.nombreCliente ? `<p style="margin-top:4px; font-size:0.85rem; color:#666;">Cliente: ${sanitize(p.nombreCliente)}</p>` : ''}
                  <p style="margin-top:5px;"><strong>Total:</strong> $${p.total.toLocaleString()}</p>
                  <div style="margin-top:10px;">
                    ${p.tipo === 'local' ? '' : `<small style="color:#777;">${p.tipo === 'domicilio' ? 'Entrega por domicilio' : 'Recogida en restaurante'}</small>`}
                  </div>
                  ${p.tipo === 'llevar' ? `
                    <div style="margin-top:10px;">
                      <label style="font-size:0.8rem; color:#444; font-weight:700;">Código del cliente</label>
                      <input type="text" class="input-verificar-codigo" data-id="${p.id}" maxlength="8" style="width:100%; margin-top:4px; color:#111; background:#fff;" placeholder="Ej: ABC123">
                      <button class="btn btn-secondary btn-block btn-verificar-codigo" data-id="${p.id}" style="margin-top:8px;">✅ Verificar Código</button>
                      ${p.codigoConfirmado ? '<p style="font-size:0.8rem; color:var(--status-ready); margin-top:6px;">✔ Código confirmado</p>' : '<p style="font-size:0.8rem; color:#444; margin-top:6px;">Esperando verificación</p>'}
                    </div>
                  ` : p.tipo === 'domicilio' ? `
                    <div style="margin-top:10px;">
                      <button class="btn btn-success btn-block btn-mesero-entregado" data-id="${p.id}">📦 Marcar como entregado</button>
                      ${p.estado === 'entregado' ? '<p style="font-size:0.8rem; color:var(--status-ready); margin-top:6px;">✔ Entregado</p>' : '<p style="font-size:0.8rem; color:#444; margin-top:6px;">Pendiente de entrega</p>'}
                    </div>
                  ` : ''}
                  <div style="margin-top:15px;">
                    ${p.estado === 'listo' ? `
                      <button class="btn btn-primary btn-block btn-mesero-deliver" data-id="${p.id}">🍽️ Entregar a la Mesa</button>
                    ` : ''}
                    ${p.estado === 'servido' ? `
                      <button class="btn btn-success btn-block btn-mesero-pay" data-id="${p.id}">💵 Cobrar y Liberar Mesa</button>
                    ` : ''}
                    ${p.estado === 'pendiente' || p.estado === 'preparando' ? `
                      <p style="font-size:0.85rem; color:#777;">En cocina...</p>
                    ` : ''}
                  </div>
                </div>
              `).join('')
            }
          </div>
        `;
      },
  
      // VISTA PERFIL ADMINISTRADOR
      renderAdmin(db) {
        const totalCaja = db.caja.ventasDelDia || 0;
        const totalPedidosPagados = db.caja.pedidosPagados.length;
  
        return `
          <h2>📊 Panel Administrador</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <h3>$${totalCaja.toLocaleString()}</h3>
              <p>Ventas del Día (Caja)</p>
            </div>
            <div class="stat-card">
              <h3>${totalPedidosPagados}</h3>
              <p>Servicios Cobrados</p>
            </div>
            <div class="stat-card">
              <h3>${filtrarPendientes(db.reservas).length}</h3>
              <p>Reservas Activas</p>
            </div>
          </div>
  
          <div style="background:white; padding:20px; border-radius:12px; box-shadow:var(--shadow); margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h3>💰 Cierre y Arqueo de Caja</h3>
              <button id="btn-cerrar-caja" class="btn btn-danger">🔒 Liberar / Cerrar Caja del Día</button>
            </div>
          </div>
  
          <!-- SECCIÓN DE ADMINISTRACIÓN DE CARTA / MENU -->
          <div style="background:white; padding:20px; border-radius:12px; box-shadow:var(--shadow); margin-bottom:25px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
              <h3>🍽️ Gestionar Carta del Restaurante</h3>
              <button id="btn-toggle-nuevo-plato" class="btn btn-primary btn-sm">+ Agregar Nuevo Plato</button>
            </div>
  
            <!-- FORMULARIO PARA CREAR/EDITAR PLATO -->
            <form id="form-plato-admin" class="hidden" style="background:#f8f9fa; padding:15px; border-radius:8px; margin-bottom:15px;">
              <input type="hidden" id="admin-plato-id">
              <h4 id="form-plato-titulo" style="margin-bottom:10px;">Nuevo Plato</h4>
              <div style="display:flex; gap:10px; margin-bottom:10px; flex-wrap:wrap;">
                <div style="flex:2; min-width:220px;">
                  <input type="text" id="admin-plato-nombre" placeholder="Nombre del plato" required>
                  <div class="form-error-message" id="admin-plato-nombre-error"></div>
                </div>
                <div style="flex:1; min-width:180px;">
                  <input type="number" id="admin-plato-precio" placeholder="Precio ($)" min="1" required>
                  <div class="form-error-message" id="admin-plato-precio-error"></div>
                </div>
              </div>
              <textarea id="admin-plato-desc" placeholder="Descripción de ingredientes o preparación..." style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc; margin-bottom:10px;" rows="2" required></textarea>
              <div class="form-error-message" id="admin-plato-desc-error"></div>
              <div style="display:flex; gap:10px;">
                <button type="submit" class="btn btn-success btn-sm">Guardar Plato</button>
                <button type="button" id="btn-cancelar-plato" class="btn btn-secondary btn-sm">Cancelar</button>
              </div>
            </form>
  
            <!-- LISTA DE PLATOS EDITABLES -->
            <table style="width:100%; border-collapse:collapse;">
              <thead>
                <tr style="text-align:left; border-bottom:2px solid #eee;">
                  <th style="padding:8px;">Plato</th>
                  <th style="padding:8px;">Descripción</th>
                  <th style="padding:8px;">Precio</th>
                  <th style="padding:8px;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${db.platos.map(p => `
                  <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:8px;"><strong>${sanitize(p.nombre)}</strong></td>
                    <td style="padding:8px; font-size:0.85rem; color:#666;">${sanitize(p.desc)}</td>
                    <td style="padding:8px;">$${p.precio.toLocaleString()}</td>
                    <td style="padding:8px; display:flex; gap:5px;">
                      <button class="btn btn-secondary btn-sm btn-edit-plato" data-id="${p.id}" data-nombre="${sanitize(p.nombre)}" data-precio="${p.precio}" data-desc="${sanitize(p.desc)}">✏️ Editar</button>
                      <button class="btn btn-danger btn-sm btn-delete-plato" data-id="${p.id}">🗑️</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
  
          <!-- SECCIÓN CONTROL DE RESERVAS (ADMIN) -->
          <h3>📅 Control de Reservas</h3>
          <table style="width:100%; background:white; padding:10px; border-radius:8px; margin-top:10px; border-collapse:collapse;">
            <thead>
              <tr style="text-align:left; border-bottom:2px solid #eee;">
                <th style="padding:8px;">Mesa</th>
                <th style="padding:8px;">Cliente</th>
                <th style="padding:8px;">Código</th>
                <th style="padding:8px;">Teléfono</th>
                <th style="padding:8px;">Fecha/Hora</th>
                <th style="padding:8px;">Pers.</th>
                <th style="padding:8px;">Estado</th>
                <th style="padding:8px;">Acción</th>
              </tr>
            </thead>
            <tbody>
              ${db.reservas.length === 0 ? '<tr><td colspan="8" style="padding:10px;">No hay reservas registradas.</td></tr>' :
                ordenarPorFecha(db.reservas).reverse().map(r => {
                  const estado = getEstadoEfectivo(r);
                  const badge = etiquetaEstado(estado);
                  const validacion = r.estado === 'llegado'
                    ? (r.codigoValidado ? ' ✅ Validado' : ' ⏳ Pendiente')
                    : '';
                  return `
                    <tr style="border-bottom:1px solid #eee;">
                      <td style="padding:8px;">Mesa #${r.mesaId}</td>
                      <td style="padding:8px;">${sanitize(r.nombre)}</td>
                      <td style="padding:8px;"><code>${r.codigo ? sanitize(r.codigo) : '—'}</code></td>
                      <td style="padding:8px;">${sanitize(r.telefono)}</td>
                      <td style="padding:8px;">${formatFecha(r.fecha)}</td>
                      <td style="padding:8px;">${r.personas}</td>
                      <td style="padding:8px;">
                        <span class="badge ${badge.clase}">${badge.texto}${validacion}</span>
                      </td>
                      <td style="padding:8px;">
                        ${estado === 'programada' ? `
                          <button class="btn btn-primary btn-sm btn-checkin-reserva" data-id="${r.id}">📍 Llegada</button>
                          <button class="btn btn-danger btn-sm btn-cancel-reserva" data-id="${r.id}">Cancelar</button>
                        ` : '—'}
                      </td>
                    </tr>
                  `;
                }).join('')
              }
            </tbody>
          </table>
        `;
      },
  
      // VISTA ESTADO MESAS
      renderMesas(db) {
        return `
          <h2>🪑 Estado Actual de las Mesas</h2>
          <div class="tables-grid">
            ${db.mesas.map(m => `
              <div class="table-box ${m.estado}">
                <h4>Mesa #${m.numero}</h4>
                <p>${m.capacidad} Pers.</p>
                <strong style="text-transform:uppercase; font-size:0.75rem;">${m.estado}</strong>
              </div>
            `).join('')}
          </div>
        `;
      },
  
      // VISTA PERFILES Y CREDENCIALES
      renderUsuarios() {
        return `
          <h2>👥 Perfiles del Sistema</h2>
          <p>Inicia sesión utilizando cualquiera de estas credenciales:</p>
          <ul style="line-height:2; margin-top:10px;">
            <li><strong>Cliente:</strong> usuario: <code>cliente</code> | clave: <code>cliente123</code></li>
            <li><strong>Cocina:</strong> usuario: <code>cocina</code> | clave: <code>cocina123</code></li>
            <li><strong>Mesero:</strong> usuario: <code>mesero</code> | clave: <code>mesero123</code></li>
            <li><strong>Administrador:</strong> usuario: <code>admin</code> | clave: <code>admin123</code></li>
          </ul>
          <button id="btn-reset-demo" class="btn btn-danger" style="margin-top:20px;">Resetear Base de Datos Demo</button>
        `;
      }
    };
  })();