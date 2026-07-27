/**
 * Lógica centralizada de reservas futuras
 */
const ReservasModule = (() => {
  const DURACION_MINUTOS = 120;

  function parseFecha(fechaStr) {
    if (!fechaStr) return null;
    const d = new Date(fechaStr);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function formatFecha(fechaStr) {
    const d = parseFecha(fechaStr);
    if (!d) return fechaStr || '—';
    return d.toLocaleString('es-CO', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getMinDatetimeLocal() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  function esMismaFecha(a, b) {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  function hayConflictoHorario(fechaA, fechaB) {
    const diffMs = Math.abs(fechaA.getTime() - fechaB.getTime());
    return diffMs < DURACION_MINUTOS * 60 * 1000;
  }

  function getEstadoEfectivo(reserva) {
    if (reserva.estado === 'llegado' || reserva.estado === 'cancelada' || reserva.estado === 'finalizada') {
      return reserva.estado;
    }
    const fecha = parseFecha(reserva.fecha);
    if (!fecha) return 'programada';
    if (fecha.getTime() < Date.now()) return 'expirada';
    return 'programada';
  }

  function normalizarEstados(db) {
    let cambio = false;
    db.reservas.forEach(r => {
      const efectivo = getEstadoEfectivo(r);
      if (efectivo === 'expirada' && r.estado === 'programada') {
        r.estado = 'expirada';
        cambio = true;
      }
    });
    return cambio;
  }

  function reservasActivas(db, excludeId = null) {
    return db.reservas.filter(r => {
      if (excludeId && r.id === excludeId) return false;
      const estado = getEstadoEfectivo(r);
      return estado === 'programada';
    });
  }

  function mesaOcupadaEnHorario(db, mesaId, fechaReserva, excludeId = null) {
    const target = parseFecha(fechaReserva);
    if (!target) return false;

    return reservasActivas(db, excludeId).some(r => {
      if (r.mesaId !== mesaId) return false;
      const otra = parseFecha(r.fecha);
      return otra && hayConflictoHorario(target, otra);
    });
  }

  function getMesasDisponibles(db, fechaReserva, personas = 1) {
    const numPersonas = parseInt(personas, 10) || 1;
    return db.mesas.filter(m =>
      m.capacidad >= numPersonas && !mesaOcupadaEnHorario(db, m.id, fechaReserva)
    );
  }

  function validarNuevaReserva(db, datos) {
    const { mesaId, fecha, personas, nombre, telefono } = datos;
    const numPersonas = parseInt(personas, 10);

    if (!nombre?.trim()) {
      return { ok: false, error: 'Ingresa tu nombre completo.' };
    }
    if (!telefono?.trim() || telefono.trim().length < 7) {
      return { ok: false, error: 'Ingresa un teléfono válido (mínimo 7 dígitos).' };
    }
    if (!numPersonas || numPersonas < 1) {
      return { ok: false, error: 'Indica al menos 1 persona.' };
    }

    const fechaReserva = parseFecha(fecha);
    if (!fechaReserva) {
      return { ok: false, error: 'Selecciona una fecha y hora válidas.' };
    }
    if (fechaReserva.getTime() <= Date.now()) {
      return { ok: false, error: 'La reserva debe ser en una fecha y hora futuras.' };
    }

    const mesa = db.mesas.find(m => m.id === mesaId);
    if (!mesa) {
      return { ok: false, error: 'Mesa no encontrada.' };
    }
    if (numPersonas > mesa.capacidad) {
      return { ok: false, error: `La mesa seleccionada solo admite ${mesa.capacidad} personas.` };
    }
    if (mesaOcupadaEnHorario(db, mesaId, fecha)) {
      return { ok: false, error: 'Esa mesa ya tiene una reserva en ese horario. Elige otra mesa u horario.' };
    }

    return { ok: true };
  }

  function ordenarPorFecha(reservas) {
    return [...reservas].sort((a, b) => {
      const fa = parseFecha(a.fecha)?.getTime() ?? 0;
      const fb = parseFecha(b.fecha)?.getTime() ?? 0;
      return fa - fb;
    });
  }

  function filtrarPendientes(reservas) {
    return ordenarPorFecha(reservas.filter(r => getEstadoEfectivo(r) === 'programada'));
  }

  function etiquetaEstado(estado) {
    const map = {
      programada: { texto: 'Programada', clase: 'badge-warning' },
      llegado: { texto: 'Cliente en mesa', clase: 'badge-info' },
      finalizada: { texto: 'Finalizada', clase: 'badge-success' },
      expirada: { texto: 'No se presentó', clase: 'badge-danger' },
      cancelada: { texto: 'Cancelada', clase: 'badge-secondary' }
    };
    return map[estado] || { texto: estado, clase: 'badge' };
  }

  function esHoy(fechaStr) {
    const d = parseFecha(fechaStr);
    return d ? esMismaFecha(d, new Date()) : false;
  }

  function generarCodigoReserva(db) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo;
    do {
      let suffix = '';
      for (let i = 0; i < 6; i++) {
        suffix += chars[Math.floor(Math.random() * chars.length)];
      }
      codigo = `RR-${suffix}`;
    } while (db.reservas.some(r => r.codigo === codigo));
    return codigo;
  }

  function normalizarCodigo(codigo) {
    return (codigo || '').trim().toUpperCase();
  }

  function getReservaEnMesa(db, mesaId) {
    const id = parseInt(mesaId, 10);
    return db.reservas.find(r =>
      parseInt(r.mesaId, 10) === id && r.estado === 'llegado'
    ) || null;
  }

  function evaluarAccesoMesa(db, mesaId) {
    const mesa = db.mesas.find(m => m.id === parseInt(mesaId, 10));
    if (!mesa) return { tipo: 'bloqueada' };

    if (mesa.estado === 'disponible') {
      return { tipo: 'libre', mesa };
    }

    const reserva = getReservaEnMesa(db, mesaId);
    if (reserva) {
      if (reserva.codigoValidado) {
        return { tipo: 'autorizado', mesa, reserva };
      }
      return { tipo: 'codigo_requerido', mesa, reserva };
    }

    return { tipo: 'bloqueada', mesa };
  }

  function validarCodigoAcceso(db, mesaId, codigoIngresado) {
    const codigo = normalizarCodigo(codigoIngresado);
    if (!codigo) {
      return { ok: false, error: 'Ingresa tu código de reserva.' };
    }

    const reserva = getReservaEnMesa(db, mesaId);
    if (!reserva) {
      return { ok: false, error: 'Esta mesa no tiene una reserva activa pendiente de validación.' };
    }

    if (reserva.codigoValidado) {
      return { ok: true, reserva };
    }

    if (normalizarCodigo(reserva.codigo) !== codigo) {
      return { ok: false, error: 'Código incorrecto. Verifica e intenta de nuevo.' };
    }

    return { ok: true, reserva };
  }

  function finalizarReservaMesa(db, mesaId) {
    const reserva = getReservaEnMesa(db, mesaId);
    if (reserva) {
      reserva.estado = 'finalizada';
      reserva.codigoValidado = false;
    }
  }

  return {
    DURACION_MINUTOS,
    parseFecha,
    formatFecha,
    getMinDatetimeLocal,
    getEstadoEfectivo,
    normalizarEstados,
    mesaOcupadaEnHorario,
    getMesasDisponibles,
    validarNuevaReserva,
    ordenarPorFecha,
    filtrarPendientes,
    etiquetaEstado,
    esHoy,
    generarCodigoReserva,
    normalizarCodigo,
    getReservaEnMesa,
    evaluarAccesoMesa,
    validarCodigoAcceso,
    finalizarReservaMesa
  };
})();
