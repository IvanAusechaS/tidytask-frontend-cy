//
// Función para manejar la autenticación de Google evitando errores COOP
// Esta solución debe utilizarse en lugar del código anterior que abre la ventana directamente
//
export function initiateGoogleAuth(googleAuthUrl) {
  // Configurar parámetros de la ventana
  const width = 600;
  const height = 700;
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;
  
  // Crear URL con parámetros para evitar problemas COOP
  const authUrl = new URL(googleAuthUrl);
  authUrl.searchParams.append('redirect_client', window.location.origin);
  authUrl.searchParams.append('timestamp', Date.now());
  
  // Almacenar información del intento de autenticación
  localStorage.setItem('google_auth_attempt', Date.now().toString());
  localStorage.setItem('auth_session_id', Math.random().toString(36).substring(2, 15));
  
  // 1. Abrir la ventana con opener=null para evitar errores COOP
  const authWindow = window.open(
    authUrl.toString(),
    '_blank',
    `width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`
  );
  
  return {
    authWindow,
    checkAuthStatus: function(callback) {
      // Configurar un intervalo para verificar el estado de autenticación
      const authCheckInterval = setInterval(() => {
        const token = localStorage.getItem('token');
        const authAttemptTime = parseInt(localStorage.getItem('google_auth_attempt') || '0');
        const currentTime = Date.now();
        
        // Si hay un token nuevo y está dentro de la ventana de tiempo relevante
        if (token && currentTime - authAttemptTime < 30000) {
          clearInterval(authCheckInterval);
          try {
            const user = JSON.parse(localStorage.getItem('user'));
            callback(null, user);
          } catch (e) {
            callback(new Error('Error processing user data'), null);
          }
        }
        
        // No intentamos verificar si la ventana está cerrada para evitar errores COOP
        
      }, 1000);
      
      // Configurar un timeout para cancelar la verificación después de 30 segundos
      setTimeout(() => {
        clearInterval(authCheckInterval);
        callback(new Error('Authentication timeout'), null);
      }, 30000);
      
      return authCheckInterval;
    }
  };
}
