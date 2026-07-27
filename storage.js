/**
 * Capa de Persistencia y Seguridad con Almacenamiento Local
 */
const StorageModule = (() => {
    const DB_KEY = 'restaurante_pro_db_v3';
    const SESSION_KEY = 'restaurante_pro_session';
  
    async function hashString(str) {
      if (window.crypto && window.crypto.subtle) {
        try {
          const encoder = new TextEncoder();
          const data = encoder.encode(str);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {}
      }
      let hash = 5381;
      for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) + str.charCodeAt(i);
      return 'h_' + Math.abs(hash).toString(16);
    }
  
    function sanitize(str) {
      if (typeof str !== 'string') return str;
      return str.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
      })[m]);
    }
  
    async function getInitialData() {
      return {
        users: [
          { id: 'u1', username: 'admin', role: 'admin', name: 'Administrador', passwordHash: await hashString('admin123') },
          { id: 'u2', username: 'mesero', role: 'mesero', name: 'Carlos Mesero', passwordHash: await hashString('mesero123') },
          { id: 'u3', username: 'cocina', role: 'cocina', name: 'Chef Ana', passwordHash: await hashString('cocina123') },
          { id: 'u4', username: 'cliente', role: 'cliente', name: 'Juan Cliente', passwordHash: await hashString('cliente123') }
        ],
        mesas: Array.from({ length: 8 }, (_, i) => ({
          id: i + 1,
          numero: i + 1,
          capacidad: (i % 2 === 0) ? 4 : 2,
          estado: 'disponible' // 'disponible' | 'ocupada'
        })),
        platos: [
          { id: 'p1', nombre: 'Ceviche Clásico', precio: 28000, desc: 'Pescado fresco marinado en limón.' },
          { id: 'p2', nombre: 'Lomo Saltado', precio: 32000, desc: 'Trozos de lomo, cebolla, tomate y papas.' },
          { id: 'p3', nombre: 'Hamburguesa Artesanal', precio: 24000, desc: '180g de carne, queso cheddar y tocineta.' },
          { id: 'p4', nombre: 'Arroz Chaufa de Mariscos', precio: 30000, desc: 'Arroz salteado al wok con mariscos.' },
          { id: 'p5', nombre: 'Pasta Alfredo con Pollo', precio: 26000, desc: 'Salsa cremosa de queso parmesano.' },
          { id: 'p6', nombre: 'Jugo Natural de Mango', precio: 8000, desc: 'Agua o leche.' },
          { id: 'p7', nombre: 'Cerveza Artesanal', precio: 12000, desc: '330ml helada.' },
          { id: 'p8', nombre: 'Postre Tres Leches', precio: 10000, desc: 'Bizcocho bañado en tres leches.' }
        ],
        pedidos: [],
        reservas: [],
        caja: {
          ventasDelDia: 0,
          pedidosPagados: []
        }
      };
    }
  
    return {
      sanitize,
      hashString,
      async initDB(forceReset = false) {
        const rawData = localStorage.getItem(DB_KEY);
        if (!rawData || forceReset) {
          const initial = await getInitialData();
          await this.saveDB(initial);
          return initial;
        }
        return JSON.parse(rawData);
      },
      async saveDB(data) {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
      },
      getSession() {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      },
      setSession(sessionData) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      },
      clearSession() {
        localStorage.removeItem(SESSION_KEY);
      }
    };
  })();