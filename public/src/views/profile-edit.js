import { navigate } from "../router.js";
import { get, put } from "../services/api.js";
import { resetProfileState } from "./profile.js";
import { addPasswordToggle } from "../utils/password-toggle.js";

// Estado de la aplicación
let originalData = null;
let isLoading = false;
let isSaving = false;
let isChangingPassword = false;
let isInitialized = false;

/**
 * Resetear estado del profile-edit para forzar reinicialización
 */
export function resetProfileEditState() {
  console.log("Reseteando estado del profile-edit");
  isInitialized = false;
  originalData = null;
  isLoading = false;
  isSaving = false;
  isChangingPassword = false;
}

// Patrones de validación
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Configuración inicial de la página de edición de perfil
 */
function initProfileEdit() {
  console.log("Inicializando página de edición de perfil");

  // Limpiar cualquier intervalo del dashboard que pueda estar ejecutándose
  if (window.dashboardIntervalId) {
    clearInterval(window.dashboardIntervalId);
    window.dashboardIntervalId = null;
    console.log("Intervalos del dashboard limpiados en profile-edit");
  }

  // Limpiar cualquier intervalo de Google Auth que pueda estar ejecutándose
  if (window.googleAuthCheckInterval) {
    clearInterval(window.googleAuthCheckInterval);
    delete window.googleAuthCheckInterval;
    console.log("Intervalos de Google Auth limpiados en profile-edit");
  }

  // Prevenir múltiples inicializaciones de datos, pero siempre configurar event listeners
  if (isInitialized) {
    console.log(
      "Profile-edit ya inicializado, reconfigurando listeners y cargando datos..."
    );
    setupEventListeners(); // Siempre reconfigurar listeners
    loadProfileData();
    return;
  }

  // Verificar autenticación
  const token = localStorage.getItem("token");
  if (!token) {
    console.log("No hay token, redirigiendo a login");
    navigate("login");
    return;
  }

  // Configurar event listeners
  setupEventListeners();
  isInitialized = true;

  // Cargar datos del perfil
  loadProfileData();

  // Footer is now handled automatically by the router
}

/**
 * Configurar todos los event listeners
 */
function setupEventListeners() {
  // Botón de volver
  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Botón volver al perfil clickeado");
      try {
        resetProfileState(); // Resetear estado antes de navegar
        navigate("profile");
      } catch (error) {
        console.error("Error navegando al perfil:", error);
      }
    });
  }

  // Botón de cancelar
  const cancelBtn = document.getElementById("cancel-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Botón cancelar clickeado");
      try {
        resetProfileState(); // Resetear estado antes de navegar
        navigate("profile");
      } catch (error) {
        console.error("Error cancelando edición:", error);
      }
    });
  }

  // Botón de reintentar
  const retryBtn = document.getElementById("retry-edit-btn");
  if (retryBtn) {
    retryBtn.addEventListener("click", loadProfileData);
  }

  // Botón de logout
  const logoutBtn = document.getElementById("logout-button");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Botón logout clickeado en profile-edit");
      try {
        handleLogout();
      } catch (error) {
        console.error("Error en logout desde profile-edit:", error);
      }
    });
  }

  // Formulario de edición de perfil
  const editForm = document.getElementById("edit-profile-form");
  if (editForm) {
    editForm.addEventListener("submit", handleProfileSubmit);
    setupProfileValidation();
  }

  // Formulario de cambio de contraseña
  const passwordForm = document.getElementById("change-password-form");
  if (passwordForm) {
    passwordForm.addEventListener("submit", handlePasswordSubmit);
    setupPasswordValidation();

    // Configurar toggles de mostrar/ocultar contraseña
    addPasswordToggle("currentPassword");
    addPasswordToggle("newPassword");
    addPasswordToggle("confirmPassword");
  }

  // Botones para mostrar/ocultar formulario de contraseña
  const showPasswordBtn = document.getElementById("show-password-form");
  const hidePasswordBtn = document.getElementById("hide-password-form");

  if (showPasswordBtn) {
    showPasswordBtn.addEventListener("click", showPasswordForm);
  }

  if (hidePasswordBtn) {
    hidePasswordBtn.addEventListener("click", hidePasswordForm);
  }
}

