import { navigate } from "../router.js";
import { get, put, del } from "../services/api.js";
import { resetProfileEditState } from "./profile-edit.js";
import { addPasswordToggle } from "../utils/password-toggle.js";
import toast from "../utils/toast.js";

// Estado de la aplicación
let userProfile = null;
let isLoading = false;
let isNavigating = false; // Nueva bandera para evitar bucles
let isInitialized = false; // Nueva bandera para evitar múltiples inicializaciones
let isChangingPassword = false; // Estado para cambio de contraseña

/**
 * Resetear estado del perfil para forzar recarga
 */
export function resetProfileState() {
  console.log("Reseteando estado del perfil");
  isInitialized = false;
  isNavigating = false;
  userProfile = null;
  isLoading = false;
  isChangingPassword = false;
}

/**
 * Configuración inicial de la página de perfil
 */
function initProfile() {
  console.log("Inicializando página de perfil");

  // Limpiar cualquier intervalo del dashboard que pueda estar ejecutándose
  if (window.dashboardIntervalId) {
    clearInterval(window.dashboardIntervalId);
    window.dashboardIntervalId = null;
    console.log("Intervalos del dashboard limpiados en profile");
  }

  // Limpiar cualquier intervalo de Google Auth que pueda estar ejecutándose
  if (window.googleAuthCheckInterval) {
    clearInterval(window.googleAuthCheckInterval);
    delete window.googleAuthCheckInterval;
    console.log("Intervalos de Google Auth limpiados en profile");
  }

  // Solo evitar reinicialización si ya estamos navegando en este momento
  if (isNavigating) {
    console.log("Ya estamos navegando, evitando reinicialización");
    return;
  }

  // Resetear estado de inicialización para permitir recargas cuando regresamos de otras páginas
  isInitialized = true;

  // Verificar autenticación
  const token = localStorage.getItem("token");
  if (!token) {
    console.log("No hay token, redirigiendo a login");
    isNavigating = true;
    navigate("login");
    return;
  }

  // Configurar event listeners
  setupEventListeners();

  // Cargar perfil del usuario
  loadUserProfile();

  // Footer is now handled automatically by the router
}

/**
 * Configurar todos los event listeners
 */
function setupEventListeners() {
  // Formulario de perfil
  const profileForm = document.getElementById("profile-form");
  if (profileForm) {
    profileForm.addEventListener("submit", handleSaveProfile);
  }

  // Botón de guardar perfil (ya está manejado por el form submit)
  const saveBtn = document.getElementById("save-profile-btn");
  if (saveBtn) {
    // El evento submit del form ya maneja esto
    console.log("Botón guardar perfil configurado");
  } else {
    console.error("Botón save-profile-btn no encontrado");
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

  console.log("Setting up password form buttons");
  console.log("showPasswordBtn:", showPasswordBtn);
  console.log("hidePasswordBtn:", hidePasswordBtn);

  if (showPasswordBtn) {
    showPasswordBtn.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Show password button clicked");
      showPasswordForm();
    });
    console.log("Show password button event listener added");
  } else {
    console.error("Show password button not found");
  }

  if (hidePasswordBtn) {
    hidePasswordBtn.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Hide password button clicked");
      hidePasswordForm();
    });
    console.log("Hide password button event listener added");
  } else {
    console.error("Hide password button not found");
  }

  // Botón de eliminar cuenta
  const deleteBtn = document.getElementById("delete-account-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", showDeleteModal);
  }

  // Botón de reintentar
  const retryBtn = document.getElementById("retry-btn");
  if (retryBtn) {
    retryBtn.addEventListener("click", loadUserProfile);
  }

  // Botón de logout
  const logoutBtn = document.getElementById("logout-button");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Cerrando sesión...");
      handleLogout();
    });
  } else {
    console.error("Botón logout-button no encontrado");
  }

  // Botón de volver al dashboard
  const backToDashboardBtn = document.getElementById("back-to-dashboard");
  if (backToDashboardBtn) {
    backToDashboardBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Navegando al dashboard...");
      navigate("dashboard");
    });
  } else {
    console.error("Botón back-to-dashboard no encontrado");
  }

  // Modal de eliminar cuenta
  setupDeleteModal();
}

/**
 * Configurar modal de eliminación de cuenta
 */
function setupDeleteModal() {
  const modal = document.getElementById("delete-modal");
  const closeBtn = document.getElementById("close-modal");
  const cancelBtn = document.getElementById("cancel-delete");
  const confirmBtn = document.getElementById("confirm-delete");

  if (closeBtn) {
    closeBtn.addEventListener("click", hideDeleteModal);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", hideDeleteModal);
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", handleDeleteAccount);
  }

  // Cerrar modal al hacer clic fuera
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        hideDeleteModal();
      }
    });
  }
}

