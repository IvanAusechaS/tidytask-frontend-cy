// Maneja la redirección desde Google Auth
import { navigateTo } from "../router.js";

document.addEventListener("DOMContentLoaded", () => {
  // Comprobar si hay datos en la respuesta JSON
  const contentText = document.body.textContent;
  if (
    contentText &&
    contentText.includes('"token"') &&
    contentText.includes('"user"')
  ) {
    try {
      // Intenta parsear la respuesta JSON
      const jsonStartIndex = contentText.indexOf("{");
      const jsonEndIndex = contentText.lastIndexOf("}") + 1;
      const jsonStr = contentText.substring(jsonStartIndex, jsonEndIndex);

      const data = JSON.parse(jsonStr);

      // Si la respuesta tiene un token y datos de usuario, guárdalos
      if (data.token && data.user) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Redirigir al dashboard
        console.log("Login exitoso con Google, redirigiendo al dashboard");
        setTimeout(() => {
          navigateTo("dashboard");
        }, 1000);
      }
    } catch (error) {
      console.error("Error procesando respuesta JSON:", error);
      // En caso de error, redirigir a login
      setTimeout(() => {
        navigateTo("login");
      }, 1000);
    }
  }
});
