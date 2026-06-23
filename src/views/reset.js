// src/views/reset.js
import { resetPassword } from "../services/authService.js";
import { navigateTo } from "../router.js";
import toast from "../utils/toast.js";
import { addPasswordToggle } from "../utils/password-toggle.js";

export default function setupReset() {
  console.log("Configurando página de restablecimiento");

  // Obtener el token de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  console.log("Token de restablecimiento desde URL:", token);

  if (!token) {
    console.log("No se encontró token, mostrando mensaje de error");
    showTokenError(
      "Token de restablecimiento inválido o faltante. Por favor solicita un nuevo enlace de recuperación."
    );
    return;
  }

  // Establecer el token en el campo oculto
  const tokenInput = document.getElementById("reset-token");
  if (tokenInput) {
    tokenInput.value = token;
  } else {
    console.error("Campo de token de restablecimiento no encontrado");
  }

  // Obtener elementos del DOM
  const form = document.getElementById("reset-password-form");
  const resetButton = document.getElementById("reset-button");
  const buttonText = document.getElementById("button-text");
  const spinner = document.getElementById("spinner");
  const newPasswordInput = document.getElementById("new-password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const newPasswordError = document.getElementById("new-password-error");
  const confirmPasswordError = document.getElementById(
    "confirm-password-error"
  );

  if (!form) {
    console.error("Formulario de restablecimiento no encontrado");
    return;
  }

  // Función para mostrar error en un campo
  function showError(input, errorElement, message) {
    input.classList.remove("valid");
    input.classList.add("error");
    errorElement.textContent = message;
    errorElement.classList.add("visible");
  }

  // Función para limpiar error en un campo
  function clearError(input, errorElement) {
    input.classList.remove("error");
    errorElement.textContent = "";
    errorElement.classList.remove("visible");
  }

  // Función para marcar un campo como válido
  function markValid(input) {
    clearError(input, document.getElementById(`${input.id}-error`));
    input.classList.add("valid");
  }

  // Validación de contraseña
  function validatePassword(input, errorElement) {
    const value = input.value;

    if (value.length === 0) {
      showError(input, errorElement, "La contraseña es obligatoria");
      return false;
    }

    if (value.length < 8) {
      showError(
        input,
        errorElement,
        "La contraseña debe tener al menos 8 caracteres"
      );
      return false;
    }

    // Debe contener al menos una mayúscula
    if (!/[A-Z]/.test(value)) {
      showError(
        input,
        errorElement,
        "La contraseña debe contener al menos una letra mayúscula"
      );
      return false;
    }

    // Debe contener al menos una minúscula
    if (!/[a-z]/.test(value)) {
      showError(
        input,
        errorElement,
        "La contraseña debe contener al menos una letra minúscula"
      );
      return false;
    }

    // Debe contener al menos un número
    if (!/[0-9]/.test(value)) {
      showError(
        input,
        errorElement,
        "La contraseña debe contener al menos un número"
      );
      return false;
    }

    // Debe contener al menos un carácter especial
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
      showError(
        input,
        errorElement,
        "La contraseña debe contener al menos un carácter especial"
      );
      return false;
    }

    markValid(input);
    return true;
  }

  // Validación de confirmación de contraseña
  function validateConfirmPassword(input, errorElement) {
    const confirmValue = input.value;
    const passwordValue = newPasswordInput.value;

    if (confirmValue.length === 0) {
      showError(input, errorElement, "Por favor confirme su contraseña");
      return false;
    }

    if (confirmValue !== passwordValue) {
      showError(input, errorElement, "Las contraseñas no coinciden");
      return false;
    }

    markValid(input);
    return true;
  }

  // Validar todos los campos
  function validateAll() {
    const isPasswordValid = validatePassword(
      newPasswordInput,
      newPasswordError
    );
    const isConfirmPasswordValid = validateConfirmPassword(
      confirmPasswordInput,
      confirmPasswordError
    );

    return isPasswordValid && isConfirmPasswordValid;
  }

  // Event listeners para limpiar errores mientras se escribe
  newPasswordInput.addEventListener("input", () => {
    clearError(newPasswordInput, newPasswordError);
    // Si el campo de confirmación ya tiene contenido, limpiar su error también
    if (confirmPasswordInput.value.length > 0) {
      clearError(confirmPasswordInput, confirmPasswordError);
    }
  });

  confirmPasswordInput.addEventListener("input", () => {
    clearError(confirmPasswordInput, confirmPasswordError);
  });

  // Navegar a login
  document.getElementById("go-login").addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("login");
  });

  // Manejar envío del formulario
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Formulario de restablecimiento enviado");

    // Validar todos los campos antes de enviar
    if (!validateAll()) {
      return;
    }

    // Mostrar spinner y deshabilitar botón
    buttonText.textContent = "Restableciendo...";
    spinner.classList.remove("hidden");
    resetButton.disabled = true;

    const startTime = Date.now();
    const newPassword = newPasswordInput.value;

    try {
      console.log("Enviando solicitud de restablecimiento con token");

      // Simular tiempo mínimo de procesamiento
      const response = await resetPassword(token, newPassword);
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 1000 - elapsedTime);

      await new Promise((resolve) => setTimeout(resolve, remainingTime));

      console.log("Respuesta de restablecimiento:", response);

      if (
        response &&
        (response.success || response.message === "Password reset successful")
      ) {
        // Mostrar mensaje de éxito
        toast.success("¡Contraseña restablecida exitosamente!");

        // Limpiar formulario
        form.reset();
        clearError(newPasswordInput, newPasswordError);
        clearError(confirmPasswordInput, confirmPasswordError);

        // Redirigir al login después de un breve momento
        setTimeout(() => {
          toast.info("Redirigiendo al inicio de sesión...");
          setTimeout(() => {
            navigateTo("login");
          }, 1500);
        }, 1000);
      } else {
        // Manejar token expirado/inválido
        if (
          response &&
          response.message &&
          (response.message.includes("expired") ||
            response.message.includes("invalid") ||
            response.message.includes("token"))
        ) {
          showTokenError(
            "Tu enlace de restablecimiento ha expirado o es inválido. Por favor solicita uno nuevo."
          );
          return;
        }

        // Mostrar mensaje de error
        const message =
          (response && response.message) ||
          "Error al restablecer la contraseña. Por favor intenta nuevamente.";

        toast.error(message);
      }
    } catch (error) {
      console.error("Error en restablecimiento:", error);

      const errorMessage =
        error.message || "Ocurrió un error. Por favor intenta más tarde.";

      if (
        errorMessage.includes("expired") ||
        errorMessage.includes("invalid")
      ) {
        showTokenError(
          "Tu enlace de restablecimiento ha expirado o es inválido. Por favor solicita uno nuevo."
        );
      } else if (errorMessage.includes("500")) {
        toast.error("Error del servidor. Por favor intenta más tarde.");
      } else {
        toast.error(
          "Error de conexión. Por favor verifica tu conexión e intenta nuevamente."
        );
      }
    } finally {
      // Restablecer botón
      buttonText.textContent = "Restablecer contraseña";
      spinner.classList.add("hidden");
      resetButton.disabled = false;
    }
  });

  // Mostrar error de token (expirado o inválido)
  function showTokenError(message) {
    // Ocultar el formulario
    form.style.display = "none";

    // Crear mensaje de error y enlace a recovery
    const errorContainer = document.createElement("div");
    errorContainer.className = "error-container";
    errorContainer.innerHTML = `
      <div class="alert alert-error">
        <h3>Token inválido</h3>
        <p>${message}</p>
        <p>Puedes ir a la <a href="#" id="go-recovery-link">página de recuperación</a> para solicitar un nuevo enlace.</p>
        <button class="login-button" id="back-to-recovery">Ir a recuperación</button>
      </div>
    `;

    // Insertar después del formulario
    form.parentNode.insertBefore(errorContainer, form.nextSibling);

    // Agregar event listeners para los enlaces
    document
      .getElementById("go-recovery-link")
      .addEventListener("click", (e) => {
        e.preventDefault();
        navigateTo("recovery");
      });

    document
      .getElementById("back-to-recovery")
      .addEventListener("click", (e) => {
        e.preventDefault();
        navigateTo("recovery");
      });

    // Mostrar notificación toast
    toast.error(message);
  }

  // Inicializar toggles de contraseña
  addPasswordToggle("new-password");
  addPasswordToggle("confirm-password");

  // Footer is now handled automatically by the router
}