/**
 * Cargar perfil del usuario desde el backend
 */
async function loadUserProfile() {
  if (isLoading) return;

  console.log("loadUserProfile called");
  isLoading = true;
  showSkeleton();

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Token no encontrado");
    }

    console.log("Making API call to /users/me");
    // Usar el servicio API en lugar de fetch directo
    const data = await get("/users/me", true);
    console.log("API response:", data);

    if (data.success && data.data) {
      userProfile = data.data;
      console.log("Profile data loaded successfully:", userProfile);
      displayProfile(userProfile);
      updateHeaderInfo(userProfile);
      updateNavInfo(userProfile); // Agregar actualización del nav
    } else {
      console.error("Invalid profile data:", data);
      throw new Error("Datos de perfil no válidos");
    }
  } catch (error) {
    console.error("Error loading profile:", error);

    if (error.message === "Error del servidor") {
      // Solo mostrar en dev
      if (process.env.NODE_ENV === "development") {
        console.error("Server error details:", error);
      }
      showError("No pudimos obtener tu perfil");
    } else {
      showError(error.message || "Error al cargar el perfil");
    }
  } finally {
    isLoading = false;
  }
}

/**
 * Mostrar skeleton de carga
 */
function showSkeleton() {
  const skeleton = document.getElementById("profile-skeleton");
  const content = document.getElementById("profile-content");
  const error = document.getElementById("profile-error");

  if (skeleton) skeleton.style.display = "block";
  if (content) content.style.display = "none";
  if (error) error.style.display = "none";
}

/**
 * Mostrar contenido del perfil
 */
function displayProfile(profile) {
  console.log("displayProfile called with:", profile);

  const skeleton = document.getElementById("profile-skeleton");
  const content = document.getElementById("profile-content");
  const error = document.getElementById("profile-error");

  if (skeleton) skeleton.style.display = "none";
  if (content) content.style.display = "block";
  if (error) error.style.display = "none";

  // Actualizar campos del formulario
  const firstNameInput = document.getElementById("profile-first-name");
  const lastNameInput = document.getElementById("profile-last-name");
  const ageInput = document.getElementById("profile-age");
  const emailInput = document.getElementById("profile-email");
  const memberSinceElement = document.getElementById("profile-member-since");

  console.log("Form elements found:");
  console.log("firstNameInput:", firstNameInput);
  console.log("lastNameInput:", lastNameInput);
  console.log("ageInput:", ageInput);
  console.log("emailInput:", emailInput);
  console.log("memberSinceElement:", memberSinceElement);

  if (firstNameInput) {
    firstNameInput.value = profile.firstName;
    console.log("Set firstName:", profile.firstName);
  }
  if (lastNameInput) {
    lastNameInput.value = profile.lastName;
    console.log("Set lastName:", profile.lastName);
  }
  if (ageInput) {
    ageInput.value = profile.age.toString();
    console.log("Set age:", profile.age);
  }
  if (emailInput) {
    emailInput.value = profile.email;
    console.log("Set email:", profile.email);
  }
  if (memberSinceElement) {
    memberSinceElement.textContent = formatDate(profile.createdAt);
    console.log("Set memberSince:", formatDate(profile.createdAt));
  }

  // Actualizar avatar
  const avatarLetter = document.getElementById("profile-avatar-letter");
  if (avatarLetter) {
    avatarLetter.textContent = profile.firstName.charAt(0).toUpperCase();
    console.log(
      "Set avatar letter:",
      profile.firstName.charAt(0).toUpperCase()
    );
  }

  // Actualizar el nombre completo en el perfil
  const fullNameElement = document.getElementById("profile-full-name");
  if (fullNameElement) {
    const fullName = `${profile.firstName} ${profile.lastName}`;
    fullNameElement.textContent = fullName;
    console.log("Set profile full name:", fullName);
  } else {
    console.error("Elemento profile-full-name no encontrado");
  }
}

/**
 * Mostrar estado de error
 */
function showError(message) {
  const skeleton = document.getElementById("profile-skeleton");
  const content = document.getElementById("profile-content");
  const error = document.getElementById("profile-error");
  const errorMessage = document.getElementById("error-message");

  if (skeleton) skeleton.style.display = "none";
  if (content) content.style.display = "none";
  if (error) error.style.display = "block";
  if (errorMessage) errorMessage.textContent = message;
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
  console.log("Actualizando info del nav con perfil:", profile);

  // También actualizar localStorage para que otros componentes lo usen
  const userData = {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    age: profile.age,
  };

  localStorage.setItem("user", JSON.stringify(userData));
  console.log("Datos de usuario guardados en localStorage");
}

