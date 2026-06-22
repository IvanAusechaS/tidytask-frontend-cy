// src/views/Dashboard.js
import { navigateTo, navigate } from "../router.js";
import { logout, getCurrentUser } from "../services/authService.js";
import { get, post, put, del } from "../services/api.js";
import toast from "../utils/toast.js";
import { checkAuth } from "../utils/page-loader.js";
import TaskCalendar from "../components/calendar.js";

/**
 * Valida el formato de tiempo según especificaciones del backend
 * @param {string} time - Tiempo en formato HH:MM
 * @returns {boolean} - True si es válido, false si no
 */
function validateTime(time) {
  if (!time || time === "") return true; // Opcional

  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

  if (!timeRegex.test(time)) return false;

  const [hours, minutes] = time.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export default function setupDashboard() {
  // Verificar si el usuario está autenticado
  if (!checkAuth(true)) {
    // Si no hay sesión, checkAuth ya redirigió a login
    return;
  }

  // Limpiamos intervalos anteriores para evitar duplicados
  if (window.dashboardIntervalId) {
    clearInterval(window.dashboardIntervalId);
    window.dashboardIntervalId = null;
  }

  // Reinicializamos siempre para asegurar que todo funcione correctamente tras recarga
  window.dashboardInitialized = true;
  console.log("Inicializando dashboard...");

  // Verificar si el usuario está autenticado
  const token = localStorage.getItem("token");
  const user = getCurrentUser();

  if (!token || !user) {
    console.log("No hay token o usuario. Redirigiendo a login...");
    // Redireccionar a login si no hay usuario o token
    navigateTo("login");
    return;
  }

  console.log("Usuario autenticado encontrado:", user.firstName);

  // Estado global para tareas y tarea actual
  let tasks = [];
  let currentTask = null;
  let errorLiveRegion;
  let taskCalendar = null;
  let currentView = "kanban"; // 'kanban' o 'calendar'
  let isSubmittingTask = false; // Flag para prevenir múltiples envíos

  // Referencias a elementos del DOM
  let elements;

  function initElements() {
    elements = {
      userNameDisplay: document.getElementById("user-name"),
      userAvatarLetter: document.getElementById("user-avatar-letter"),
      profileButton: document.getElementById("profile-button"),
      logoutButton: document.getElementById("logout-button"),
      // Mobile menu elements
      hamburgerButton: document.querySelector(".hamburger-btn"),
      headerNav: document.querySelector(".header-nav"),
      mobileProfileButton: document.getElementById("mobile-profile-button"),
      mobileLogoutButton: document.getElementById("mobile-logout-button"),
      taskCounter: document.getElementById("task-counter"),
      emptyState: document.getElementById("empty-state"),
      kanbanBoard: document.getElementById("kanban-board"),
      newTaskButton: document.getElementById("new-task-button-container"),
      newTaskModal: document.getElementById("task-modal"),
      taskForm: document.getElementById("task-form"),
      closeModalBtn: document.getElementById("close-modal"),
      createFirstTaskBtn: document.getElementById("create-first-task"),
      addNewTaskBtn: document.getElementById("new-task-button"),
      modalTitle: document.getElementById("modal-title"),
      saveTaskButton: document.getElementById("save-task-button"),
      submitButton: document.querySelector("#task-form .submit-button"),
      viewToggleBtn: document.getElementById("view-toggle-button"),
      viewToggleText: document.getElementById("view-toggle-text"),
    };
  }

  // Inicializar elementos DOM
  initElements();
  // Inicializar estado del botón superior (oculto por defecto hasta cargar tareas)
  if (elements.addNewTaskBtn) {
    elements.addNewTaskBtn.style.display = "none";
  }

  // Event listeners
  function setupEventListeners() {
    // Verificar si los elementos existen antes de agregar event listeners
    if (elements.profileButton) {
      elements.profileButton.addEventListener("click", () => {
        navigate("profile");
      });
    }

    if (elements.logoutButton) {
      elements.logoutButton.addEventListener("click", handleLogout);
    }

    // Mobile menu event listeners
    if (elements.hamburgerButton) {
      elements.hamburgerButton.addEventListener("click", toggleMobileMenu);
    }

    if (elements.mobileProfileButton) {
      elements.mobileProfileButton.addEventListener("click", () => {
        closeMobileMenu();
        navigate("profile");
      });
    }

    if (elements.mobileLogoutButton) {
      elements.mobileLogoutButton.addEventListener("click", () => {
        closeMobileMenu();
        handleLogout();
      });
    }

    // Close mobile menu when clicking outside
    document.addEventListener("click", (event) => {
      if (elements.headerNav && elements.hamburgerButton) {
        const isClickInsideMenu =
          elements.headerNav.contains(event.target) ||
          elements.hamburgerButton.contains(event.target);

        if (
          !isClickInsideMenu &&
          elements.headerNav.classList.contains("open")
        ) {
          closeMobileMenu();
        }
      }
    });

    // Close mobile menu with ESC key
    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        elements.headerNav?.classList.contains("open")
      ) {
        closeMobileMenu();
      }
    });

    if (elements.taskForm) {
      elements.taskForm.addEventListener("submit", handleTaskFormSubmit);
    }

    if (elements.closeModalBtn) {
      elements.closeModalBtn.addEventListener("click", closeModal);
    }

    if (elements.createFirstTaskBtn) {
      elements.createFirstTaskBtn.addEventListener("click", openNewTaskModal);
    }

    if (elements.addNewTaskBtn) {
      elements.addNewTaskBtn.addEventListener("click", openNewTaskModal);
    }

    // View toggle button
    if (elements.viewToggleBtn) {
      elements.viewToggleBtn.addEventListener("click", toggleView);
    }

    // Handle window resize for responsive layout
    window.addEventListener("resize", handleResponsiveLayout);

    // Initialize responsive layout on load
    handleResponsiveLayout();

    // Configurar drag and drop para las columnas (siempre reinicializar)
    setupDragAndDropListeners();

    // Configurar drag and drop para las tareas existentes
    setupTaskDragListeners();

    // Configurar delegación de eventos para botones de acción de tareas
    setupTaskActionDelegation();
  }

  /**
   * Configurar drag and drop listeners para las columnas
   */
  function setupDragAndDropListeners() {
    // Limpiar listeners existentes para evitar duplicados
    document.querySelectorAll(".tasks-container").forEach((container) => {
      // Clonar el elemento para remover todos los event listeners
      const newContainer = container.cloneNode(true);
      container.parentNode.replaceChild(newContainer, container);
    });

    // Agregar event listeners frescos a todas las columnas
    document.querySelectorAll(".tasks-container").forEach((container) => {
      container.addEventListener("dragover", handleDragOver);
      container.addEventListener("drop", handleDrop);
      container.addEventListener("dragenter", handleDragEnter);
      container.addEventListener("dragleave", handleDragLeave);
    });
  }

  // Llamar a la función de configuración de event listeners
  setupEventListeners();

  // Mostrar información del usuario
  if (elements.userNameDisplay && user) {
    const fullName = `${user.firstName || "User"} ${
      user.lastName || ""
    }`.trim();
    elements.userNameDisplay.textContent = fullName;

    if (elements.userAvatarLetter) {
      elements.userAvatarLetter.textContent = (
        user.firstName ? user.firstName[0] : "U"
      ).toUpperCase();
    }
  }

  // Configurar validación del formulario
  setupTaskFormValidation();

  // Inicializar el área de anuncios de errores
  errorLiveRegion = document.getElementById("form-error-live");
  if (!errorLiveRegion) {
    errorLiveRegion = document.createElement("div");
    errorLiveRegion.id = "form-error-live";
    errorLiveRegion.className = "form-error-live";
    errorLiveRegion.setAttribute("aria-live", "polite");
    elements.taskForm.insertBefore(
      errorLiveRegion,
      elements.taskForm.firstChild
    );
  }

  // Inicializar dashboard
  initializeDashboard();

  /**
   * Inicializa el dashboard cargando las tareas
   */
  async function initializeDashboard() {
    try {
      console.log("Iniciando inicialización del dashboard");

      if (!localStorage.getItem("token")) {
        throw new Error("No hay token disponible");
      }

      // Cargar tareas
      await loadTasks();
      console.log("Tareas cargadas exitosamente");

      // IMPORTANTE: Siempre renderizar después de cargar
      renderTasks();
      console.log("Dashboard inicializado completamente");

      // Volver a configurar event listeners después de renderizar
      setupEventListeners();

      // Configurar actualización automática cada 30 segundos
      const intervalId = setInterval(async () => {
        try {
          console.log("Actualizando tareas automáticamente...");
          const originalTasks = [...tasks];
          const originalTasksJson = JSON.stringify(originalTasks);

          await loadTasks(false);

          // Comparar si realmente hay cambios en las tareas
          const newTasksJson = JSON.stringify(tasks);
          const hasActualChanges = originalTasksJson !== newTasksJson;

          if (hasActualChanges) {
            console.log(
              "Se detectaron cambios reales en las tareas, actualizando vista..."
            );
            renderTasks();

            // Solo mostrar notificación si hay cambios reales en los datos
            // y no es solo un re-render de rutina
            if (
              originalTasks.length !== tasks.length ||
              originalTasks.some(
                (task, index) =>
                  !tasks[index] ||
                  task._id !== tasks[index]._id ||
                  task.status !== tasks[index].status ||
                  task.title !== tasks[index].title ||
                  task.date !== tasks[index].date ||
                  task.time !== tasks[index].time
              )
            ) {
              toast.info("Tareas actualizadas");
            }
          }
        } catch (error) {
          console.error("Error en actualización automática:", error);
        }
      }, 30000);

      // Guardar el ID del intervalo para poder limpiarlo si es necesario
      window.dashboardIntervalId = intervalId;

      // Añadir evento para cuando la ventana se recarga o cierra
      window.addEventListener("beforeunload", () => {
        if (window.dashboardIntervalId) {
          clearInterval(window.dashboardIntervalId);
        }
      });

      // Footer is now handled automatically by the router
    } catch (error) {
      console.error("Error initializing dashboard:", error);

      if (
        error.message.includes("token") ||
        error.message.includes("Authentication")
      ) {
        console.log(
          "Error de autenticación en inicialización, redirigiendo a login"
        );
        alert("Por favor, inicia sesión para acceder al dashboard.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setTimeout(() => navigateTo("login"), 300);
      } else {
        alert(
          "Hubo un problema al cargar tus tareas. Algunas funcionalidades podrían no estar disponibles."
        );

        // IMPORTANTE: Renderizar interfaz vacía incluso en caso de error
        tasks = [];
        updateTaskCounter();
        renderTasks();
      }
    }
  }

  /**
   * Carga todas las tareas del usuario desde el servidor
   * @param {boolean} showLoadingIndicator - Indica si se debe mostrar el spinner (por defecto true)
   */
  async function loadTasks(showLoadingIndicator = true) {
    try {
      console.log("Cargando tareas del usuario...");

      if (!localStorage.getItem("token")) {
        console.error("No hay token disponible para cargar tareas");
        // Redirigir al login si no hay token
        toast.error("Sesión expirada. Por favor inicie sesión nuevamente.");
        setTimeout(() => {
          navigateTo("login");
        }, 1000);
        return; // Salir de la función para evitar errores
      }

      if (showLoadingIndicator) {
        showSpinner();
      }

      // Hacer la solicitud directamente sin timeout por ahora
      const response = await get("/tasks");
      console.log("Respuesta completa del servidor:", response);
      console.log("Tipo de respuesta:", typeof response);
      console.log("¿Tiene propiedad tasks?:", response.hasOwnProperty("tasks"));

      if (showLoadingIndicator) {
        hideSpinner();
      }

      if (response && response.tasks && Array.isArray(response.tasks)) {
        tasks = response.tasks;
        console.log(`Se cargaron ${tasks.length} tareas:`, tasks);
        updateTaskCounter();
      } else if (response && Array.isArray(response)) {
        // Por si el backend devuelve directamente el array
        tasks = response;
        console.log(
          `Se cargaron ${tasks.length} tareas (array directo):`,
          tasks
        );
        updateTaskCounter();
      } else {
        console.warn("La respuesta no contiene tareas válidas:", response);
        tasks = [];
        updateTaskCounter();
      }

      // Configurar drag and drop después de cargar las tareas
      setupTaskDragListeners();
    } catch (error) {
      console.error("Error loading tasks:", error);

      if (showLoadingIndicator) {
        hideSpinner();
      }

      // Si es un error de autenticación, intentar redirigir a login
      if (
        error.message.includes("Authentication") ||
        error.message.includes("401")
      ) {
        console.log("Error de autenticación, redirigiendo a login");
        toast.error("Inicia sesión de nuevo");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setTimeout(() => navigateTo("login"), 500);
      } else if (error.message.includes("Timeout")) {
        // Manejar timeout específicamente
        if (showLoadingIndicator) {
          toast.error("No pudimos obtener tus tareas, inténtalo más tarde");
        }
        tasks = [];
        updateTaskCounter();
      } else {
        // Para otros errores (500, etc)
        if (showLoadingIndicator) {
          toast.error("No pudimos obtener tus tareas, inténtalo más tarde");
        }
        tasks = [];
        updateTaskCounter();
      }

      throw error;
    }
  }

  /**
   * Actualiza el contador de tareas
   */
  function updateTaskCounter() {
    // Asegurar que el contador siempre sea visible
    if (elements.taskCounter) {
      elements.taskCounter.style.display = "block";
      elements.taskCounter.textContent = `${tasks.length} tareas creadas`;
    }

    // Asegurar que el título también sea visible
    const titleElement = document.querySelector(".tasks-title-section h1");
    if (titleElement) {
      titleElement.style.display = "block";
    }

    // Actualizar contadores por estado
    const todoTasks = tasks.filter((task) => task.status === "Por hacer");
    const doingTasks = tasks.filter((task) => task.status === "Haciendo");
    const doneTasks = tasks.filter((task) => task.status === "Hecho");

    // Actualizar contadores en la UI - verificar que existan los elementos
    const todoCount = document.getElementById("todo-count");
    const doingCount = document.getElementById("doing-count");
    const doneCount = document.getElementById("done-count");

    if (todoCount) todoCount.textContent = todoTasks.length;
    if (doingCount) doingCount.textContent = doingTasks.length;
    if (doneCount) doneCount.textContent = doneTasks.length;

    const todoCounter = document.getElementById("todo-counter");
    const doingCounter = document.getElementById("doing-counter");
    const doneCounter = document.getElementById("done-counter");

    if (todoCounter) todoCounter.textContent = todoTasks.length;
    if (doingCounter) doingCounter.textContent = doingTasks.length;
    if (doneCounter) doneCounter.textContent = doneTasks.length;

    // Actualizar contadores en las pestañas móviles
    const todoTabCount = document.getElementById("todo-tab-count");
    const doingTabCount = document.getElementById("doing-tab-count");
    const doneTabCount = document.getElementById("done-tab-count");

    if (todoTabCount) todoTabCount.textContent = todoTasks.length;
    if (doingTabCount) doingTabCount.textContent = doingTasks.length;
    if (doneTabCount) doneTabCount.textContent = doneTasks.length;

    if (todoTabCount) todoTabCount.textContent = todoTasks.length;
    if (doingTabCount) doingTabCount.textContent = doingTasks.length;
    if (doneTabCount) doneTabCount.textContent = doneTasks.length;
  }

  function renderTasks() {
    // Ordenar tareas por fecha ascendente
    if (tasks && tasks.length > 0) {
      tasks.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Reinicializar elementos si es necesario
    if (!elements || !elements.emptyState) {
      initElements();
    }

    // SIEMPRE mostrar título "My tasks" y contador de tareas, sin importar si hay tareas o no
    if (document.querySelector(".tasks-title-section h1")) {
      document.querySelector(".tasks-title-section h1").style.display = "block";
    }
    if (elements.taskCounter) {
      elements.taskCounter.style.display = "block";
      // Asegurar que siempre muestre el contador correcto
      elements.taskCounter.textContent = `${tasks.length} tareas creadas`;
    }

    if (!tasks || tasks.length === 0) {
      // Mostrar estado vacío
      if (elements.emptyState) {
        elements.emptyState.style.display = "flex";
      }
      if (elements.kanbanBoard) {
        elements.kanbanBoard.style.display = "none";
      }

      // Mostrar el botón Create First Task (inferior)
      if (elements.createFirstTaskBtn) {
        elements.createFirstTaskBtn.style.display = "block";
      }

      // Ocultar el botón superior cuando no hay tareas
      if (elements.addNewTaskBtn) {
        elements.addNewTaskBtn.style.display = "none";
      }
    } else {
      // Mostrar tablero kanban
      if (elements.emptyState) {
        elements.emptyState.style.display = "none";
      }

      // Ajustar display según el tamaño de pantalla
      if (elements.kanbanBoard) {
        if (window.innerWidth <= 768) {
          elements.kanbanBoard.style.display = "flex";
          elements.kanbanBoard.style.flexDirection = "column";
        } else {
          elements.kanbanBoard.style.display = "grid";
        }
      }

      // Ocultar botón de primera tarea cuando ya existen tareas
      if (elements.createFirstTaskBtn) {
        elements.createFirstTaskBtn.style.display = "none";
      }

      // Mostrar el botón superior cuando hay tareas
      if (elements.addNewTaskBtn) {
        elements.addNewTaskBtn.style.display = "block";
      }

      // Limpiar contenedores
      const todoContainer = document.getElementById("todo-tasks");
      const doingContainer = document.getElementById("doing-tasks");
      const doneContainer = document.getElementById("done-tasks");

      if (todoContainer) todoContainer.innerHTML = "";
      if (doingContainer) doingContainer.innerHTML = "";
      if (doneContainer) doneContainer.innerHTML = "";

      // Renderizar tareas por estado
      tasks.forEach((task) => {
        const taskElement = createTaskElement(task);

        if (task.status === "Por hacer" && todoContainer) {
          todoContainer.appendChild(taskElement);
        } else if (task.status === "Haciendo" && doingContainer) {
          doingContainer.appendChild(taskElement);
        } else if (task.status === "Hecho" && doneContainer) {
          doneContainer.appendChild(taskElement);
        }
      });
    }

    // Reconfigurar drag and drop y botones de acción después de renderizar las tareas
    if (tasks && tasks.length > 0) {
      setupDragAndDropListeners && setupDragAndDropListeners();
      setupTaskDragListeners && setupTaskDragListeners();
    }
    // Asegura que los listeners de los botones de acción se re-inicialicen al volver al dashboard
    window.addEventListener("popstate", () => {
      if (
        window.location.hash === "#/dashboard" ||
        window.location.pathname.endsWith("dashboard.html")
      ) {
        setTimeout(() => {
          if (typeof renderTasks === "function") renderTasks();
        }, 100); // Espera breve para asegurar que el DOM esté actualizado
      }
    });
    // Configurar tabs móviles
    setupMobileTabs();

    // Responsividad: vista lista por defecto en pantallas <= 768px
    adjustLayoutForScreenSize();

    // Actualizar calendario si está activo
    if (currentView === "calendar" && taskCalendar) {
      taskCalendar.updateTasks(tasks);
    }

    // Añadir event listener para window resize si no existe ya
    if (!window.hasResizeListener) {
      window.addEventListener("resize", function () {
        // Debounce para no ejecutar constantemente durante el redimensionamiento
        if (window.resizeTimer) {
          clearTimeout(window.resizeTimer);
        }
        window.resizeTimer = setTimeout(function () {
          console.log(
            "Adaptando layout para nuevo tamaño: " + window.innerWidth + "px"
          );

          // Re-inicializar completamente el layout adaptativo
          resetAdaptiveLayout();
          adjustLayoutForScreenSize();
          setupMobileTabs();
        }, 100); // Reducido de 250ms a 100ms para respuesta más rápida
      });
      window.hasResizeListener = true;
    }

    // Configurar event listeners para botones de eliminar todas las tareas
    setupDeleteAllButtonsListeners();
  }

  /**
   * Reinicia el layout adaptativo para una transición suave
   */
  function resetAdaptiveLayout() {
    const kanbanColumns = document.querySelectorAll(".kanban-column");
    const tabButtons = document.querySelectorAll(".adaptive-tab-button");

    // Si estamos en desktop (>768px), mostrar todas las columnas
    if (window.innerWidth > 768) {
      kanbanColumns.forEach((col) => {
        col.classList.remove("active-column");
        col.style.display = "flex";
      });

      // Asegurar que las pestañas móviles estén ocultas
      const adaptiveTabs = document.getElementById("adaptive-tabs");
      if (adaptiveTabs) {
        adaptiveTabs.style.display = "none";
      }
    } else {
      // Si estamos en móvil (<=768px), activar sistema de pestañas
      const adaptiveTabs = document.getElementById("adaptive-tabs");
      if (adaptiveTabs) {
        adaptiveTabs.style.display = "flex";
      }

      // Mantener solo la columna activa actual o por defecto "todo"
      const activeButton = document.querySelector(
        ".adaptive-tab-button.active"
      );
      const activeColumn = activeButton
        ? activeButton.getAttribute("data-column")
        : "todo";

      kanbanColumns.forEach((col) => {
        col.classList.remove("active-column");
        col.style.display = "none";
      });

      const targetColumn = document.querySelector(`.${activeColumn}-column`);
      if (targetColumn) {
        targetColumn.classList.add("active-column");
        targetColumn.style.display = "flex";
      }
    }
  }

  /**
   * Configura los event listeners para los botones de eliminar todas las tareas
   */
  function setupDeleteAllButtonsListeners() {
    const deleteAllButtons = document.querySelectorAll(".btn-delete-all");
    deleteAllButtons.forEach((button) => {
      // Remover listeners anteriores para evitar duplicados
      button.removeEventListener("click", handleDeleteAllClick);
      // Agregar nuevo listener
      button.addEventListener("click", handleDeleteAllClick);
    });
  }

  /**
   * Manejador de evento para el click en botón de eliminar todas las tareas
   */
  function handleDeleteAllClick(e) {
    const button = e.target.closest(".btn-delete-all");
    if (button) {
      const column = button.dataset.column;

      // Deshabilitar el botón temporalmente para evitar múltiples clicks
      button.disabled = true;

      handleDeleteAllTasks(column).finally(() => {
        // Rehabilitar el botón después de la operación
        button.disabled = false;
      });
    }
  }

  /**
   * Configura el funcionamiento de las pestañas adaptativas
   */
  function setupMobileTabs() {
    const tabButtons = document.querySelectorAll(".adaptive-tab-button");
    const kanbanColumns = document.querySelectorAll(".kanban-column");

    // Mostrar por defecto la columna "Por hacer"
    if (window.innerWidth <= 768) {
      // Ocultar todas las columnas primero
      kanbanColumns.forEach((col) => {
        col.classList.remove("active-column");
        col.style.display = "none"; // Asegurar que estén ocultas
      });

      // Mostrar solo la columna "Por hacer" por defecto
      const todoColumn = document.querySelector(".todo-column");
      if (todoColumn) {
        todoColumn.classList.add("active-column");
        todoColumn.style.display = "flex"; // Asegurar que sea visible
      }

      // Asegurarse de que el primer botón esté activo
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      const todoButton = document.querySelector(
        '.adaptive-tab-button[data-column="todo"]'
      );
      if (todoButton) {
        todoButton.classList.add("active");
      }
    }

    // Añadir event listeners a las pestañas
    tabButtons.forEach((button) => {
      button.addEventListener("click", function () {
        // Actualizar clases activas en los botones
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        this.classList.add("active");

        // Obtener la columna a mostrar
        const columnType = this.getAttribute("data-column");

        // Ocultar todas las columnas
        kanbanColumns.forEach((col) => {
          col.classList.remove("active-column");
          col.style.display = "none"; // Asegurarnos de que estén ocultas
        });

        // Mostrar la columna seleccionada
        const selectedColumn = document.querySelector(`.${columnType}-column`);
        if (selectedColumn) {
          selectedColumn.classList.add("active-column");
          selectedColumn.style.display = "flex"; // Asegurarnos de que sea visible
        }
      });
    });
  }

  /**
   * Ajusta el layout según el tamaño de la pantalla
   */
  function adjustLayoutForScreenSize() {
    const width = window.innerWidth;

    // Ajustes para tamaños de pantalla específicos
    if (width <= 320) {
      // Para pantallas muy pequeñas (320px)
      elements.kanbanBoard.style.overflowX = "hidden"; // Cambiado de auto a hidden
      elements.kanbanBoard.style.display =
        tasks.length === 0 ? "none" : "block";
      elements.kanbanBoard.style.width = "100%";
      elements.kanbanBoard.style.padding = "0";
      elements.kanbanBoard.style.margin = "0";

      document.querySelectorAll(".kanban-column").forEach((col) => {
        col.style.minWidth = "100%";
        col.style.width = "100%";
        col.style.marginRight = "0";
        col.style.marginBottom = "15px";
        col.style.padding = "15px";
        col.style.boxSizing = "border-box";
        col.style.overflow = "hidden"; // Asegurar que no haya overflow en la columna
      });

      // Asegurar que solo las task-container tengan scroll
      document.querySelectorAll(".tasks-container").forEach((container) => {
        container.style.overflowY = "auto";
      });

      // Ajustes adicionales para UI en pantallas muy pequeñas
      if (document.querySelector(".tasks-title-section h1")) {
        document.querySelector(".tasks-title-section h1").style.fontSize =
          "1.1rem";
      }

      if (document.getElementById("task-counter")) {
        document.getElementById("task-counter").style.fontSize = "0.7rem";
      }
    } else if (width <= 768) {
      // Para tabletas y móviles (768px)
      elements.kanbanBoard.style.overflowX = "hidden"; // Cambiado de auto a hidden
      elements.kanbanBoard.style.display =
        tasks.length === 0 ? "none" : "block";
      elements.kanbanBoard.style.width = "100%";
      elements.kanbanBoard.style.padding = "0";
      elements.kanbanBoard.style.margin = "0";

      document.querySelectorAll(".kanban-column").forEach((col) => {
        col.style.minWidth = "100%";
        col.style.width = "100%";
        col.style.marginRight = "0";
        col.style.marginBottom = "15px";
        col.style.padding = "15px";
        col.style.boxSizing = "border-box";
        col.style.overflow = "hidden"; // Asegurar que no haya overflow en la columna
      });

      // Asegurar que solo las task-container tengan scroll
      document.querySelectorAll(".tasks-container").forEach((container) => {
        container.style.overflowY = "auto";
      });

      // Ajustes adicionales para UI en tablets
      if (document.querySelector(".tasks-title-section h1")) {
        document.querySelector(".tasks-title-section h1").style.fontSize =
          "1.4rem";
      }

      if (document.getElementById("task-counter")) {
        document.getElementById("task-counter").style.fontSize = "0.85rem";
      }
    } else if (width <= 1024) {
      // Para pantallas medianas (1024px)
      elements.kanbanBoard.style.overflowX = "auto";
      elements.kanbanBoard.style.display = tasks.length === 0 ? "none" : "flex";
      elements.kanbanBoard.style.flexWrap = "wrap";
      elements.kanbanBoard.style.gap = "20px";

      document.querySelectorAll(".kanban-column").forEach((col) => {
        col.style.flex = "1 1 300px";
        col.style.minWidth = "300px";
        col.style.marginRight = "0";
        col.style.marginBottom = "20px";
        col.style.padding = "20px";
        col.style.boxSizing = "border-box";
      });

      // Restablecer ajustes adicionales
      if (document.querySelector(".tasks-title-section h1")) {
        document.querySelector(".tasks-title-section h1").style.fontSize =
          "1.6rem";
      }

      if (document.getElementById("task-counter")) {
        document.getElementById("task-counter").style.fontSize = "0.9rem";
      }
    } else {
      // Para pantallas grandes (>1024px)
      elements.kanbanBoard.style.overflowX = "auto";
      elements.kanbanBoard.style.display = tasks.length === 0 ? "none" : "flex";
      elements.kanbanBoard.style.gap = "24px";

      document.querySelectorAll(".kanban-column").forEach((col) => {
        col.style.flex = "1 1 0";
        col.style.minWidth = "320px";
        col.style.marginRight = "0";
        col.style.marginBottom = "0";
        col.style.padding = "24px";
      });

      // Restablecer a valores por defecto
      if (document.querySelector(".tasks-title-section h1")) {
        document.querySelector(".tasks-title-section h1").style.fontSize = "";
      }

      if (document.getElementById("task-counter")) {
        document.getElementById("task-counter").style.fontSize = "";
      }
    }

    // Ajustar el formato de las tarjetas de tareas según el tamaño de pantalla
    adjustTaskCardStyles(window.innerWidth);
  }

  /**
   * Ajusta los estilos de las tarjetas de tareas según el tamaño de pantalla
   * @param {number} width - Ancho de la ventana
   */
  function adjustTaskCardStyles(width) {
    const taskCards = document.querySelectorAll(".task-card");

    taskCards.forEach((card) => {
      if (width <= 320) {
        // Estilos para pantallas muy pequeñas
        card.style.padding = "10px";
        card.style.marginBottom = "8px";
        if (card.querySelector(".task-title")) {
          card.querySelector(".task-title").style.fontSize = "0.9rem";
        }
        if (card.querySelector(".task-description")) {
          card.querySelector(".task-description").style.fontSize = "0.75rem";
        }
      } else if (width <= 480) {
        // Estilos para móviles
        card.style.padding = "12px";
        card.style.marginBottom = "10px";
        if (card.querySelector(".task-title")) {
          card.querySelector(".task-title").style.fontSize = "0.95rem";
        }
        if (card.querySelector(".task-description")) {
          card.querySelector(".task-description").style.fontSize = "0.8rem";
        }
      } else {
        // Estilos por defecto para pantallas más grandes
        card.style.padding = "";
        card.style.marginBottom = "";
        if (card.querySelector(".task-title")) {
          card.querySelector(".task-title").style.fontSize = "";
        }
        if (card.querySelector(".task-description")) {
          card.querySelector(".task-description").style.fontSize = "";
        }
      }
    });
  }

  /**
   * Crea un elemento del DOM para una tarea
   * @param {Object} task - Objeto de tarea
   * @returns {HTMLElement} - Elemento del DOM para la tarea
   */
  function createTaskElement(task) {
    // Debug: Verificar datos de la tarea
    console.log("Creating task element for:", task);

    const taskDiv = document.createElement("div");
    taskDiv.className = "task-card";
    taskDiv.dataset.id = task._id;

    // Agregar atributos para drag and drop
    taskDiv.draggable = true;
    taskDiv.dataset.status = task.status;

    // Agregar event listeners de drag and drop
    addDragEventListeners(taskDiv);

    // Formatear fecha y hora - manejo seguro
    let formattedDate = "Sin fecha";
    try {
      if (task.date) {
        const dueDate = new Date(task.date);
        if (!isNaN(dueDate.getTime())) {
          formattedDate = dueDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        }
      }
    } catch (error) {
      console.error("Error formatting date:", error);
    }

    // Formatear hora si existe
    let formattedTime = "";
    if (task.time) {
      try {
        const [hours, minutes] = task.time.split(":");
        const hour12 = parseInt(hours) % 12 || 12;
        const ampm = parseInt(hours) >= 12 ? "PM" : "AM";
        formattedTime = `${hour12}:${minutes} ${ampm}`;
      } catch (error) {
        console.error("Error formatting time:", error);
      }
    }

    // Mapear estado en inglés para mostrar en la UI
    const statusMap = {
      "Por hacer": "Por hacer",
      Haciendo: "En proceso",
      Hecho: "Completado",
    };

    // Preparar título de forma segura
    const safeTitle =
      task.title && task.title.trim()
        ? task.title
            .trim()
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
        : "Sin título";

    console.log("Safe title:", safeTitle);

    taskDiv.innerHTML = `
      <div class="task-title"></div>
      <div class="task-description">${(task.detail || "")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</div>
      <div class="task-meta">
        <div class="task-date">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          ${formattedDate} ${formattedTime ? `- ${formattedTime}` : ""}
        </div>
        <div class="task-status-badge">
          ${statusMap[task.status] || task.status}
        </div>
      </div>
      <div class="task-actions">
        <button class="edit-task-btn float-animation" data-id="${task._id}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
        <button class="delete-task-btn ripple-animation" data-id="${task._id}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    `;

    // Establecer el título usando textContent para evitar problemas de escape HTML
    const titleElement = taskDiv.querySelector(".task-title");
    if (titleElement) {
      titleElement.textContent = safeTitle;
      console.log("Title element created with text:", titleElement.textContent);

      // Añadir estilos inline para asegurar visibilidad y alineación
      titleElement.style.display = "block";
      titleElement.style.fontSize = "16px";
      titleElement.style.fontWeight = "600";
      titleElement.style.color = "#333";
      titleElement.style.marginBottom = "8px";
      titleElement.style.textAlign = "left";
      titleElement.style.width = "100%";
    } else {
      console.error("No se pudo encontrar el elemento .task-title");
    }

    // Los event listeners se configuran a nivel del contenedor padre usando delegación
    // para mayor robustez y evitar problemas después de re-renders

    return taskDiv;
  }

  /**
   * Maneja el logout del usuario
   */
  async function handleLogout() {
    try {
      // Limpiar flag de inicialización
      window.dashboardInitialized = false;

      await logout();
      localStorage.setItem("logout_message", "Sesión cerrada correctamente");
      navigateTo("login");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      window.dashboardInitialized = false;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.setItem("logout_message", "Sesión cerrada correctamente");
      navigateTo("login");
    }
  }

  /**
   * Abre el modal para crear una nueva tarea
   */
  function openNewTaskModal() {
    elements.saveTaskButton.textContent = "Guardar tarea";
    // Verificar si el modal y elementos necesarios existen
    if (!elements.modalTitle || !elements.taskForm || !elements.newTaskModal) {
      console.error("Modal elements not found");
      // Re-inicializar elementos
      initElements();
      // Verificar de nuevo
      if (
        !elements.modalTitle ||
        !elements.taskForm ||
        !elements.newTaskModal
      ) {
        alert("No se pudo abrir el formulario. Por favor, recarga la página.");
        return;
      }
    }

    elements.modalTitle.textContent = "Nueva Tarea";
    elements.taskForm.reset();
    document.getElementById("task-id").value = "";

    // Establecer fecha por defecto (hoy menos 1 día para compensar visualmente)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const formattedDate = yesterday.toISOString().split("T")[0];
    document.getElementById("task-date").value = formattedDate;

    // Establecer fecha mínima (ayer para que permita seleccionar "hoy" visualmente)
    document.getElementById("task-date").min = formattedDate;

    // Establecer hora por defecto (opcional - dejar vacío)
    document.getElementById("task-time").value = "";

    // Estado por defecto: 'Por hacer' y deshabilitar el select
    const statusSelect = document.getElementById("task-status");
    statusSelect.value = "Por hacer";
    statusSelect.disabled = true;

    // Limpiar mensajes de error
    clearFormErrors();

    currentTask = null;

    // Configurar botón de envío
    if (elements.submitButton) {
      elements.submitButton.disabled = false;
      elements.submitButton.textContent = "Crear Tarea";
    }

    elements.newTaskModal.style.display = "flex";

    // Validar para verificar si el botón debe estar habilitado
    validateForm();
  }

  /**
   * Abre el modal para editar una tarea existente
   * @param {Object} task - Tarea a editar
   */
  function openEditTaskModal(task) {
    elements.modalTitle.textContent = "Editar Tarea";
    elements.saveTaskButton.textContent = "Guardar Cambios";

    // Rellenar el formulario con los datos de la tarea
    document.getElementById("task-title").value = task.title;
    document.getElementById("task-detail").value = task.detail || "";

    // Formatear fecha para mostrar un día anterior visualmente (compensar problema de zona horaria)
    let dateValue = task.date;
    if (dateValue && typeof dateValue === "string") {
      try {
        // Si viene en formato ISO, extraer solo la parte de fecha
        if (dateValue.includes("T")) {
          dateValue = dateValue.split("T")[0];
        }

        // Crear objeto Date y restar 1 día para compensar visualmente
        const date = new Date(dateValue);
        date.setDate(date.getDate() - 1);
        dateValue = date.toISOString().split("T")[0];
      } catch (error) {
        console.error("Error processing date for display:", error);
      }
    }
    document.getElementById("task-date").value = dateValue || "";

    // Formatear hora si existe, de lo contrario dejar vacío
    if (task.time) {
      document.getElementById("task-time").value = task.time;
    } else {
      // Dejar vacío si no hay tiempo, ya que es opcional
      document.getElementById("task-time").value = "";
    }

    // Habilitar el select de estado y establecer el valor actual
    const statusSelect = document.getElementById("task-status");
    statusSelect.disabled = false;
    statusSelect.value = task.status;

    document.getElementById("task-id").value = task._id;

    // Limpiar mensajes de error
    clearFormErrors();

    currentTask = task;

    // Configurar botón de envío
    if (elements.submitButton) {
      elements.submitButton.disabled = false;
      elements.submitButton.textContent = "Actualizar Tarea";
    }

    elements.newTaskModal.style.display = "flex";

    // Validar para verificar si el botón debe estar habilitado
    validateForm();
  }

  /**
   * Cierra el modal de tarea
   */
  function closeModal() {
    elements.newTaskModal.style.display = "none";
    elements.taskForm.reset();
    clearFormErrors();
    currentTask = null;

    // Resetear el flag de envío y el estado del botón
    isSubmittingTask = false;
    if (elements.submitButton) {
      elements.submitButton.disabled = false;
      elements.submitButton.textContent = "Crear Tarea";
    }
  }

  /**
   * Configura la validación en tiempo real del formulario
   */
  function setupTaskFormValidation() {
    const title = document.getElementById("task-title");
    const detail = document.getElementById("task-detail");
    const date = document.getElementById("task-date");
    const time = document.getElementById("task-time");
    const status = document.getElementById("task-status");

    // Agregar event listeners para validación en tiempo real
    [title, detail, date, time, status].forEach((input) => {
      input.addEventListener("input", validateForm);
      input.addEventListener("blur", validateForm);
    });
  }

  /**
   * Valida el formulario completo y actualiza la UI
   */
  function validateForm() {
    const title = document.getElementById("task-title").value.trim();
    const detail = document.getElementById("task-detail").value.trim();
    const date = document.getElementById("task-date").value;
    const time = document.getElementById("task-time").value;
    const status = document.getElementById("task-status").value;

    const errors = {};

    // Validación de título
    if (!title) {
      errors.title = "Completa este campo";
    } else if (title.length > 50) {
      errors.title = "Máx. 50 caracteres";
    }

    // Validación de detalle (opcional)
    if (detail && detail.length > 500) {
      errors.detail = "Máx. 500 caracteres";
    }

    // Validación de fecha
    if (!date) {
      errors.date = "Completa este campo";
    }

    // Validación de hora (opcional)
    if (time && time.trim() !== "") {
      if (!validateTime(time)) {
        errors.time = "Formato inválido. Usa HH:MM (ej: 14:30)";
      }
    }

    // Validación de estado
    if (!status) {
      errors.status = "Completa este campo";
    }

    // Mostrar errores
    showFormErrors(errors);

    // Deshabilitar botón si hay errores
    elements.submitButton.disabled = Object.keys(errors).length > 0;

    return Object.keys(errors).length === 0;
  }

  /**
   * Muestra los errores de validación en la UI
   * @param {Object} errors - Objeto con errores por campo
   */
  function showFormErrors(errors) {
    // Limpiar mensajes de error previos
    clearFormErrors();

    // Mensaje general en aria-live
    if (errors.general && errorLiveRegion) {
      errorLiveRegion.textContent = errors.general;
    }

    // Mostrar errores por campo
    ["title", "detail", "date", "time", "status"].forEach((field) => {
      if (errors[field]) {
        const input = document.getElementById(`task-${field}`);
        if (input) {
          // Buscar o crear el elemento de error
          let errorEl = input.nextElementSibling;
          if (!errorEl || !errorEl.classList.contains("field-error")) {
            errorEl = document.createElement("div");
            errorEl.className = "field-error";
            input.parentElement.appendChild(errorEl);
          }
          errorEl.textContent = errors[field];
          errorEl.style.display = "block";
        }
      }
    });
  }

  /**
   * Limpia todos los mensajes de error del formulario
   */
  function clearFormErrors() {
    // Limpiar región live
    if (errorLiveRegion) {
      errorLiveRegion.textContent = "";
    }

    // Limpiar errores individuales
    document.querySelectorAll(".field-error").forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });
  }

  /**
   * Muestra un toast con un mensaje al usuario
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo de mensaje (success, error, warning, info)
   */
  function showToast(message, type = "info") {
    // Usar el sistema de toast global
    switch (type) {
      case "success":
        toast.success(message);
        break;
      case "error":
        toast.error(message);
        break;
      case "warning":
        toast.warning(message);
        break;
      default:
        toast.info(message);
    }
  }

  /**
   * Muestra un spinner durante operaciones asíncronas
   * @param {boolean} show - Indica si se debe mostrar u ocultar el spinner
   */
  function showSpinner(show = true) {
    let spinner = document.getElementById("task-spinner");
    if (!spinner && show) {
      spinner = document.createElement("div");
      spinner.id = "task-spinner";
      spinner.className = "task-spinner";
      spinner.innerHTML = `<div class="spinner"></div>`;
      elements.taskForm.parentElement.appendChild(spinner);
    }

    if (spinner) {
      spinner.style.display = show ? "flex" : "none";
    }
  }

  /**
   * Oculta el spinner
   */
  function hideSpinner() {
    showSpinner(false);
  }

  /**
   * Maneja el envío del formulario de tarea
   * @param {Event} e - Evento de submit
   */
  async function handleTaskFormSubmit(e) {
    e.preventDefault();

    // Prevenir múltiples envíos
    if (isSubmittingTask) {
      console.log("Ya se está procesando una tarea, ignorando envío adicional");
      return;
    }

    // Validar el formulario antes de procesar
    if (!validateForm()) {
      return;
    }

    // Marcar como enviando
    isSubmittingTask = true;

    // Deshabilitar el botón de envío
    if (elements.submitButton) {
      elements.submitButton.disabled = true;
      elements.submitButton.textContent = currentTask
        ? "Actualizando..."
        : "Creando...";
    }

    // Preparar datos del formulario y compensar la fecha (sumar 1 día)
    const selectedDate = document.getElementById("task-date").value;
    let correctedDate = selectedDate;

    if (selectedDate) {
      try {
        // Sumar 1 día a la fecha seleccionada para compensar la resta visual
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + 1);
        correctedDate = date.toISOString().split("T")[0];
      } catch (error) {
        console.error("Error correcting date:", error);
        correctedDate = selectedDate; // Usar fecha original si hay error
      }
    }

    const formData = {
      title: document.getElementById("task-title").value.trim(),
      detail: document.getElementById("task-detail").value.trim(),
      date: correctedDate,
      time: document.getElementById("task-time").value.trim() || undefined,
      status: document.getElementById("task-status").value,
    };

    const taskId = document.getElementById("task-id").value;
    let serverResponse = null;

    try {
      // Mostrar spinner durante la operación
      showSpinner();

      if (taskId) {
        // Actualizar tarea existente
        await updateTask(taskId, formData);
        showToast("Tarea actualizada correctamente", "success");
      } else {
        // Crear nueva tarea
        serverResponse = await createTask(formData);
        showToast("Tarea creada correctamente", "success");

        // Si tenemos la respuesta del servidor, añadir la tarea localmente
        if (serverResponse && serverResponse._id) {
          tasks.push(serverResponse);
        }
      }

      // Ocultar spinner
      hideSpinner();

      // Cerrar modal
      closeModal();

      // Si no tenemos la tarea del servidor o estamos editando, cargar todas de nuevo
      if (taskId || !serverResponse || !serverResponse._id) {
        await loadTasks();
      }

      // Renderizar las tareas
      renderTasks();

      // Actualizar calendario si está activo
      if (currentView === "calendar" && taskCalendar) {
        taskCalendar.updateTasks(tasks);
      }
    } catch (error) {
      console.error("Error saving task:", error);

      // Ocultar spinner
      hideSpinner();

      // Mostrar mensaje de error
      showToast("No pudimos guardar tu tarea, inténtalo de nuevo", "error");

      // En modo desarrollo, mostrar detalles en la consola
      if (process.env.NODE_ENV === "development") {
        console.log("Detalles del error:", error);
      }
    } finally {
      // Restaurar estado del botón y flag
      isSubmittingTask = false;
      if (elements.submitButton) {
        elements.submitButton.disabled = false;
        elements.submitButton.textContent = currentTask
          ? "Actualizar Tarea"
          : "Crear Tarea";
      }
    }
  }

  /**
   * Crea una nueva tarea
   * @param {Object} taskData - Datos de la tarea
   */
  async function createTask(taskData) {
    try {
      // Simular un delay mínimo para el spinner (como máximo 2 segundos)
      const startTime = Date.now();

      // Crear la tarea en el backend
      const response = await post("/tasks", taskData);

      // Garantizar que el spinner se muestre por al menos 300ms para transiciones suaves
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 300) {
        await new Promise((resolve) => setTimeout(resolve, 300 - elapsedTime));
      }

      return response;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  }

  /**
   * Actualiza una tarea existente
   * @param {string} taskId - ID de la tarea
   * @param {Object} taskData - Nuevos datos de la tarea
   */
  async function updateTask(taskId, taskData) {
    try {
      await put(`/tasks/${taskId}`, taskData);
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  }

  /**
   * Elimina una tarea con opción de deshacer por 5 segundos
   * @param {string} taskId - ID de la tarea a eliminar
   */
  async function deleteTask(taskId) {
    // Buscar la tarea a eliminar
    const taskToDelete = tasks.find((task) => task._id === taskId);
    if (!taskToDelete) {
      toast.error("Tarea no encontrada");
      return;
    }

    // Mostrar confirmación mejorada
    const confirmed = await showDeleteConfirmation(
      "¿Estás seguro que deseas eliminar?",
      "Esta tarea será eliminada permanentemente y no se puede recuperar."
    );

    if (!confirmed) {
      return;
    }

    let isUndone = false;
    let timeoutId = null;

    try {
      // Remover tarea inmediatamente de la UI
      tasks = tasks.filter((task) => task._id !== taskId);
      updateTaskCounter();
      renderTasks();

      // Actualizar calendario si está activo
      if (currentView === "calendar" && taskCalendar) {
        taskCalendar.updateTasks(tasks);
      }

      // Mostrar toast de deshacer con 5 segundos para cancelar
      const undoToast = toast.undo(
        `Tarea "${taskToDelete.title}" eliminada`,
        () => {
          // Función de deshacer
          isUndone = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          // Restaurar tarea en la UI
          tasks.push(taskToDelete);
          tasks.sort((a, b) => new Date(a.date) - new Date(b.date));
          updateTaskCounter();
          renderTasks();

          // Actualizar calendario si está activo
          if (currentView === "calendar" && taskCalendar) {
            taskCalendar.updateTasks(tasks);
          }

          toast.info("Eliminación cancelada");
        },
        5000 // 5 segundos para deshacer
      );

      // Programar eliminación definitiva después de 5 segundos
      timeoutId = setTimeout(async () => {
        if (!isUndone) {
          try {
            // Mostrar spinner mientras se elimina definitivamente
            showSpinner();

            // Llamar al API para eliminar definitivamente
            await del(`/tasks/${taskId}`);

            // Ocultar spinner
            hideSpinner();

            toast.success("Tarea eliminada definitivamente");
          } catch (error) {
            console.error("Error deleting task permanently:", error);

            // Ocultar spinner
            hideSpinner();

            // Si falló la eliminación del servidor, restaurar la tarea
            tasks.push(taskToDelete);
            tasks.sort((a, b) => new Date(a.date) - new Date(b.date));
            updateTaskCounter();
            renderTasks();

            // Actualizar calendario si está activo
            if (currentView === "calendar" && taskCalendar) {
              taskCalendar.updateTasks(tasks);
            }

            toast.error(
              "Error al eliminar la tarea del servidor. Tarea restaurada."
            );
          }
        }
      }, 5000);
    } catch (error) {
      console.error("Error in delete task process:", error);

      // Restaurar tarea en caso de error
      tasks.push(taskToDelete);
      tasks.sort((a, b) => new Date(a.date) - new Date(b.date));
      updateTaskCounter();
      renderTasks();

      toast.error("Error al procesar eliminación. Tarea restaurada.");
    }
  }

  /**
   * Eliminar todas las tareas de una columna específica con opción de deshacer
   */
  async function handleDeleteAllTasks(column) {
    // Mapear las columnas a los estados reales
    const columnStatusMap = {
      todo: "Por hacer",
      doing: "Haciendo",
      done: "Hecho",
    };

    const actualStatus = columnStatusMap[column];

    // Filtrar tareas de la columna específica
    const tasksInColumn = tasks.filter((task) => task.status === actualStatus);

    if (tasksInColumn.length === 0) {
      toast.info(
        `No hay tareas en la columna "${getColumnDisplayName(column)}"`
      );
      return;
    }

    const columnName = getColumnDisplayName(column);

    // Mostrar confirmación mejorada
    const confirmed = await showDeleteConfirmation(
      "¿Estás seguro que deseas eliminar?",
      `Se eliminarán todas las ${tasksInColumn.length} tareas de la columna "${columnName}". Tendrás 5 segundos para deshacer la acción.`
    );

    if (!confirmed) {
      return;
    }

    let isUndone = false;
    let timeoutId = null;

    try {
      // Remover tareas inmediatamente de la UI
      tasks = tasks.filter((task) => task.status !== actualStatus);
      updateTaskCounter();
      renderTasks();

      // Actualizar calendario si está activo
      if (currentView === "calendar" && taskCalendar) {
        taskCalendar.updateTasks(tasks);
      }

      // Mostrar toast de deshacer con 5 segundos para cancelar
      const undoToast = toast.undo(
        `${tasksInColumn.length} tareas eliminadas de "${columnName}"`,
        () => {
          // Función de deshacer
          isUndone = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          // Restaurar todas las tareas en la UI
          tasks.push(...tasksInColumn);
          tasks.sort((a, b) => new Date(a.date) - new Date(b.date));
          updateTaskCounter();
          renderTasks();

          // Actualizar calendario si está activo
          if (currentView === "calendar" && taskCalendar) {
            taskCalendar.updateTasks(tasks);
          }

          toast.info("Eliminación masiva cancelada");
        },
        5000 // 5 segundos para deshacer
      );

      // Programar eliminación definitiva después de 5 segundos
      timeoutId = setTimeout(async () => {
        if (!isUndone) {
          try {
            // Mostrar spinner mientras se eliminan definitivamente
            showSpinner();

            // Crear array de promesas para eliminar todas las tareas del servidor
            const deletePromises = tasksInColumn.map((task) =>
              del(`/tasks/${task._id}`)
            );

            // Ejecutar todas las eliminaciones en paralelo
            await Promise.all(deletePromises);

            // Ocultar spinner
            hideSpinner();

            toast.success(
              `${tasksInColumn.length} tareas eliminadas definitivamente de "${columnName}"`
            );
          } catch (error) {
            console.error("Error deleting all tasks permanently:", error);

            // Ocultar spinner
            hideSpinner();

            // Si falló la eliminación del servidor, restaurar las tareas
            tasks.push(...tasksInColumn);
            tasks.sort((a, b) => new Date(a.date) - new Date(b.date));
            updateTaskCounter();
            renderTasks();

            // Actualizar calendario si está activo
            if (currentView === "calendar" && taskCalendar) {
              taskCalendar.updateTasks(tasks);
            }

            toast.error(
              `Error al eliminar las tareas del servidor. Tareas de "${columnName}" restauradas.`
            );
          }
        }
      }, 5000);
    } catch (error) {
      console.error("Error in delete all tasks process:", error);

      // Restaurar tareas en caso de error
      tasks.push(...tasksInColumn);
      tasks.sort((a, b) => new Date(a.date) - new Date(b.date));
      updateTaskCounter();
      renderTasks();

      toast.error("Error al procesar eliminación masiva. Tareas restauradas.");
    }
  }

  /**
   * Obtener el nombre de visualización de una columna
   */
  function getColumnDisplayName(column) {
    const columnNames = {
      todo: "Por hacer",
      doing: "En proceso",
      done: "Completado",
    };
    return columnNames[column] || column;
  }

  /**
   * Handle responsive layout changes
   */
  function handleResponsiveLayout() {
    const desktopElements = document.querySelectorAll(".desktop-only");
    const mobileElements = document.querySelectorAll(".mobile-only");

    if (window.innerWidth <= 768) {
      // Mobile layout
      desktopElements.forEach((el) => {
        el.style.display = "none";
      });
      mobileElements.forEach((el) => {
        el.style.display = "block";
      });
    } else {
      // Desktop layout
      desktopElements.forEach((el) => {
        el.style.display = "flex";
      });
      mobileElements.forEach((el) => {
        el.style.display = "none";
      });
    }
  }

  /**
   * Toggle mobile menu visibility
   */
  function toggleMobileMenu() {
    if (elements.hamburgerButton && elements.headerNav) {
      const isOpen = elements.headerNav.classList.contains("open");

      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    }
  }

  /**
   * Open mobile menu
   */
  function openMobileMenu() {
    if (elements.hamburgerButton && elements.headerNav) {
      elements.hamburgerButton.classList.add("active");
      elements.headerNav.classList.add("open");
    }
  }

  /**
   * Alterna entre vista kanban y calendario
   */
  function toggleView() {
    if (currentView === "kanban") {
      showCalendarView();
    } else {
      showKanbanView();
    }
  }

  /**
   * Muestra la vista del calendario
   */
  function showCalendarView() {
    currentView = "calendar";

    // Actualizar texto del botón
    if (elements.viewToggleText) {
      elements.viewToggleText.textContent = "Mirar Tablero de tareas";
    }

    // Ocultar contenido kanban
    const tasksMainContainer = document.getElementById("tasks-main-container");
    if (tasksMainContainer) {
      tasksMainContainer.style.display = "none";
    }

    // Buscar si ya existe un calendario en el DOM
    let calendarContainer = document.querySelector(".task-calendar");

    if (calendarContainer) {
      // Si existe, solo mostrarlo y actualizar las tareas
      calendarContainer.style.display = "flex";
      if (taskCalendar) {
        taskCalendar.updateTasks(tasks);
      }
    } else {
      // Si no existe, crear uno nuevo
      if (!taskCalendar) {
        taskCalendar = new TaskCalendar(
          tasks,
          handleTaskUpdateFromCalendar,
          handleTaskCreateFromCalendar,
          handleTaskDeleteFromCalendar
        );
      } else {
        // Actualizar tareas en el calendario existente
        taskCalendar.updateTasks(tasks);
      }

      // Insertar calendario en el contenedor principal
      const mainCard = document.querySelector(".tasks-main-card");
      if (mainCard) {
        mainCard.appendChild(taskCalendar.getContainer());
      }
    }
  }

  /**
   * Muestra la vista kanban
   */
  function showKanbanView() {
    currentView = "kanban";

    // Actualizar texto del botón
    if (elements.viewToggleText) {
      elements.viewToggleText.textContent = "Mirar Calendario";
    }

    // Mostrar contenido kanban
    const tasksMainContainer = document.getElementById("tasks-main-container");
    if (tasksMainContainer) {
      tasksMainContainer.style.display = "block";
    }

    // Ocultar calendario
    const calendarContainer = document.querySelector(".task-calendar");
    if (calendarContainer) {
      calendarContainer.style.display = "none";
    }
  }

  /**
   * Maneja la actualización de tareas desde el calendario
   */
  async function handleTaskUpdateFromCalendar(task) {
    try {
      // Abrir modal de edición con la tarea
      openEditTaskModal(task);
    } catch (error) {
      console.error("Error updating task from calendar:", error);
      toast.error("Error al actualizar la tarea");
    }
  }

  /**
   * Maneja la creación de tareas desde el calendario
   */
  async function handleTaskCreateFromCalendar(taskData) {
    try {
      const response = await createTask(taskData);

      if (response && response._id) {
        // Añadir tarea al array local
        tasks.push(response);

        // Actualizar contador
        updateTaskCounter();

        // Actualizar calendario
        if (taskCalendar) {
          taskCalendar.updateTasks(tasks);
        }

        // Actualizar vista kanban también (si es necesario)
        if (currentView === "kanban") {
          renderTasks();
        }
      }

      return response;
    } catch (error) {
      console.error("Error creating task from calendar:", error);
      throw error;
    }
  }

  /**
   * Maneja la eliminación de tareas desde el calendario
   */
  async function handleTaskDeleteFromCalendar(taskId) {
    try {
      await deleteTask(taskId);

      // Actualizar calendario
      if (taskCalendar) {
        taskCalendar.updateTasks(tasks);
      }
    } catch (error) {
      console.error("Error deleting task from calendar:", error);
      throw error;
    }
  }

  /**
   * Close mobile menu
   */
  function closeMobileMenu() {
    if (elements.hamburgerButton && elements.headerNav) {
      elements.hamburgerButton.classList.remove("active");
      elements.headerNav.classList.remove("open");
    }
  }

  /**
   * Configurar drag and drop solo para las tareas
   */
  function setupTaskDragListeners() {
    document.querySelectorAll(".task-card").forEach((taskCard) => {
      addDragEventListeners(taskCard);
    });
  }

  /**
   * Configura la delegación de eventos para botones de acción de tareas
   * Usando event delegation para mayor robustez y evitar problemas después de re-renders
   */
  function setupTaskActionDelegation() {
    console.log("Setting up task action delegation...");

    // Remover listener anterior si existe para evitar duplicados
    if (elements.kanbanBoard) {
      elements.kanbanBoard.removeEventListener("click", handleTaskActionClick);
      // Agregar nuevo listener de delegación
      elements.kanbanBoard.addEventListener("click", handleTaskActionClick);
    }

    console.log("Task action delegation configured");
  }

  /**
   * Maneja clicks en botones de acción de tareas usando delegación
   * @param {Event} e - Evento de click
   */
  function handleTaskActionClick(e) {
    // Verificar si el click fue en un botón de editar o eliminar
    const editBtn = e.target.closest(".edit-task-btn");
    const deleteBtn = e.target.closest(".delete-task-btn");

    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();

      const taskId = editBtn.getAttribute("data-id");
      const task = tasks.find((t) => t._id === taskId);

      if (task) {
        console.log("Edit button clicked for task:", task._id);
        openEditTaskModal(task);
      } else {
        console.error("Task not found for edit:", taskId);
        toast.error("Tarea no encontrada");
      }
    } else if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();

      const taskId = deleteBtn.getAttribute("data-id");

      if (taskId) {
        console.log("Delete button clicked for task:", taskId);
        deleteTask(taskId);
      } else {
        console.error("No task ID found for delete button");
        toast.error("ID de tarea no encontrado");
      }
    }
  }

  // Variables globales para drag and drop
  let draggedElement = null;

  /**
   * Agregar event listeners de drag and drop a una tarea específica
   */
  function addDragEventListeners(taskCard) {
    taskCard.addEventListener("dragstart", handleDragStart);
    taskCard.addEventListener("dragend", handleDragEnd);
  }

  /**
   * Manejar inicio de drag
   */
  function handleDragStart(e) {
    draggedElement = e.target;
    e.target.style.opacity = "0.5";
    e.target.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.target.outerHTML);
  }

  /**
   * Manejar fin de drag
   */
  function handleDragEnd(e) {
    // Restablecer el estado visual del elemento
    if (e.target) {
      e.target.style.opacity = "1";
      e.target.classList.remove("dragging");
    }

    // Limpiar la referencia global
    draggedElement = null;

    // Limpiar estados visuales de las columnas
    document.querySelectorAll(".tasks-container").forEach((container) => {
      container.classList.remove("drag-over");
    });
  }

  /**
   * Manejar drag over
   */
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  /**
   * Manejar drag enter
   */
  function handleDragEnter(e) {
    e.preventDefault();
    if (e.target.classList.contains("tasks-container")) {
      e.target.classList.add("drag-over");
    }
  }

  /**
   * Manejar drag leave
   */
  function handleDragLeave(e) {
    if (e.target.classList.contains("tasks-container")) {
      // Solo remover si realmente salimos del contenedor
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;

      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        e.target.classList.remove("drag-over");
      }
    }
  }

  /**
   * Manejar drop
   */
  async function handleDrop(e) {
    e.preventDefault();

    // Verificar que tenemos un elemento siendo arrastrado
    if (!draggedElement) {
      console.error("No hay elemento siendo arrastrado");
      return;
    }

    // Buscar el contenedor de tareas más cercano
    let targetContainer = e.target;
    if (!targetContainer.classList.contains("tasks-container")) {
      targetContainer = targetContainer.closest(".tasks-container");
    }

    if (!targetContainer) {
      console.error("No se encontró un contenedor de tareas válido");
      // Limpiar estado
      if (draggedElement) {
        draggedElement.style.opacity = "1";
        draggedElement.classList.remove("dragging");
      }
      return;
    }

    // Verificar que el elemento arrastrado aún existe y tiene los datos necesarios
    if (!draggedElement.dataset || !draggedElement.dataset.id) {
      console.error("Elemento arrastrado no tiene datos válidos");
      targetContainer.classList.remove("drag-over");
      return;
    }

    const taskId = draggedElement.dataset.id;
    const currentStatus = draggedElement.dataset.status;

    // Determinar el nuevo estado basado en la columna destino
    let newStatus;
    const columnElement = targetContainer.closest(".kanban-column");
    const titleElement = columnElement?.querySelector("h2");

    if (!columnElement || !titleElement) {
      console.error("No se pudo encontrar la columna o el título");
      targetContainer.classList.remove("drag-over");
      return;
    }

    const columnTitle = titleElement.textContent;

    if (columnTitle === "Por hacer") {
      newStatus = "Por hacer";
    } else if (columnTitle === "En proceso") {
      newStatus = "Haciendo";
    } else if (columnTitle === "Completado") {
      newStatus = "Hecho";
    } else {
      console.error("Título de columna no reconocido:", columnTitle);
      targetContainer.classList.remove("drag-over");
      return;
    }

    // Si el estado no cambia, solo mover visualmente
    if (currentStatus === newStatus) {
      // Verificar que el elemento no esté ya en el contenedor destino
      if (draggedElement.parentNode !== targetContainer) {
        draggedElement.remove();
        targetContainer.appendChild(draggedElement);
      }
      targetContainer.classList.remove("drag-over");
      // Restablecer el estilo del elemento
      draggedElement.style.opacity = "1";
      draggedElement.classList.remove("dragging");
      return;
    }

    // Guardar referencia del contenedor original para rollback si es necesario
    const originalContainer = draggedElement.parentNode;

    try {
      // Actualizar el estado en el backend ANTES de mover visualmente
      const response = await put(`/tasks/${taskId}`, {
        status: newStatus,
      });

      if (response) {
        // Solo proceder si la actualización fue exitosa
        // Actualizar el estado en el array de tareas local
        const taskIndex = tasks.findIndex((task) => task._id === taskId);
        if (taskIndex !== -1) {
          tasks[taskIndex].status = newStatus;
        }

        // Re-renderizar todas las tareas para mostrar los cambios inmediatamente
        renderTasks();

        // Limpiar estado visual
        targetContainer.classList.remove("drag-over");

        // Limpiar la referencia del elemento arrastrado
        draggedElement = null;

        // Mostrar mensaje de feedback
        toast.success(`Tarea movida a "${columnTitle}"`);
      } else {
        throw new Error("Error al actualizar el estado de la tarea");
      }
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("No se pudo actualizar el estado de la tarea");

      // Restablecer el estado visual del elemento arrastrado
      if (draggedElement) {
        draggedElement.style.opacity = "1";
        draggedElement.classList.remove("dragging");
      }

      // Limpiar estado visual sin mover la tarea
      targetContainer.classList.remove("drag-over");

      // Limpiar la referencia del elemento arrastrado
      draggedElement = null;
    }
  }

  /**
   * Función para mostrar confirmación de eliminación personalizada
   * @param {string} title - Título del modal
   * @param {string} message - Mensaje del modal
   * @returns {Promise<boolean>} - True si confirma, false si cancela
   */
  function showDeleteConfirmation(title, message) {
    return new Promise((resolve) => {
      // Crear modal si no existe
      let modal = document.getElementById("delete-confirmation-modal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "delete-confirmation-modal";
        modal.className = "modal";
        modal.innerHTML = `
          <div class="modal-content">
            <div class="modal-header">
              <h3 id="delete-modal-title">${title}</h3>
              <button class="modal-close" id="delete-modal-close">&times;</button>
            </div>
            <div class="modal-body">
              <p id="delete-modal-message">${message}</p>
            </div>
            <div class="modal-footer">
              <button id="delete-cancel-btn" class="btn-secondary">Cancelar</button>
              <button id="delete-confirm-btn" class="btn-danger">Eliminar</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      } else {
        // Actualizar contenido del modal existente
        document.getElementById("delete-modal-title").textContent = title;
        document.getElementById("delete-modal-message").textContent = message;
      }

      // Mostrar modal
      modal.style.display = "flex";

      // Event listeners
      const handleCancel = () => {
        modal.style.display = "none";
        resolve(false);
      };

      const handleConfirm = () => {
        modal.style.display = "none";
        resolve(true);
      };

      // Agregar event listeners
      document.getElementById("delete-cancel-btn").onclick = handleCancel;
      document.getElementById("delete-confirm-btn").onclick = handleConfirm;
      document.getElementById("delete-modal-close").onclick = handleCancel;

      // Cerrar al hacer click fuera del modal
      modal.onclick = (e) => {
        if (e.target === modal) {
          handleCancel();
        }
      };
    });
  }
}
