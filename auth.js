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
  
        currentSession = {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name
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
      hasPermission(viewName) {
        const session = this.getUserSession();
        if (!session) return false;
        return (PERMISSIONS[session.role] || []).includes(viewName);
      }
    };
  })();