/**
 * Formatear fecha para mostrar
 */
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    return "Fecha no disponible";
  }
}

/**
 * Mostrar modal de eliminación de cuenta
 */
function showDeleteModal() {
  const modal = document.getElementById("delete-modal");
  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

/**
 * Ocultar modal de eliminación de cuenta
 */
function hideDeleteModal() {
  const modal = document.getElementById("delete-modal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }
}

/**
 * Manejar eliminación de cuenta con opción de deshacer por 5 segundos
 */
async function handleDeleteAccount() {
  const confirmBtn = document.getElementById("confirm-delete");
  const spinner = document.getElementById("delete-spinner");

  if (!confirmBtn || !spinner) return;

  // Ocultar modal inmediatamente
  hideDeleteModal();

  try {
    // Verificar que hay token antes de proceder
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Token no encontrado");
    }

    // Variables para controlar el estado de cancelación
    let isCancelled = false;
    let deletionTimeout = null;

    // Función para cancelar la eliminación
    function cancelDeletion() {
      if (!isCancelled) {
        isCancelled = true;
        if (deletionTimeout) {
          clearTimeout(deletionTimeout);
          deletionTimeout = null;
        }
        toast.info("Eliminación de cuenta cancelada");
      }
    }

    // Mostrar toast de deshacer con 5 segundos para cancelar
    toast.undo(
      "Cuenta será eliminada en 5 segundos",
      cancelDeletion,
      5000 // 5 segundos para deshacer
    );

    // Programar eliminación definitiva después de 5 segundos
    deletionTimeout = setTimeout(async () => {
      if (!isCancelled) {
        try {
          if (spinner) spinner.style.display = "inline-block";
          if (confirmBtn) confirmBtn.disabled = true;
          await del("/users/me", true);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          toast.success("Tu cuenta ha sido eliminada definitivamente");
          setTimeout(() => {
            navigate("home");
          }, 1000);
        } catch (error) {
          if (spinner) spinner.style.display = "none";
          if (confirmBtn) confirmBtn.disabled = false;
          toast.error("Error al eliminar la cuenta del servidor");
        }
      }
    }, 5000);
  } catch (error) {
    toast.error("Error al procesar eliminación de cuenta");
  }
}

/**
 * Manejar guardado del perfil
 */
async function handleSaveProfile(e) {
  e.preventDefault();

  const saveBtn = document.getElementById("save-profile-btn");
  const spinner = document.getElementById("save-spinner");

  if (!saveBtn || !spinner) {
    console.error("Elementos del botón guardar no encontrados");
    return;
  }

  // Obtener los datos del formulario
  const formData = new FormData(e.target);
  const firstName =
    formData.get("profile-first-name") ||
    document.getElementById("profile-first-name").value.trim();
  const lastName =
    formData.get("profile-last-name") ||
    document.getElementById("profile-last-name").value.trim();
  const age = parseInt(document.getElementById("profile-age").value);
  const email = document.getElementById("profile-email").value.trim(); // Agregar email

  // Validar los datos (incluir email en la validación)
  const validation = validateProfileData(firstName, lastName, age, email);
  if (!validation.isValid) {
    toast.error(validation.message);
    return;
  }

  // Mostrar spinner y deshabilitar botón
  spinner.style.display = "inline-block";
  saveBtn.disabled = true;

  try {
    // Preparar los datos para enviar (incluir email)
    const updateData = {
      firstName: firstName,
      lastName: lastName,
      age: age,
      email: email,
    };

    console.log("Enviando datos de perfil:", updateData);

    // Hacer la petición al backend
    const response = await put("/users/me", updateData, true);

    if (response.success && response.data) {
      // Actualizar el perfil local
      userProfile = response.data;

      // Actualizar la información en el header
      updateHeaderInfo(userProfile);
      updateNavInfo(userProfile);

      // Actualizar el nombre completo en el perfil
      const fullNameElement = document.getElementById("profile-full-name");
      if (fullNameElement) {
        const fullName = `${userProfile.firstName} ${userProfile.lastName}`;
        fullNameElement.textContent = fullName;
        console.log("Updated profile full name after save:", fullName);
      }

      // Mostrar mensaje de éxito
      toast.success("Perfil actualizado exitosamente");
    } else {
      throw new Error("Respuesta inválida del servidor");
    }
  } catch (error) {
    console.error("Error saving profile:", error);
    toast.error(error.message || "Error al guardar el perfil");
  } finally {
    // Ocultar spinner y habilitar botón
    spinner.style.display = "none";
    saveBtn.disabled = false;
  }
}

/**
 * Validar datos del perfil
 */
function validateProfileData(firstName, lastName, age, email) {
  // Validar nombres
  if (!firstName || firstName.length < 2) {
    return {
      isValid: false,
      message: "El nombre debe tener al menos 2 caracteres",
    };
  }

  if (firstName.length > 50) {
    return {
      isValid: false,
      message: "El nombre no puede tener más de 50 caracteres",
    };
  }

  // Validar apellidos
  if (!lastName || lastName.length < 2) {
    return {
      isValid: false,
      message: "Los apellidos deben tener al menos 2 caracteres",
    };
  }

  if (lastName.length > 50) {
    return {
      isValid: false,
      message: "Los apellidos no pueden tener más de 50 caracteres",
    };
  }

  // Validar email
  if (!email || email.trim() === "") {
    return {
      isValid: false,
      message: "El correo electrónico es requerido",
    };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return {
      isValid: false,
      message: "Formato de correo electrónico inválido",
    };
  }

  if (email.length > 100) {
    return {
      isValid: false,
      message: "El correo no puede tener más de 100 caracteres",
    };
  }

  // Validar edad
  if (!age || isNaN(age) || age < 13 || age > 120) {
    return {
      isValid: false,
      message: "La edad debe ser un número entre 13 y 120 años",
    };
  }

  // Validar caracteres especiales (solo letras, espacios y algunos caracteres especiales comunes)
  const nameRegex = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s\-'\.]+$/;

  if (!nameRegex.test(firstName)) {
    return {
      isValid: false,
      message: "El nombre contiene caracteres no válidos",
    };
  }

  if (!nameRegex.test(lastName)) {
    return {
      isValid: false,
      message: "Los apellidos contienen caracteres no válidos",
    };
  }

  return { isValid: true };
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
    toast.error("Por favor, corrige los errores en el formulario");
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

      toast.success("Contraseña actualizada exitosamente");
    } else {
      throw new Error("Respuesta inválida del servidor");
    }
  } catch (error) {
    console.error("Error changing password:", error);
    toast.error(error.message || "Error al cambiar la contraseña");
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
  console.log("showPasswordForm called");
  const linkContainer = document.getElementById("password-link-container");
  const formContainer = document.getElementById("password-form-container");

  console.log("linkContainer:", linkContainer);
  console.log("formContainer:", formContainer);

  if (linkContainer && formContainer) {
    console.log("Both containers found, showing password form");

    // Agregar clase de ocultamiento al enlace
    linkContainer.classList.add("hiding");

    // Después de la transición de ocultamiento, ocultar completamente y mostrar formulario
    setTimeout(() => {
      linkContainer.style.display = "none";
      formContainer.style.display = "block";

      // Pequeño delay para que el display: block tome efecto
      setTimeout(() => {
        formContainer.classList.add("showing");

        // Hacer scroll suave al formulario después de la animación
        setTimeout(() => {
          formContainer.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 200);
      }, 50);
    }, 300);
  } else {
    console.error("Password form containers not found");
    console.error("linkContainer:", linkContainer);
    console.error("formContainer:", formContainer);
  }
}

/**
 * Ocultar formulario de cambio de contraseña
 */
function hidePasswordForm() {
  console.log("hidePasswordForm called");
  const linkContainer = document.getElementById("password-link-container");
  const formContainer = document.getElementById("password-form-container");
  const passwordForm = document.getElementById("change-password-form");

  if (linkContainer && formContainer) {
    console.log("Hiding password form with animation");

    // Quitar clase de mostrado del formulario
    formContainer.classList.remove("showing");

    // Después de la transición, ocultar formulario y mostrar enlace
    setTimeout(() => {
      formContainer.style.display = "none";
      linkContainer.style.display = "block";

      // Quitar clase de ocultamiento del enlace
      setTimeout(() => {
        linkContainer.classList.remove("hiding");
      }, 50);
    }, 400);

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
  console.log("Ejecutando logout...");
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // Mostrar mensaje de éxito
  toast.success("Sesión cerrada exitosamente");

  // Limpiar estado de la aplicación
  userProfile = null;
  isLoading = false;
  isNavigating = false;
  isInitialized = false;
  isChangingPassword = false;

  // Navegar al home
  setTimeout(() => {
    navigate("home");
  }, 100);
}

// Exportar función de inicialización
export default initProfile;
