// Importar utilidades para mejorar la carga de páginas
import { ensurePageLoaded } from "./utils/page-loader.js";

// Variable para trackear la vista actual y evitar recargas innecesarias
let currentView = null;

// Función para resetear la vista actual (útil para forzar navegación)
export function resetCurrentView() {
  currentView = null;
}

// Función para obtener la vista actual
export function getCurrentView() {
  return currentView;
}

// Función para obtener la ruta actual
function getCurrentRoute() {
  const path = window.location.pathname;
  const hash = window.location.hash.slice(1);

  // Extraer solo el path sin query parameters
  const cleanPath = path.split("?")[0].slice(1);
  const cleanHash = hash.split("?")[0];

  console.log("Path detectado:", path, "Hash detectado:", hash);

  // Si estamos en la raíz y hay un token, ir al dashboard directamente
  if (
    (cleanPath === "" || cleanPath === "index.html") &&
    localStorage.getItem("token")
  ) {
    return "dashboard";
  }

  // Si estamos en la raíz y no hay token, mostrar la landing page (home)
  if (cleanPath === "" || cleanPath === "index.html") {
    return "home";
  }

  // Manejar específicamente la ruta profile/edit
  if (cleanPath === "profile/edit" || cleanHash === "profile/edit") {
    return "profile/edit";
  }

  return cleanHash || cleanPath || "home";
}

// Función para obtener query parameters
function getQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams;
}

// Función para manejar las rutas
export function handleRouting() {
  // Evitar ejecutar si estamos en medio de una navegación programática
  if (window.navigatingProgrammatically) {
    console.log("Navegación programática en curso, saltando handleRouting");
    return;
  }

  const route = getCurrentRoute();
  const queryParams = getQueryParams();

  console.log("Current route:", route);
  console.log("Query params:", Object.fromEntries(queryParams));

  // Mapeo de rutas
  const routeMap = {
    "/": "home",
    "": "home",
    home: "home",
    login: "login",
    signup: "signup",
    recovery: "recovery",
    reset: "reset",
    dashboard: "dashboard",
    "auth-callback": "auth-callback",
    profile: "profile",
    "profile/edit": "profile-edit",
  };

  const viewName = routeMap[route] || "login";

  console.log(`Debug: route = '${route}', viewName = '${viewName}'`);

  // Verificación especial para reset - debe tener token
  if (viewName === "reset") {
    const token = queryParams.get("token");
    if (!token) {
      console.warn(
        "Reset route accessed without token, redirecting to recovery"
      );
      navigateTo("recovery");
      return;
    }
  }

  navigateTo(viewName);
}

// Función para navegar programáticamente
export function navigate(route, forceReload = false) {
  // Resetear vista actual ya que vamos a navegar a una nueva
  currentView = null;

  // Aplicar mapeo de rutas
  const routeMap = {
    "/": "home",
    "": "home",
    home: "home",
    login: "login",
    signup: "signup",
    recovery: "recovery",
    reset: "reset",
    dashboard: "dashboard",
    "auth-callback": "auth-callback",
    profile: "profile",
    "profile/edit": "profile-edit",
    "profile-edit": "profile-edit",
  };

  const viewName = routeMap[route] || route; // Si no hay mapeo, usar la ruta original

  console.log(`Navigate: route = '${route}', viewName = '${viewName}'`);

  // Actualizar la URL - mantener la ruta original para profile/edit
  const urlRoute = route === "profile-edit" ? "profile/edit" : route;
  history.pushState({}, "", `/${urlRoute}`);
  // Cargar la vista con el nombre correcto
  navigateTo(viewName, forceReload);
}

