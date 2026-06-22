// src/views/login.js
import { login } from "../services/authService.js";
import { navigateTo, resetCurrentView } from "../router.js";
import { getCurrentUser } from "../services/authService.js";
import toast from "../utils/toast.js";
import { checkAuth } from "../utils/page-loader.js";
import { addPasswordToggle } from "../utils/password-toggle.js";

export default function setupLogin() {
  // Limpiar cualquier intervalo anterior de Google Auth que pueda estar ejecutándose
  if (window.googleAuthCheckInterval) {
    clearInterval(window.googleAuthCheckInterval);
    delete window.googleAuthCheckInterval;
  }

  // Limpiar cualquier intervalo del dashboard que pueda estar ejecutándose
  if (window.dashboardIntervalId) {
    clearInterval(window.dashboardIntervalId);
    delete window.dashboardIntervalId;
    console.log("Intervalos del dashboard limpiados en login");
  }

  // Verificar si ya hay una sesión activa y redirigir si es necesario
  if (!checkAuth(false)) {
    // Si hay sesión, checkAuth ya redirigió al dashboard
    return;
  }
  // Referencias a elementos del DOM
  const form = document.getElementById("login-form");
  const submitButton = document.getElementById("login-button");
  const buttonText = document.getElementById("button-text");
  const spinner = document.getElementById("spinner");

  // Referencias a campos de entrada
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  // Referencias a contenedores de errores
  const emailError = document.getElementById("email-error");
  const passwordError = document.getElementById("password-error");

  // Verificar mensaje de logout
  const logoutMessage = localStorage.getItem("logout_message");
  if (logoutMessage) {
    toast.success(logoutMessage);
    localStorage.removeItem("logout_message");
  }

  // Verificar si ya hay una sesión activa y redirigir si es necesario
  const checkExistingSession = () => {
    const token = localStorage.getItem("token");
    if (token) {
      // Verificar si el token es válido
      try {
        const tokenData = JSON.parse(atob(token.split(".")[1]));
        const expirationTime = tokenData.exp * 1000; // Convertir a milisegundos

        if (Date.now() < expirationTime) {
          // El token es válido, redirigir al dashboard
          navigateTo("dashboard");
          return true;
        } else {
          // El token ha expirado, limpiarlo
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          toast.warning(
            "Tu sesión ha expirado. Por favor, inicia sesión de nuevo."
          );
        }
      } catch (e) {
        console.error("Error al verificar el token:", e);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    return false;
  };

  // Verificar sesión al cargar
  if (checkExistingSession()) {
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

    // RFC 5322 regex para validar email
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

    if (value.length === 0) {
      showError(input, errorElement, "El correo electrónico es obligatorio");
      return false;
    }

    if (!emailRegex.test(value)) {
      showError(
        input,
        errorElement,
        "Por favor, ingresa un correo electrónico válido"
      );
      return false;
    }

    markValid(input);
    return true;
  }

  // Validación de contraseña
  function validatePassword(input, errorElement) {
    const value = input.value;

    if (value.length === 0) {
      showError(input, errorElement, "La contraseña es obligatoria");
      return false;
    }

    markValid(input);
    return true;
  }

  // Función para validar todos los campos
  function validateAll() {
    const isEmailValid = validateEmail(emailInput, emailError);
    const isPasswordValid = validatePassword(passwordInput, passwordError);

    return isEmailValid && isPasswordValid;
  }

  // Limpiar errores cuando el usuario escribe (sin mostrar errores nuevos)
  emailInput.addEventListener("input", () => {
    clearError(emailInput, emailError);
  });

  passwordInput.addEventListener("input", () => {
    clearError(passwordInput, passwordError);
  });

  // Event listener para el envío del formulario
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Validar todos los campos antes de enviar (mostrar errores solo aquí)
    if (!validateAll()) {
      return;
    }

    // Mostrar spinner y cambiar texto del botón
    buttonText.textContent = "Iniciando sesión...";
    spinner.classList.remove("hidden");
    submitButton.disabled = true;

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    try {
      console.log("Intentando iniciar sesión con:", { email });

      const res = await login(email, password);
      console.log("Respuesta del servidor:", res);

      // Guardamos token y usuario en localStorage
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));

      // Mostrar toast de éxito
      toast.success(`¡Bienvenido, ${res.user.firstName}!`);

      // Resetear vista actual para forzar recarga del dashboard
      resetCurrentView();

      // Redirigir inmediatamente con recarga forzada
      setTimeout(() => {
        navigateTo("dashboard", true);
      }, 100);
    } catch (err) {
      console.error("Login error:", err);

      // Restablecer botón
      buttonText.textContent = "Iniciar sesión";
      spinner.classList.add("hidden");
      submitButton.disabled = false;

      // Manejar errores específicos según el código HTTP
      if (err.message && err.message.includes("401")) {
        showError(emailInput, emailError, "Correo o contraseña inválidos");
        showError(
          passwordInput,
          passwordError,
          "Correo o contraseña inválidos"
        );
        toast.error("Correo o contraseña inválidos");
      } else if (err.message && err.message.includes("423")) {
        toast.error("Cuenta temporalmente bloqueada");
      } else if (err.message && err.message.includes("429")) {
        toast.error(
          "Demasiados intentos de inicio de sesión. Inténtalo más tarde."
        );
      } else if (err.message && /5\d\d/.test(err.message)) {
        // Error 5xx - Error del servidor
        toast.error("Error del servidor. Por favor, inténtalo más tarde");

        // En modo dev, mostrar en consola
        if (process.env.NODE_ENV !== "production") {
          console.error("Server error details:", err);
        }
      } else {
        toast.error("Ocurrió un error. Por favor, inténtalo de nuevo.");
      }
    }
  });

  // Navegar a signup
  const goSignupBtn = document.getElementById("go-signup");
  if (goSignupBtn) {
    goSignupBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Botón go-signup clickeado, navegando a signup...");
      // Limpiar intervalos antes de navegar
      if (window.cleanupLoginIntervals) {
        window.cleanupLoginIntervals();
      }
      navigateTo("signup", true);
    });
  } else {
    console.error("Elemento go-signup no encontrado en login.js");
  }

  // Navegar a recovery
  const goRecoveryBtn = document.getElementById("go-recovery");
  if (goRecoveryBtn) {
    goRecoveryBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Botón go-recovery clickeado, navegando a recovery...");
      // Limpiar intervalos antes de navegar
      if (window.cleanupLoginIntervals) {
        window.cleanupLoginIntervals();
      }
      navigateTo("recovery", true);
    });
  } else {
    console.error("Elemento go-recovery no encontrado en login.js");
  }

  // Navegar al home
  const goHomeButton = document.getElementById("go-home");
  if (goHomeButton) {
    goHomeButton.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Botón go-home clickeado, navegando a home...");
      // Limpiar intervalos antes de navegar
      if (window.cleanupLoginIntervals) {
        window.cleanupLoginIntervals();
      }
      // Usar navegación forzada para asegurar que se cargue el home
      navigateTo("home", true);
    });
  } else {
    console.error("Botón go-home no encontrado en login");
  }

  // Botón de login con Google - COMENTADO: OAuth de Google deshabilitado
  /*
  document.querySelector(".google-login").addEventListener("click", () => {
    // URL específica para Google Auth (usar la URL correcta según el entorno)
    const isProduction = window.location.hostname !== "localhost";
    const baseUrl = isProduction
      ? "https://tidytasks-80b95fdaeb61.herokuapp.com"
      : "http://localhost:3001";
    const googleAuthUrl = `${baseUrl}/api/auth/google`;

    // Mostrar spinner durante la autenticación
    buttonText.textContent = "Autenticando...";
    spinner.classList.remove("hidden");
    submitButton.disabled = true;

    // Crear ventana de autenticación
    const authWindow = window.open(
      googleAuthUrl,
      "googleAuth",
      "width=600,height=700,top=100,left=100"
    );

    // Configurar listener para mensajes de la ventana emergente
    const messageListener = function (event) {
      // Verificar que el mensaje sea de autenticación exitosa
      if (event.data && event.data.type === "AUTH_SUCCESS") {
        window.removeEventListener("message", messageListener);
        clearInterval(checkAuth);

        const user = event.data.user;
        if (user) {
          console.log("Autenticación con Google exitosa");
          toast.success(`¡Bienvenido, ${user.firstName}!`);
          // Resetear vista actual para forzar recarga
          resetCurrentView();
          setTimeout(() => {
            navigateTo("dashboard", true);
          }, 100);
        }
      }
    };

    window.addEventListener("message", messageListener);

    // Verificador simple que comprueba el token
    const checkAuth = setInterval(() => {
      const token = localStorage.getItem("token");

      if (token) {
        clearInterval(checkAuth);
        window.removeEventListener("message", messageListener);

        try {
          const user = JSON.parse(localStorage.getItem("user"));
          console.log(
            "Autenticación con Google exitosa a través de localStorage"
          );
          toast.success(`¡Bienvenido, ${user.firstName}!`);
          // Resetear vista actual para forzar recarga
          resetCurrentView();
          setTimeout(() => {
            navigateTo("dashboard", true);
          }, 100);
        } catch (e) {
          console.error("Error al procesar datos de usuario:", e);
          buttonText.textContent = "Iniciar sesión";
          spinner.classList.add("hidden");
          submitButton.disabled = false;
          toast.error("Error al procesar la autenticación");
        }
        return;
      }

      // Verificar si la ventana se cerró
      try {
        if (authWindow && authWindow.closed) {
          clearInterval(checkAuth);
          window.removeEventListener("message", messageListener);

          // Restaurar botón si no hay token
          if (!localStorage.getItem("token")) {
            buttonText.textContent = "Iniciar sesión";
            spinner.classList.add("hidden");
            submitButton.disabled = false;
          }
        }
      } catch (e) {
        // Ignorar errores COOP
      }
    }, 1000);

    // Timeout de seguridad
    setTimeout(() => {
      clearInterval(checkAuth);
      window.removeEventListener("message", messageListener);

      if (!localStorage.getItem("token")) {
        buttonText.textContent = "Iniciar sesión";
        spinner.classList.add("hidden");
        submitButton.disabled = false;
        toast.warning("Autenticación cancelada");
      }
    }, 30000);
  });
  */

  // Función para limpiar intervalos cuando el usuario navega fuera de login
  window.cleanupLoginIntervals = function () {
    if (window.googleAuthCheckInterval) {
      clearInterval(window.googleAuthCheckInterval);
      delete window.googleAuthCheckInterval;
      console.log("Intervalos de Google Auth limpiados");
    }
    if (window.dashboardIntervalId) {
      clearInterval(window.dashboardIntervalId);
      delete window.dashboardIntervalId;
      console.log("Intervalos del dashboard limpiados");
    }
  };

  // Inicializar toggle de contraseña
  addPasswordToggle("password");

  // Footer is now handled automatically by the router
}
