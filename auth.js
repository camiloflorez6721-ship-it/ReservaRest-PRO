/**
 * Módulo de Autenticación y Permisos por Rol
 */
const AuthModule = (() => {
    const PERMISSIONS = {
      admin: ['panel', 'cocina', 'mesero', 'cliente', 'mesas', 'usuarios'],
      mesero: ['mesero', 'mesas'],
      cocina: ['cocina'],
      cliente: ['cliente']
    };
  
    let currentSession = null;
  
    return {
      async login(username, password) {
        const db = await StorageModule.initDB();
        const passHash = await StorageModule.hashString(password);
        
        const user = db.users.find(u => u.username === username && u.passwordHash === passHash);
        if (!user) throw new Error('Usuario o contraseña incorrectos.');
  
        const token = await StorageModule.generateJWT({
          sub: user.id,
          username: user.username,
          role: user.role,
          name: user.name
        });

        currentSession = {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          token
        };

        StorageModule.setSession(currentSession);
        return currentSession;
      },
      logout() {
        currentSession = null;
        StorageModule.clearSession();
      },
      getUserSession() {
        if (!currentSession) currentSession = StorageModule.getSession();
        return currentSession;
      },
      async restoreSession() {
        const session = this.getUserSession();
        if (!session?.token) return null;

        const payload = await StorageModule.verifyJWT(session.token);
        if (!payload) {
          this.logout();
          return null;
        }

        return {
          ...session,
          role: payload.role || session.role,
          name: payload.name || session.name,
          username: payload.username || session.username
        };
      },
      hasPermission(viewName) {
        const session = this.getUserSession();
        if (!session) return false;
        return (PERMISSIONS[session.role] || []).includes(viewName);
      }
    };
  })();