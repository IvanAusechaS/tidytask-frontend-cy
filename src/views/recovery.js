// src/views/recovery.js
import { sendPasswordResetEmail } from "../services/authService.js";
import { navigateTo } from "../router.js";
import toast from "../utils/toast.js";

export default function setupRecovery() {
  console.log("Configurando página de recuperación");

  // Referencias a elementos del DOM
  const form = document.getElementById("recovery-form");
  const submitButton = document.getElementById("recovery-button");
  const buttonText = document.getElementById("button-text");
  const spinner = document.getElementById("spinner");
  const emailInput = document.getElementById("email");
  const emailError = document.getElementById("email-error");

  if (!form) {
    console.error("Formulario de recuperación no encontrado");
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

  // Validación de email
  function validateEmail(input, errorElement) {
    const value = input.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (value.length === 0) {
      showError(input, errorElement, "El correo electrónico es obligatorio");
      return false;
    }

    if (!emailRegex.test(value)) {
      showError(
        input,
        errorElement,
        "Por favor ingrese un correo electrónico válido"
      );
      return false;
    }

    markValid(input);
    return true;
  }

  // Limpiar errores cuando el usuario escribe
  emailInput.addEventListener("input", () => {
    clearError(emailInput, emailError);
  });

  // Event listener para el envío del formulario
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Validar email antes de enviar
    if (!validateEmail(emailInput, emailError)) {
      return;
    }

    const email = emailInput.value.trim();

    // Mostrar spinner y deshabilitar botón
    buttonText.textContent = "Enviando...";
    spinner.classList.remove("hidden");
    submitButton.disabled = true;

    try {
      console.log("Enviando solicitud de recuperación para:", email);

      // Simular un tiempo mínimo de procesamiento
      const startTime = Date.now();
      const result = await sendPasswordResetEmail(email);
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 1000 - elapsedTime);

      await new Promise((resolve) => setTimeout(resolve, remainingTime));

      console.log("Respuesta de recuperación:", result);

      if (result.success !== false) {
        // Mostrar mensaje de éxito
        toast.success(
          "¡Correo de recuperación enviado! Revisa tu bandeja de entrada."
        );

        // Limpiar formulario
        form.reset();
        clearError(emailInput, emailError);

        // Mostrar información adicional
        setTimeout(() => {
          toast.info(
            "Si no encuentras el correo, revisa tu carpeta de spam. El enlace expirará en 1 hora."
          );
        }, 2000);
      } else {
        toast.error(
          result.message || "Error al enviar el correo de recuperación"
        );
      }
    } catch (error) {
      console.error("Error en recovery:", error);

      if (error.message && error.message.includes("500")) {
        toast.error("Error del servidor. Por favor, inténtalo más tarde");
      } else {
        toast.error(
          "Error de conexión. Por favor, verifica tu conexión e inténtalo nuevamente"
        );
      }
    } finally {
      // Restablecer botón
      buttonText.textContent = "Enviar enlace de recuperación";
      spinner.classList.add("hidden");
      submitButton.disabled = false;
    }
  });

  // Navegar a login
  document.getElementById("go-login").addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("login");
  });

  // Footer is now handled automatically by the router
}