// Función para cargar vistas dinámicamente
export async function navigateTo(viewName, forceReload = false) {
  try {
    // Evitar recargar la misma vista SOLO si no es una recarga forzada
    if (currentView === viewName && !forceReload) {
      console.log(`Vista ${viewName} ya está cargada, evitando recarga`);
      return;
    }

    // Marcar que estamos navegando programáticamente
    window.navigatingProgrammatically = true;

    console.log(`Intentando cargar vista: ${viewName}`);
    console.log(`URL actual antes del cambio: ${window.location.pathname}`);

    // Verificar si tenemos token válido para rutas protegidas
    const protectedRoutes = ["dashboard", "profile", "profile-edit"];
    if (protectedRoutes.includes(viewName)) {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn(
          `Intentando acceder a ${viewName} sin token, redirigiendo a login`
        );
        // Cambiar viewName en lugar de hacer llamada recursiva
        viewName = "login";
      }
    }

    // Actualizar la URL del navegador para mantener sincronía
    let newUrl;
    if (viewName === "home") {
      newUrl = "/";
    } else if (viewName === "profile-edit") {
      newUrl = "/profile/edit";
    } else {
      newUrl = `/${viewName}`;
    }

    if (window.location.pathname !== newUrl) {
      console.log(
        `Actualizando URL de ${window.location.pathname} a ${newUrl}`
      );
      history.pushState({}, "", newUrl);
      console.log(`URL actualizada: ${window.location.pathname}`);
    } else {
      console.log(`URL ya está correcta: ${newUrl}`);
    }

    // Convertir a formato de archivo (primera letra minúscula)
    const fileViewName = viewName.charAt(0).toLowerCase() + viewName.slice(1);

    console.log(
      `Debug: viewName = ${viewName}, fileViewName = ${fileViewName}`
    );

    // Caso especial para auth-callback
    if (viewName === "auth-callback") {
      // Redireccionar a la página completa, no como una SPA
      window.location.href = "/public/src/views/auth-callback.html";
      return;
    }

    // Cargar la vista desde public/src/views
    let res;
    try {
      res = await fetch(`/src/views/${fileViewName}.html`);
      if (!res.ok) throw new Error(`Vista no encontrada: ${fileViewName}`);
    } catch (e) {
      console.error("Error al cargar vista:", e);
      throw new Error(`Error al cargar vista: ${e.message}`);
    }

    if (!res.ok) {
      throw new Error(`Error al cargar vista: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();

    // Extraer los enlaces CSS del contenido HTML (si hay alguno)
    const cssLinks = [];
    const linkRegex =
      /<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["']\s*\/?>/g;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      cssLinks.push(match[1]);
    }

    // Limpiar el HTML de los enlaces CSS
    const cleanHtml = html.replace(
      /<link\s+rel=["']stylesheet["']\s+href=["'][^"']+["']\s*\/?>/g,
      ""
    );

    // Obtener el contenedor de la aplicación
    const appContainer = document.querySelector("#app");
    if (!appContainer) {
      console.error("No se encontró el contenedor #app");
      throw new Error("No se encontró el contenedor #app");
    }

    // Aplicar el HTML limpio
    appContainer.innerHTML = cleanHtml;
    console.log(`Vista ${viewName} cargada correctamente`);

    // Forzar scroll al top inmediatamente después de cargar el contenido
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Agregar los enlaces CSS extraídos al head del documento
    if (cssLinks.length > 0) {
      cssLinks.forEach((href) => {
        // Verificar si el link ya existe para evitar duplicados
        const existingLink = document.querySelector(`link[href="${href}"]`);
        if (!existingLink) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = href;
          document.head.appendChild(link);
          console.log(`CSS agregado: ${href}`);
        }
      });
    }

    // Importa el script asociado a la vista
    try {
      console.log(`Intentando cargar script: ./views/${fileViewName}.js`);
      // Solo limpiar caché si es necesario (por ejemplo, en desarrollo)
      const isDevelopment =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const moduleUrl = isDevelopment
        ? `./views/${fileViewName}.js?v=${Date.now()}`
        : `./views/${fileViewName}.js`;

      const module = await import(moduleUrl);

      if (module.default) {
        console.log(`Ejecutando setup de ${viewName}`);
        module.default(); // Ejecuta setup si existe

        // Actualizar vista actual después de carga exitosa
        currentView = viewName;

        // Re-initialize footer after view is loaded
        if (window.footerManager && window.footerManager.shouldShowFooter()) {
          setTimeout(() => {
            window.footerManager.handleNavigation(viewName);
          }, 50);
        }

        // Asegurar scroll al top después de la carga del script
        setTimeout(() => {
          window.scrollTo(0, 0);
        }, 100);
      }
    } catch (error) {
      console.error(`Error al cargar script de ${viewName}:`, error);
    }
  } catch (error) {
    console.error(`No se pudo cargar la vista: ${viewName}`, error);
    document.querySelector(
      "#app"
    ).innerHTML = `<h2>Error al cargar ${viewName}</h2><p>${error.message}</p>`;
  } finally {
    // Desmarcar la bandera de navegación programática
    setTimeout(() => {
      window.navigatingProgrammatically = false;
      // Scroll final para asegurar posición
      window.scrollTo(0, 0);
    }, 100);
  }
}

// Escuchar cambios en el historial del navegador
window.addEventListener("popstate", () => {
  // Forzar scroll al top en navegación del historial
  window.scrollTo(0, 0);
  handleRouting();
});

// Inicializar el routing cuando se carga la página
document.addEventListener("DOMContentLoaded", handleRouting);

// Asegurarse de que el routing también se ejecute si el DOM ya estaba cargado
if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  // Evitar interferir con navegación manual, solo ejecutar al cargar inicialmente
  if (!window.routerInitialized) {
    setTimeout(handleRouting, 100);
    window.routerInitialized = true;
  }
}