/**
 * Configurar validación en tiempo real para el formulario de perfil
 */
function setupProfileValidation() {
  const fields = ["firstName", "lastName", "age", "email"];

  fields.forEach((fieldName) => {
    const field = document.getElementById(fieldName);
    if (field) {
      field.addEventListener("input", () => {
        validateField(fieldName);
        updateSaveButtonState();
      });
      field.addEventListener("blur", () => validateField(fieldName));
    }
  });
}

/**
 * Configurar validación para el formulario de cambio de contraseña
 */
function setupPasswordValidation() {
  const fields = ["currentPassword", "newPassword", "confirmPassword"];

  fields.forEach((fieldName) => {
    const field = document.getElementById(fieldName);
    if (field) {
      field.addEventListener("input", () => {
        validatePasswordField(fieldName);

        // Si se cambia la contraseña actual, revalidar la nueva para verificar que sean diferentes
        if (fieldName === "currentPassword") {
          const newPasswordField = document.getElementById("newPassword");
          if (newPasswordField && newPasswordField.value) {
            validatePasswordField("newPassword");
          }
        }

        updatePasswordButtonState();
      });
      field.addEventListener("blur", () => validatePasswordField(fieldName));
    }
  });
}

/**
 * Cargar datos del perfil desde el backend
 */
async function loadProfileData() {
  if (isLoading) return;

  isLoading = true;
  showSkeleton();

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Token no encontrado");
    }

    // Usar el servicio API en lugar de fetch directo
    const data = await get("/users/me", true);

    if (data.success && data.data) {
      originalData = data.data;
      populateForm(originalData);
      updateHeaderInfo(originalData);
      updateNavInfo(originalData); // Agregar actualización del nav
      showForm();
    } else {
      throw new Error("Datos de perfil no válidos");
    }
  } catch (error) {
    console.error("Error loading profile data:", error);

    if (error.message === "Error del servidor") {
      if (process.env.NODE_ENV === "development") {
        console.error("Server error details:", error);
      }
      showError("No pudimos cargar tu información de perfil");
    } else {
      showError(error.message || "Error al cargar los datos");
    }
  } finally {
    isLoading = false;
  }
}

/**
 * Mostrar skeleton de carga
 */
function showSkeleton() {
  const skeleton = document.getElementById("edit-skeleton");
  const form = document.getElementById("edit-profile-form");
  const error = document.getElementById("edit-error");

  if (skeleton) skeleton.style.display = "block";
  if (form) form.style.display = "none";
  if (error) error.style.display = "none";
}

/**
 * Mostrar formulario
 */
function showForm() {
  const skeleton = document.getElementById("edit-skeleton");
  const form = document.getElementById("edit-profile-form");
  const error = document.getElementById("edit-error");

  if (skeleton) skeleton.style.display = "none";
  if (form) form.style.display = "block";
  if (error) error.style.display = "none";
}

/**
 * Mostrar estado de error
 */
function showError(message) {
  const skeleton = document.getElementById("edit-skeleton");
  const form = document.getElementById("edit-profile-form");
  const error = document.getElementById("edit-error");
  const errorMessage = document.getElementById("edit-error-message");

  if (skeleton) skeleton.style.display = "none";
  if (form) form.style.display = "none";
  if (error) error.style.display = "block";
  if (errorMessage) errorMessage.textContent = message;
}

/**
 * Poblar formulario con datos del perfil
 */
function populateForm(data) {
  const fields = {
    firstName: data.firstName,
    lastName: data.lastName,
    age: data.age,
    email: data.email,
  };

  Object.entries(fields).forEach(([fieldName, value]) => {
    const field = document.getElementById(fieldName);
    if (field) {
      field.value = value;
    }
  });

  // Actualizar avatar con letra inicial
  const avatarLetter = document.getElementById("profile-avatar-letter");
  if (avatarLetter) {
    avatarLetter.textContent = data.firstName
      ? data.firstName.charAt(0).toUpperCase()
      : "U";
  }

  // Validar todos los campos inicialmente
  Object.keys(fields).forEach((fieldName) => validateField(fieldName));
  updateSaveButtonState();
}

