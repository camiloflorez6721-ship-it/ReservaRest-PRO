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

    function base64UrlEncode(value) {
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      const bytes = new TextEncoder().encode(str);
      let binary = '';
      bytes.forEach((byte) => binary += String.fromCharCode(byte));
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }

    function base64UrlDecode(value) {
      const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
      const padding = '='.repeat((4 - (base64.length % 4)) % 4);
      const binary = atob(base64 + padding);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }

    async function createJwtSecretKey() {
      const secret = 'reserva-rest-jwt-secret-v1';
      const encoder = new TextEncoder();
      return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    }

    async function generateJWT(payload) {
      if (!window.crypto || !window.crypto.subtle) return null;

      const header = { alg: 'HS256', typ: 'JWT' };
      const now = Math.floor(Date.now() / 1000);
      const body = {
        ...payload,
        iat: now,
        exp: now + 8 * 60 * 60
      };

      const headerPart = base64UrlEncode(header);
      const payloadPart = base64UrlEncode(body);
      const signingInput = `${headerPart}.${payloadPart}`;
      const key = await createJwtSecretKey();
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
      const signaturePart = base64UrlEncode(String.fromCharCode(...new Uint8Array(signatureBuffer)));
      return `${signingInput}.${signaturePart}`;
    }

    async function verifyJWT(token) {
      if (!token || !window.crypto || !window.crypto.subtle) return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [headerPart, payloadPart, signaturePart] = parts;
      const signingInput = `${headerPart}.${payloadPart}`;
      const key = await createJwtSecretKey();
      const signatureBuffer = new TextEncoder().encode(signaturePart);
      const isValid = await crypto.subtle.verify('HMAC', key, signatureBuffer, new TextEncoder().encode(signingInput));
      if (!isValid) return null;

      try {
        const payload = JSON.parse(base64UrlDecode(payloadPart));
        if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
        return payload;
      } catch (error) {
        return null;
      }
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
      generateJWT,
      verifyJWT,
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