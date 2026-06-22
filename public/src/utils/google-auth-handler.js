// Script para manejar la respuesta de autenticación de Google
// Este script se ejecutará en todas las páginas para capturar respuestas JSON inesperadas

document.addEventListener("DOMContentLoaded", function () {
  // Función para extraer JSON de texto plano
  function extractJsonFromText(text) {
    try {
      // Busca el primer '{'
      const start = text.indexOf("{");
      if (start === -1) return null;

      // Busca el último '}'
      const end = text.lastIndexOf("}") + 1;
      if (end === 0) return null;

      // Extrae el JSON y parsea
      const jsonStr = text.substring(start, end);
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Error extrayendo JSON:", e);
      return null;
    }
  }

  // Función para verificar si el contenido de la página es una respuesta JSON
  function checkForJsonResponse() {
    const bodyText = document.body.textContent.trim();

    // Si parece una respuesta JSON de autenticación con token y datos de usuario
    if (bodyText.includes('"token"') && bodyText.includes('"user"')) {
      console.log("Encontrado texto que parece JSON de autenticación");

      try {
        // Intenta extraer y parsear el JSON
        const data = extractJsonFromText(bodyText);

        // Si es una respuesta de autenticación válida
        if (data && data.token && data.user) {
          console.log("Datos de autenticación extraídos correctamente");

          // Guardar token y datos de usuario
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));

          // Comprobar si estamos en una ventana normal o emergente
          if (window.opener) {
            // Si es una ventana emergente, actualizar el timestamp para que la ventana principal sepa
            // que la autenticación fue exitosa
            try {
              window.opener.postMessage(
                {
                  type: "GOOGLE_AUTH_SUCCESS",
                  user: data.user,
                },
                "*"
              );
            } catch (e) {
              console.error("Error comunicando con ventana principal:", e);
            }

            // En cualquier caso, mostrar mensaje y cerrar
            createSuccessOverlay(data.user.firstName);

            setTimeout(() => {
              window.close();
            }, 2000);
          } else {
            // Si es una ventana normal, mostrar mensaje y redirigir al dashboard
            createSuccessOverlay(data.user.firstName);

            // Redirigir a la página json-response.html para procesamiento más limpio
            setTimeout(() => {
              // Guardar los datos en sessionStorage para que json-response.html pueda acceder a ellos
              sessionStorage.setItem("google_auth_data", JSON.stringify(data));
              window.location.href = "/views/json-response.html";
            }, 1000);
          }

          return true;
        }
      } catch (e) {
        console.error("Error procesando posible respuesta JSON:", e);
      }
    }

    return false;
  }

  // Función para crear el overlay de éxito
  function createSuccessOverlay(firstName) {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;

    const messageBox = document.createElement("div");
    messageBox.style.cssText = `
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      text-align: center;
      max-width: 400px;
    `;

    messageBox.innerHTML = `
      <h2 style="color: #4CAF50; margin-bottom: 16px;">¡Autenticación Exitosa!</h2>
      <p style="margin-bottom: 16px;">Bienvenido, ${firstName || "Usuario"}!</p>
      <p>Procesando información...</p>
    `;

    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);
  }

  // Escuchar mensajes de la ventana emergente (si somos la ventana principal)
  window.addEventListener("message", function (event) {
    if (event.data && event.data.type === "GOOGLE_AUTH_SUCCESS") {
      console.log(
        "Recibida confirmación de autenticación exitosa de la ventana emergente"
      );

      // Mostrar mensaje de bienvenida
      const user = event.data.user;
      if (user) {
        alert(`¡Bienvenido, ${user.firstName || "Usuario"}!`);

        // Navegar al dashboard si tenemos acceso a la función navigateTo
        if (window.navigateTo) {
          window.navigateTo("dashboard");
        } else {
          window.location.href = "/dashboard";
        }
      }
    }
  });

  // Comprobar si estamos en una página específica
  const path = window.location.pathname;
  const isGoogleCallback =
    path.includes("auth-callback") || path.includes("google-callback");
  const isMainPage = ["/login", "/signup", "/dashboard", "/recovery"].some(
    (page) => path.endsWith(page)
  );

  // Verificar respuesta JSON según el contexto
  if (isGoogleCallback) {
    console.log("Página de callback detectada, procesando respuesta...");
    setTimeout(checkForJsonResponse, 100);
  } else if (!isMainPage) {
    console.log("Verificando posible respuesta JSON en página no principal...");
    setTimeout(checkForJsonResponse, 100);
  }
});