/**
 * Actualizar información del header
 */
function updateHeaderInfo(profile) {
  const userNameElement = document.getElementById("user-name");
  const userAvatarElement = document.getElementById("user-avatar-letter");

  if (userNameElement) {
    userNameElement.textContent = `${profile.firstName} ${profile.lastName}`;
  }

  if (userAvatarElement) {
    userAvatarElement.textContent = profile.firstName.charAt(0).toUpperCase();
  }
}

/**
 * Actualizar información del usuario en la navegación
 */
function updateNavInfo(profile) {
  // Los elementos ya se actualizan en updateHeaderInfo
  // Pero agreguemos logs para debugging
  console.log("Actualizando info del nav en profile-edit con perfil:", profile);

  // También actualizar localStorage para que otros componentes lo usen
  const userData = {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    age: profile.age,
  };

  localStorage.setItem("user", JSON.stringify(userData));
  console.log("Datos de usuario guardados en localStorage desde profile-edit");
}

/**
 * Validar un campo específico del perfil
 */
function validateField(fieldName) {
  const field = document.getElementById(fieldName);
  const errorElement = document.getElementById(`${fieldName}-error`);

  if (!field || !errorElement) return false;

  let isValid = true;
  let errorMessage = "";

  const value = field.value.trim();

  switch (fieldName) {
    case "firstName":
    case "lastName":
      if (!value) {
        isValid = false;
        errorMessage =
          fieldName === "firstName"
            ? "El nombre es requerido"
            : "El apellido es requerido";
      } else if (value.length < 1) {
        isValid = false;
        errorMessage = "Debe tener al menos 1 carácter";
      }
      break;

    case "age":
      const age = parseInt(value);
      if (!value || isNaN(age)) {
        isValid = false;
        errorMessage = "La edad es requerida";
      } else if (age < 13) {
        isValid = false;
        errorMessage = "Debes tener al menos 13 años";
      } else if (age > 100) {
        isValid = false;
        errorMessage = "La edad debe ser menor o igual a 100 años";
      }
      break;

    case "email":
      if (!value) {
        isValid = false;
        errorMessage = "El correo es requerido";
      } else if (!emailPattern.test(value)) {
        isValid = false;
        errorMessage = "Formato de correo inválido";
      }
      break;
  }

  // Actualizar UI
  errorElement.textContent = errorMessage;
  field.classList.toggle("error", !isValid);

  return isValid;
}

/**
 * Validar campos de contraseña
 */
function validatePasswordField(fieldName) {
  const field = document.getElementById(fieldName);
  const errorElement = document.getElementById(`${fieldName}-error`);

  if (!field || !errorElement) return false;

  let isValid = true;
  let errorMessage = "";

  const value = field.value;

  switch (fieldName) {
    case "currentPassword":
      if (!value) {
        isValid = false;
        errorMessage = "La contraseña actual es requerida";
      }
      break;

    case "newPassword":
      const currentPassword = document.getElementById("currentPassword")?.value;
      if (!value) {
        isValid = false;
        errorMessage = "La nueva contraseña es requerida";
      } else if (value === currentPassword && currentPassword) {
        isValid = false;
        errorMessage = "La nueva contraseña debe ser diferente a la actual";
      } else if (value.length < 8) {
        isValid = false;
        errorMessage = "Debe tener al menos 8 caracteres";
      } else if (!/(?=.*[0-9])/.test(value)) {
        isValid = false;
        errorMessage = "Debe contener al menos un número";
      } else if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(value)) {
        isValid = false;
        errorMessage =
          "Debe contener al menos un carácter especial (!@#$%^&*()_+=-[]{}|;':\",./<>?)";
      } else if (!/(?=.*[a-z])/.test(value)) {
        isValid = false;
        errorMessage = "Debe contener al menos una letra minúscula";
      } else if (!/(?=.*[A-Z])/.test(value)) {
        isValid = false;
        errorMessage = "Debe contener al menos una letra mayúscula";
      }
      break;

    case "confirmPassword":
      const newPassword = document.getElementById("newPassword")?.value;
      if (!value) {
        isValid = false;
        errorMessage = "Confirma la nueva contraseña";
      } else if (value !== newPassword) {
        isValid = false;
        errorMessage = "Las contraseñas no coinciden";
      }
      break;
  }

  // Actualizar UI
  errorElement.textContent = errorMessage;
  field.classList.toggle("error", !isValid);

  return isValid;
}

