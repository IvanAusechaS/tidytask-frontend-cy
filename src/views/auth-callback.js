// Creamos un método simple para extraer JSON de texto plano
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

// Cuando la página se carga
document.addEventListener("DOMContentLoaded", function () {
  // Si hay texto en el body que parece un JSON
  const bodyText = document.body.textContent.trim();

  if (bodyText.includes('"token"') && bodyText.includes('"user"')) {
    console.log("Encontrado texto que parece JSON de autenticación");

    const data = extractJsonFromText(bodyText);

    if (data && data.token && data.user) {
      console.log("Datos de autenticación extraídos correctamente");

      // Guardar los datos
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Mostrar mensaje
      const messageElement = document.createElement("div");
      messageElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 20px;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        text-align: center;
        font-family: 'Poppins', sans-serif;
      `;

      messageElement.innerHTML = `
        <h2>¡Autenticación exitosa!</h2>
        <p>Bienvenido, ${data.user.firstName}!</p>
        <p>Redireccionando al dashboard...</p>
      `;

      document.body.appendChild(messageElement);

      // Redirigir después de un momento
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    }
  }
});
