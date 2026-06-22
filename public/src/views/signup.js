// src/views/signup.js
import { signup } from "../services/authService.js";
import { navigateTo } from "../router.js";
// import { initiateGoogleAuth } from "../utils/safe-google-auth.js"; // Comentado: OAuth de Google deshabilitado
import toast from "../utils/toast.js";
import { addPasswordToggle } from "../utils/password-toggle.js";

export default function setupSignup() {
  // Limpiar cualquier intervalo de Google Auth que pueda estar ejecutándose desde login
  if (window.googleAuthCheckInterval) {
    clearInterval(window.googleAuthCheckInterval);
    delete window.googleAuthCheckInterval;
    console.log("Intervalos de Google Auth limpiados en signup");
  }

  // Limpiar cualquier intervalo del dashboard que pueda estar ejecutándose
  if (window.dashboardIntervalId) {
    clearInterval(window.dashboardIntervalId);
    delete window.dashboardIntervalId;
    console.log("Intervalos del dashboard limpiados en signup");
  }

  // Limpiar función de limpieza si existe
  if (window.cleanupLoginIntervals) {
    window.cleanupLoginIntervals();
  }

  // Limpiar cualquier timestamp de intento de Google Auth anterior
  localStorage.removeItem("google_auth_attempt");

  // Referencias a elementos del DOM
  const form = document.getElementById("signup-form");
  const submitButton = document.getElementById("signup-button");
  const buttonText = document.getElementById("button-text");
  const spinner = document.getElementById("spinner");

  // Referencias a campos de entrada
  const firstNameInput = document.getElementById("firstName");
  const lastNameInput = document.getElementById("lastName");
  const emailInput = document.getElementById("email");
  const ageInput = document.getElementById("age");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");

  // Referencias a contenedores de errores
  const firstNameError = document.getElementById("firstName-error");
  const lastNameError = document.getElementById("lastName-error");
  const emailError = document.getElementById("email-error");
  const ageError = document.getElementById("age-error");
  const passwordError = document.getElementById("password-error");
  const confirmPasswordError = document.getElementById("confirmPassword-error");

  // Bandera para controlar cuándo mostrar validaciones
  let hasAttemptedSubmit = false;

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

  // Validación de nombre
  function validateName(input, errorElement, showErrors = true) {
    const value = input.value.trim();

    if (value.length === 0) {
      if (showErrors && hasAttemptedSubmit) {
        showError(input, errorElement, "Este campo es obligatorio");
      }
      return false;
    }

    if (value.length < 2) {
      if (showErrors && hasAttemptedSubmit) {
        showError(
          input,
          errorElement,
          "El nombre debe tener al menos 2 caracteres"
        );
      }
      return false;
    }

    if (hasAttemptedSubmit) {
      markValid(input);
    }
    return true;
  }

  // Validación de email
  function validateEmail(input, errorElement, showErrors = true) {
    const value = input.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (value.length === 0) {
      if (showErrors && hasAttemptedSubmit) {
        showError(input, errorElement, "El email es obligatorio");
      }
      return false;
    }

    if (!emailRegex.test(value)) {
      if (showErrors && hasAttemptedSubmit) {
        showError(
          input,
          errorElement,
          "Por favor ingrese un correo electrónico válido"
        );
      }
      return false;
    }

    if (hasAttemptedSubmit) {
      markValid(input);
    }
    return true;
  }

  // Validación de edad
  function validateAge(input, errorElement, showErrors = true) {
    const value = input.value.trim();
    const age = parseInt(value);

    if (value.length === 0) {
      if (showErrors && hasAttemptedSubmit) {
        showError(input, errorElement, "La edad es obligatoria");
      }
      return false;
    }

    if (isNaN(age) || !Number.isInteger(age)) {
      if (showErrors && hasAttemptedSubmit) {
        showError(input, errorElement, "La edad debe ser un número entero");
      }
      return false;
    }

    if (age < 13) {
      if (showErrors && hasAttemptedSubmit) {
        showError(input, errorElement, "Debes tener al menos 13 años");
      }
      return false;
    }

    if (age > 100) {
      if (showErrors && hasAttemptedSubmit) {
        showError(
          input,
          errorElement,
          "La edad debe ser menor o igual a 100 años"
        );
      }
      return false;
    }

    if (hasAttemptedSubmit) {
      markValid(input);
    }
    return true;
  }

  // Validación de contraseña
  function validatePassword(input, errorElement, showErrors = true) {
    const value = input.value;

    if (value.length === 0) {
      if (showErrors && hasAttemptedSubmit) {
        showError(input, errorElement, "La contraseña es obligatoria");
      }
      return false;
    }

    if (value.length < 8) {
      if (showErrors && hasAttemptedSubmit) {
        showError(
          input,
          errorElement,
          "La contraseña debe tener al menos 8 caracteres"
        );
      }
      return false;
    }

    // Debe contener al menos una mayúscula
    if (!/[A-Z]/.test(value)) {
      if (showErrors && hasAttemptedSubmit) {
        showError(
          input,
          errorElement,
          "La contraseña debe contener al menos una letra mayúscula"
        );
      }
      return false;
    }

    // Debe contener al menos una minúscula
    if (!/[a-z]/.test(value)) {
      if (showErrors && hasAttemptedSubmit) {
        showError(
          input,
          errorElement,
          "La contraseña debe contener al menos una letra minúscula"
        );
      }
      return false;
    }

    // Debe contener al menos un número
    if (!/[0-9]/.test(value)) {
      if (showErrors && hasAttemptedSubmit) {
        showError(
          input,
          errorElement,
          "La contraseña debe contener al menos un número"
        );
      }
      return false;
    }

    // Debe contener al menos un carácter especial
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
      if (showErrors && hasAttemptedSubmit) {
        showError(
          input,
          errorElement,
          "La contraseña debe contener al menos un carácter especial"
        );
      }
      return false;
    }

    if (hasAttemptedSubmit) {
      markValid(input);
    }
    return true;
  }

  // Validación de confirmación de contraseña
  function validateConfirmPassword(input, errorElement, showErrors = true) {
    const confirmValue = input.value;
    const passwordValue = passwordInput.value;

    if (confirmValue.length === 0) {
      if (showErrors && hasAttemptedSubmit) {
        showError(input, errorElement, "Por favor confirme su contraseña");
      }
      return false;
    }

    if (confirmValue !== passwordValue) {
      if (showErrors && hasAttemptedSubmit) {
        showError(input, errorElement, "Las contraseñas no coinciden");
      }
      return false;
    }

    if (hasAttemptedSubmit) {
      markValid(input);
    }
    return true;
  }

  // Validar todos los campos
  function validateAll(showErrors = true) {
    const isFirstNameValid = validateName(
      firstNameInput,
      firstNameError,
      showErrors
    );
    const isLastNameValid = validateName(
      lastNameInput,
      lastNameError,
      showErrors
    );
    const isEmailValid = validateEmail(emailInput, emailError, showErrors);
    const isAgeValid = validateAge(ageInput, ageError, showErrors);
    const isPasswordValid = validatePassword(
      passwordInput,
      passwordError,
      showErrors
    );
    const isConfirmPasswordValid = validateConfirmPassword(
      confirmPasswordInput,
      confirmPasswordError,
      showErrors
    );

    return (
      isFirstNameValid &&
      isLastNameValid &&
      isEmailValid &&
      isAgeValid &&
      isPasswordValid &&
      isConfirmPasswordValid
    );
  }

  // Limpiar errores y validar en tiempo real solo después del primer intento
  firstNameInput.addEventListener("input", () => {
    clearError(firstNameInput, firstNameError);
    if (hasAttemptedSubmit) {
      validateName(firstNameInput, firstNameError);
    }
  });

  lastNameInput.addEventListener("input", () => {
    clearError(lastNameInput, lastNameError);
    if (hasAttemptedSubmit) {
      validateName(lastNameInput, lastNameError);
    }
  });

  emailInput.addEventListener("input", () => {
    clearError(emailInput, emailError);
    if (hasAttemptedSubmit) {
      validateEmail(emailInput, emailError);
    }
  });

  ageInput.addEventListener("input", () => {
    clearError(ageInput, ageError);
    if (hasAttemptedSubmit) {
      validateAge(ageInput, ageError);
    }
  });

  passwordInput.addEventListener("input", () => {
    clearError(passwordInput, passwordError);
    if (hasAttemptedSubmit) {
      validatePassword(passwordInput, passwordError);
      // Si el campo de confirmación ya tiene contenido, validarlo también
      if (confirmPasswordInput.value.length > 0) {
        clearError(confirmPasswordInput, confirmPasswordError);
        validateConfirmPassword(confirmPasswordInput, confirmPasswordError);
      }
    }
  });

  confirmPasswordInput.addEventListener("input", () => {
    clearError(confirmPasswordInput, confirmPasswordError);
    if (hasAttemptedSubmit) {
      validateConfirmPassword(confirmPasswordInput, confirmPasswordError);
    }
  });

  // Event listener para el envío del formulario
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Marcar que se ha intentado enviar el formulario
    hasAttemptedSubmit = true;

    // Validar todos los campos y mostrar errores si es necesario
    if (!validateAll(true)) {
      return;
    }

    // Mostrar spinner y deshabilitar botón
    buttonText.textContent = "Creando Cuenta...";
    spinner.classList.remove("hidden");
    submitButton.disabled = true; // Recoger datos del formulario
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const email = emailInput.value.trim();
    const age = parseInt(ageInput.value.trim());
    const password = passwordInput.value;

    try {
      const userData = {
        firstName,
        lastName,
        email,
        age,
        password,
      };

      console.log("Sending registration data:", userData);

      // Simular un tiempo mínimo de procesamiento (mínimo 1s, máximo 3s)
      const startTime = Date.now();
      const res = await signup(userData);
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 1000 - elapsedTime);

      await new Promise((resolve) => setTimeout(resolve, remainingTime));

      console.log("Server response:", res);

      // Guardar token y usuario
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));

      // Mostrar toast de éxito
      toast.success(
        `¡Cuenta creada exitosamente! Bienvenido, ${res.user.firstName}!`
      );

      // Esperar un momento y redireccionar al dashboard (no al login)
      setTimeout(() => {
        navigateTo("dashboard");
      }, 300);
    } catch (err) {
      console.error("Signup error:", err);
      console.error("Error message:", err.message);

      // Restablecer botón
      buttonText.textContent = "Crear Cuenta";
      spinner.classList.add("hidden");
      submitButton.disabled = false;

      // Manejar error específico para email ya registrado (409 Conflict)
      if (
        err.message &&
        (err.message.includes("409") ||
          err.message.toLowerCase().includes("already registered") ||
          err.message
            .toLowerCase()
            .includes("this email is already registered"))
      ) {
        showError(emailInput, emailError, "Este email ya está registrado");
        toast.error(
          "Este email ya está registrado. Por favor usa otro email o inicia sesión."
        );
      } else if (err.message && err.message.includes("500")) {
        // Error del servidor
        toast.error("Error del servidor. Por favor intente más tarde.");

        // En modo dev, mostrar en consola
        if (process.env.NODE_ENV !== "production") {
          console.error("Server error details:", err);
        }
      } else if (err.message && err.message.includes("400")) {
        // Error de validación del servidor
        toast.error("Datos inválidos. Por favor verifique su información.");
      } else {
        toast.error(
          "Error al crear la cuenta. Por favor verifique su información e intente nuevamente."
        );
      }
    }
  });

  // Navegar a login
  const goLoginBtn = document.getElementById("go-login");
  if (goLoginBtn) {
    goLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Botón go-login clickeado, navegando a login...");
      // Limpiar intervalos antes de navegar
      if (window.cleanupLoginIntervals) {
        window.cleanupLoginIntervals();
      }
      navigateTo("login", true);
    });
  } else {
    console.error("Elemento go-login no encontrado en signup.js");
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
    console.error("Botón go-home no encontrado en signup");
  }

  // Botón de signup con Google - COMENTADO: OAuth de Google deshabilitado
  /*
  const googleLoginButton = document.querySelector(".google-login");
  if (googleLoginButton) {
    googleLoginButton.addEventListener("click", () => {
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

      // Usar el nuevo método seguro para iniciar la autenticación
      const auth = initiateGoogleAuth(googleAuthUrl);

      // Configurar el verificador de estado
      auth.checkAuthStatus((error, user) => {
        // Restablecer botón en cualquier caso
        buttonText.textContent = "Crear Cuenta";
        spinner.classList.add("hidden");
        submitButton.disabled = false;

        if (error) {
          console.error("Error de autenticación con Google:", error);
          toast.error("La autenticación con Google no pudo completarse");
          return;
        }

        if (user) {
          console.log("Autenticación con Google exitosa");
          // Mostrar toast y redirigir al dashboard
          toast.success(`¡Bienvenido, ${user.firstName}!`);
          // Redirigir al dashboard después de un breve momento
          setTimeout(() => {
            navigateTo("dashboard");
          }, 300);
        }
      });
    });
  } else {
    console.error("Botón google-login no encontrado en signup");
  }
  */

  // Inicializar toggles de contraseña
  addPasswordToggle("password");
  addPasswordToggle("confirmPassword");

  // Footer is now handled automatically by the router

  // No mostrar validaciones iniciales hasta que el usuario intente enviar
  // validateAll(false); // Removido para evitar validaciones iniciales
}