/**
 * Actualizar estado del botón guardar
 */
function updateSaveButtonState() {
  const saveBtn = document.getElementById("save-btn");
  if (!saveBtn) return;

  const fields = ["firstName", "lastName", "age", "email"];
  const allValid = fields.every((fieldName) => validateField(fieldName));
  const hasChanges = hasProfileChanges();

  saveBtn.disabled = !allValid || !hasChanges || isSaving;
}

/**
 * Actualizar estado del botón de cambiar contraseña
 */
function updatePasswordButtonState() {
  const btn = document.getElementById("change-password-btn");
  if (!btn) return;

  const fields = ["currentPassword", "newPassword", "confirmPassword"];
  const allValid = fields.every((fieldName) =>
    validatePasswordField(fieldName)
  );

  btn.disabled = !allValid || isChangingPassword;
}

/**
 * Verificar si hay cambios en el perfil
 */
function hasProfileChanges() {
  if (!originalData) return false;

  const currentData = {
    firstName: document.getElementById("firstName")?.value.trim(),
    lastName: document.getElementById("lastName")?.value.trim(),
    age: parseInt(document.getElementById("age")?.value),
    email: document.getElementById("email")?.value.trim(),
  };

  return Object.keys(currentData).some(
    (key) => currentData[key] !== originalData[key]
  );
}

/**
 * Manejar envío del formulario de perfil
 */
async function handleProfileSubmit(e) {
  e.preventDefault();

  if (isSaving) return;

  // Validar todos los campos
  const fields = ["firstName", "lastName", "age", "email"];
  const allValid = fields.every((fieldName) => validateField(fieldName));

  if (!allValid) {
    window.toast?.show(
      "Por favor, corrige los errores en el formulario",
      "error"
    );
    return;
  }

  isSaving = true;
  const saveBtn = document.getElementById("save-btn");
  const spinner = document.getElementById("save-spinner");

  if (saveBtn) saveBtn.disabled = true;
  if (spinner) spinner.style.display = "inline-block";

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Token no encontrado");
    }

    const formData = {
      firstName: document.getElementById("firstName").value.trim(),
      lastName: document.getElementById("lastName").value.trim(),
      age: parseInt(document.getElementById("age").value),
      email: document.getElementById("email").value.trim(),
    };

    // Usar el servicio API en lugar de fetch directo
    const data = await put("/users/me", formData, true);

    if (data.success && data.data) {
      // Actualizar datos originales
      originalData = data.data;

      // Actualizar localStorage si existe
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        Object.assign(user, {
          firstName: data.data.firstName,
          lastName: data.data.lastName,
          age: data.data.age,
          email: data.data.email,
        });
        localStorage.setItem("user", JSON.stringify(user));
      }

      // Actualizar información del header con los nuevos datos
      updateHeaderInfo(data.data);
      updateNavInfo(data.data);

      window.toast?.show("Perfil actualizado exitosamente", "success");

      // Resetear estado del perfil antes de navegar para forzar recarga
      resetProfileState();
      navigate("profile");
    } else {
      throw new Error("Respuesta inválida del servidor");
    }
  } catch (error) {
    console.error("Error updating profile:", error);

    if (error.message === "Error del servidor") {
      if (process.env.NODE_ENV === "development") {
        console.error("Server error details:", error);
      }
      window.toast?.show("Error interno del servidor", "error");
    } else {
      window.toast?.show(
        error.message || "Error al actualizar el perfil",
        "error"
      );
    }
  } finally {
    isSaving = false;
    if (saveBtn) saveBtn.disabled = false;
    if (spinner) spinner.style.display = "none";
    updateSaveButtonState();
  }
}

