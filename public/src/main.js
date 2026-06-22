import { handleRouting } from "./router.js";
// import "./utils/google-auth-handler.js"; // Comentado: manejador de autenticación de Google deshabilitado
import toast from "./utils/toast.js"; // Importar el sistema de toast
import footerManager from "./utils/footer-manager.js"; // Importar el gestor del footer

// Exponer sistema de toast globalmente
window.toast = toast;

// Exponer gestor del footer globalmente para uso en vistas
window.footerManager = footerManager;

// Para depuración
console.log("Aplicación iniciada");

// Verificar si hay una redirección pendiente desde autenticación
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM cargado, iniciando routing");

  // Forzar scroll al top al cargar la página
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  const needsDashboardRedirect = localStorage.getItem(
    "needs_dashboard_redirect"
  );

  if (needsDashboardRedirect === "true") {
    console.log("Detectada redirección pendiente al dashboard");
    localStorage.removeItem("needs_dashboard_redirect");
  }

  // Inicializar el routing
  handleRouting();
});

// También manejar casos donde el DOM ya está cargado
if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  console.log("DOM ya está cargado, iniciando routing inmediatamente");
  // Forzar scroll al top
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  handleRouting();
}

// Manejar el evento de carga completa de la ventana
window.addEventListener("load", () => {
  console.log("Ventana completamente cargada");
  // Forzar scroll al top después de la carga completa
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
});

// Prevenir el comportamiento de scroll restore del navegador
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
