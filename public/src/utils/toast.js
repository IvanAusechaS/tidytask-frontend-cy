/**
 * Sistema de notificaciones toast mejorado
 * Permite mostrar múltiples notificaciones con diferentes estilos y animaciones
 */
class ToastManager {
  constructor() {
    // Crear el contenedor de toasts si no existe
    this.container = document.querySelector(".toast-container");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.className = "toast-container";
      document.body.appendChild(this.container);
    }

    this.toasts = [];
    this.maxToasts = 3; // Máximo número de toasts visibles simultáneamente
    this.recentMessages = new Map(); // Para prevenir duplicados
  }

  /**
   * Muestra un toast con el mensaje y tipo especificados
   * @param {string} message - El mensaje a mostrar
   * @param {string} type - El tipo de toast (success, error, warning, info)
   * @param {number} duration - Duración en ms (por defecto 5000ms)
   * @param {Object} options - Opciones adicionales como botón de deshacer
   */
  show(message, type = "info", duration = 5000, options = {}) {
    // Crear clave única para el mensaje
    const messageKey = `${message}-${type}`;

    // Verificar si este mensaje ya se mostró recientemente (últimos 3 segundos)
    const now = Date.now();
    if (this.recentMessages.has(messageKey)) {
      const lastShown = this.recentMessages.get(messageKey);
      if (now - lastShown < 3000) {
        console.log("Toast duplicado bloqueado:", message);
        return null; // No mostrar mensaje duplicado
      }
    }

    // Registrar este mensaje
    this.recentMessages.set(messageKey, now);

    // Limpiar mensajes antiguos del cache (más de 10 segundos)
    for (const [key, timestamp] of this.recentMessages.entries()) {
      if (now - timestamp > 10000) {
        this.recentMessages.delete(key);
      }
    }

    // Crear elemento toast
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    // Crear contenido del mensaje
    const messageContent = document.createElement("span");
    messageContent.className = "toast-message";
    messageContent.innerHTML = message;

    // Crear contenedor de botones
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "toast-buttons";

    // Crear botón de deshacer si se proporciona
    if (options.undoCallback) {
      const undoButton = document.createElement("button");
      undoButton.className = "toast-undo";
      undoButton.textContent = "Deshacer";
      undoButton.addEventListener("click", () => {
        options.undoCallback();
        this.remove(toast);
      });
      buttonContainer.appendChild(undoButton);
    }

    // Crear botón de cerrar
    const closeButton = document.createElement("button");
    closeButton.className = "toast-close";
    closeButton.innerHTML = "&times;";
    closeButton.addEventListener("click", () => {
      this.remove(toast);
    });
    buttonContainer.appendChild(closeButton);

    // Ensamblar el toast
    toast.appendChild(messageContent);
    toast.appendChild(buttonContainer);

    // Añadir el toast al contenedor
    this.container.appendChild(toast);
    this.toasts.push(toast);

    // Mostrar el toast con un pequeño retraso para permitir la animación
    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    // Eliminar toast después de la duración especificada
    if (duration > 0) {
      setTimeout(() => {
        this.remove(toast);
      }, duration);
    }

    // Limitar el número de toasts visibles
    this.limitToasts();

    return toast;
  }

  /**
   * Elimina un toast específico
   * @param {HTMLElement} toast - El elemento toast a eliminar
   */
  remove(toast) {
    toast.classList.remove("show");

    // Eliminar elemento después de que termine la animación
    setTimeout(() => {
      if (toast.parentNode === this.container) {
        this.container.removeChild(toast);
      }
      this.toasts = this.toasts.filter((t) => t !== toast);
    }, 400); // Tiempo de la transición en CSS
  }

  /**
   * Limita el número de toasts visibles
   */
  limitToasts() {
    if (this.toasts.length > this.maxToasts) {
      const toastsToRemove = this.toasts.slice(
        0,
        this.toasts.length - this.maxToasts
      );
      toastsToRemove.forEach((toast) => this.remove(toast));
    }
  }

  /**
   * Métodos de conveniencia para diferentes tipos de toast
   */
  success(message, duration) {
    return this.show(message, "success", duration);
  }

  error(message, duration) {
    return this.show(message, "error", duration);
  }

  warning(message, duration) {
    return this.show(message, "warning", duration);
  }

  info(message, duration) {
    return this.show(message, "info", duration);
  }

  /**
   * Muestra un toast de deshacer con un botón de deshacer
   * @param {string} message - El mensaje a mostrar
   * @param {Function} undoCallback - Función a ejecutar al hacer clic en deshacer
   * @param {number} duration - Duración en ms (por defecto 5000ms)
   */
  undo(message, undoCallback, duration = 5000) {
    return this.show(message, "warning", duration, { undoCallback });
  }
}

// Crear instancia global única
let toastInstance = null;

if (!window.toastManagerInstance) {
  toastInstance = new ToastManager();
  window.toastManagerInstance = toastInstance;
  console.log("Nueva instancia de ToastManager creada");
} else {
  toastInstance = window.toastManagerInstance;
  console.log("Reutilizando instancia existente de ToastManager");
}

// Reemplazar el método alert nativo
if (!window.alertReplaced) {
  const originalAlert = window.alert;
  window.alert = function (message) {
    toastInstance.info(message);
  };
  window.alertReplaced = true;
}

export default toastInstance;