/**
 * Manejar cambio de contraseña
 */
async function handlePasswordSubmit(e) {
  e.preventDefault();

  if (isChangingPassword) return;

  // Validar todos los campos
  const fields = ["currentPassword", "newPassword", "confirmPassword"];
  const allValid = fields.every((fieldName) =>
    validatePasswordField(fieldName)
  );

  if (!allValid) {
    window.toast?.show(
      "Por favor, corrige los errores en el formulario",
      "error"
    );
    return;
  }

  isChangingPassword = true;
  const btn = document.getElementById("change-password-btn");
  const spinner = document.getElementById("password-spinner");
  let wasSuccessful = false;

  if (btn) btn.disabled = true;
  if (spinner) spinner.style.display = "inline-block";

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Token no encontrado");
    }

    const formData = {
      currentPassword: document.getElementById("currentPassword").value,
      newPassword: document.getElementById("newPassword").value,
      confirmPassword: document.getElementById("confirmPassword").value,
    };

    // Usar el servicio API en lugar de fetch directo
    const data = await put("/users/me/password", formData, true);

    if (data.success) {
      wasSuccessful = true;
      // Limpiar formulario
      document.getElementById("change-password-form").reset();

      // Limpiar errores y estado de validación
      fields.forEach((fieldName) => {
        const errorElement = document.getElementById(`${fieldName}-error`);
        const field = document.getElementById(fieldName);
        if (errorElement) errorElement.textContent = "";
        if (field) {
          field.classList.remove("error");
          field.classList.remove("valid");
        }
      });

      // Ocultar formulario de contraseña después del éxito
      hidePasswordForm();

      window.toast?.show("Contraseña actualizada exitosamente", "success");
    } else {
      throw new Error("Respuesta inválida del servidor");
    }
  } catch (error) {
    console.error("Error changing password:", error);
    window.toast?.show(
      error.message || "Error al cambiar la contraseña",
      "error"
    );
  } finally {
    isChangingPassword = false;
    if (btn) btn.disabled = false;
    if (spinner) spinner.style.display = "none";

    // Solo actualizar estado del botón si no fue exitoso
    if (!wasSuccessful) {
      updatePasswordButtonState();
    }
  }
}

/**
 * Mostrar formulario de cambio de contraseña
 */
function showPasswordForm() {
  const linkContainer = document.getElementById("password-link-container");
  const formContainer = document.getElementById("password-form-container");

  if (linkContainer && formContainer) {
    linkContainer.style.display = "none";
    formContainer.style.display = "block";

    // Hacer scroll suave al formulario
    formContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/**
 * Ocultar formulario de cambio de contraseña
 */
function hidePasswordForm() {
  const linkContainer = document.getElementById("password-link-container");
  const formContainer = document.getElementById("password-form-container");
  const passwordForm = document.getElementById("change-password-form");

  if (linkContainer && formContainer) {
    formContainer.style.display = "none";
    linkContainer.style.display = "block";

    // Limpiar formulario
    if (passwordForm) {
      passwordForm.reset();

      // Limpiar errores
      const fields = ["currentPassword", "newPassword", "confirmPassword"];
      fields.forEach((fieldName) => {
        const errorElement = document.getElementById(`${fieldName}-error`);
        const field = document.getElementById(fieldName);
        if (errorElement) errorElement.textContent = "";
        if (field) field.classList.remove("error");
      });

      // Resetear estado del botón
      updatePasswordButtonState();
    }
  }
}

/**
 * Manejar logout
 */
function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.toast?.show("Sesión cerrada exitosamente", "success");
  navigate("home");
}

// Exportar función de inicialización
export default initProfileEdit;
