/**
 * Utilidad para agregar funcionalidad de mostrar/ocultar contraseña
 */

/**
 * Convierte un campo de contraseña normal en un campo con toggle de visibilidad
 * @param {string|HTMLElement} passwordFieldSelector - Selector o elemento del campo de contraseña
 */
export function addPasswordToggle(passwordFieldSelector) {
  const passwordField =
    typeof passwordFieldSelector === "string"
      ? document.querySelector(passwordFieldSelector)
      : passwordFieldSelector;

  if (!passwordField || passwordField.type !== "password") {
    console.warn(
      "Password field not found or not a password type:",
      passwordFieldSelector
    );
    return;
  }

  // Verificar si ya tiene toggle
  if (
    passwordField.parentElement.classList.contains("password-field-container")
  ) {
    return;
  }

  // Crear contenedor wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "password-field-container";

  // Insertar wrapper antes del campo
  passwordField.parentNode.insertBefore(wrapper, passwordField);

  // Mover el campo dentro del wrapper
  wrapper.appendChild(passwordField);

  // Crear botón toggle
  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "password-toggle";
  toggleButton.setAttribute("aria-label", "Mostrar contraseña");

  // Crear iconos SVG
  toggleButton.innerHTML = `
    <svg class="icon-eye" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
    </svg>
    <svg class="icon-eye-off" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
    </svg>
  `;

  // Agregar botón al wrapper
  wrapper.appendChild(toggleButton);

  // Agregar funcionalidad de toggle
  toggleButton.addEventListener("click", function () {
    const isPassword = passwordField.type === "password";

    passwordField.type = isPassword ? "text" : "password";
    toggleButton.classList.toggle("showing", isPassword);
    toggleButton.setAttribute(
      "aria-label",
      isPassword ? "Ocultar contraseña" : "Mostrar contraseña"
    );
  });
}

/**
 * Inicializa toggles de contraseña para múltiples campos
 * @param {string[]} selectors - Array de selectores de campos de contraseña
 */
export function initPasswordToggles(selectors) {
  selectors.forEach((selector) => {
    addPasswordToggle(selector);
  });
}

/**
 * Inicializa toggles para todos los campos de contraseña en la página
 */
export function initAllPasswordToggles() {
  const passwordFields = document.querySelectorAll('input[type="password"]');
  passwordFields.forEach((field) => {
    addPasswordToggle(field);
  });
}
