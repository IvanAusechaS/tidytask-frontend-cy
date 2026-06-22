// src/components/calendar.js
import { get, post, put, del } from "../services/api.js";
import toast from "../utils/toast.js";

/**
 * Calendario tipo Google Calendar para gestión de tareas
 * @param {Array} tasks - Array de tareas del usuario
 * @param {Function} onTaskUpdate - Callback para actualizar tareas
 * @param {Function} onTaskCreate - Callback para crear nueva tarea
 * @param {Function} onTaskDelete - Callback para eliminar tarea
 */
export default class TaskCalendar {
  constructor(tasks = [], onTaskUpdate, onTaskCreate, onTaskDelete) {
    this.tasks = tasks;
    this.onTaskUpdate = onTaskUpdate;
    this.onTaskCreate = onTaskCreate;
    this.onTaskDelete = onTaskDelete;
    this.currentDate = new Date();
    this.currentView = "week"; // 'day' o 'week'
    this.selectedDate = new Date();
    this.container = null;
    this.isCreatingTask = false;

    // Configuración de horarios
    this.startHour = 0; // 12 AM (medianoche)
    this.endHour = 23; // 11 PM
    this.hourHeight = 80; // pixels por hora (actualizado para mejor visualización)

    this.init();
  }

  init() {
    this.createCalendarStructure();
    this.setupEventListeners();
    this.render();
  }

  createCalendarStructure() {
    this.container = document.createElement("div");
    this.container.className = "task-calendar";
    this.container.setAttribute("data-view", this.currentView); // Add data attribute for CSS styling
    this.container.innerHTML = `
      <div class="calendar-header">
        <div class="calendar-controls">
          <button class="calendar-nav-btn" id="calendar-prev">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15,18 9,12 15,6"></polyline>
            </svg>
          </button>
          <div class="calendar-date-info">
            <h2 id="calendar-current-date">${this.formatCurrentDate()}</h2>
            <button class="btn-today" id="calendar-today">Hoy</button>
          </div>
          <button class="calendar-nav-btn" id="calendar-next">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
        </div>
        
        <div class="calendar-view-controls">
          <div class="view-toggle">
            <button class="view-btn ${
              this.currentView === "day" ? "active" : ""
            }" data-view="day">Día</button>
            <button class="view-btn ${
              this.currentView === "week" ? "active" : ""
            }" data-view="week">Semana</button>
          </div>
        </div>
      </div>
      
      <div class="calendar-content">
        <!-- Tabla del calendario con headers fijos -->
        <div class="calendar-table-container">
          <table class="calendar-table">
            <!-- Headers de la tabla (día/hora y días de la semana) -->
            <thead class="calendar-table-header">
              <tr class="calendar-header-row">
                <th class="${this.getTimeHeaderClass()}">Hora</th>
                ${this.generateDayHeaderCells()}
              </tr>
            </thead>
            <!-- Cuerpo de la tabla con las horas y celdas de tareas -->
            <tbody class="calendar-table-body" id="calendar-table-body">
              ${this.generateTableRows()}
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Modal rápido para crear tarea -->
      <div class="quick-task-modal" id="quick-task-modal" style="display: none;">
        <div class="quick-task-content">
          <div class="quick-task-header">
            <h3>Nueva Tarea</h3>
            <button class="close-quick-task" id="close-quick-task">&times;</button>
          </div>
          <form id="quick-task-form">
            <input type="text" id="quick-task-title" placeholder="Título de la tarea" required>
            <textarea id="quick-task-detail" placeholder="Descripción (opcional)"></textarea>
            <div class="quick-task-time">
              <label>Fecha:</label>
              <input type="date" id="quick-task-date" required>
            </div>
            <div class="quick-task-time">
              <label>Hora límite:</label>
              <input type="time" id="quick-task-time">
            </div>
            <div class="quick-task-actions">
              <button type="button" class="btn-cancel" id="cancel-quick-task">Cancelar</button>
              <button type="submit" class="btn-create">Crear Tarea</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Navegación
    this.container
      .querySelector("#calendar-prev")
      .addEventListener("click", () => this.navigatePrevious());
    this.container
      .querySelector("#calendar-next")
      .addEventListener("click", () => this.navigateNext());
    this.container
      .querySelector("#calendar-today")
      .addEventListener("click", () => this.goToToday());

    // Cambio de vista
    this.container.querySelectorAll(".view-btn").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.changeView(e.target.dataset.view)
      );
    });

    // Creación rápida de tareas
    this.container.addEventListener("click", (e) => this.handleTableClick(e));

    // Modal de tarea rápida
    this.container
      .querySelector("#close-quick-task")
      .addEventListener("click", () => this.closeQuickTaskModal());
    this.container
      .querySelector("#cancel-quick-task")
      .addEventListener("click", () => this.closeQuickTaskModal());
    this.container
      .querySelector("#quick-task-form")
      .addEventListener("submit", (e) => this.handleQuickTaskSubmit(e));

    // Cerrar modal al hacer click fuera
    this.container
      .querySelector("#quick-task-modal")
      .addEventListener("click", (e) => {
        if (e.target.id === "quick-task-modal") {
          this.closeQuickTaskModal();
        }
      });

    // Configurar eventos específicos de la tabla
    this.setupTableEventListeners();
  }

  setupTableEventListeners() {
    // Los eventos específicos de la tabla se configuran aquí
    // Este método se llama después de regenerar la tabla
  }

  getTimeHeaderClass() {
    return this.currentView === "day"
      ? "time-header-cell-day"
      : "time-header-cell-week";
  }

  getTimeCellClass() {
    return this.currentView === "day" ? "time-cell-day" : "time-cell-week";
  }

  handleTableClick(e) {
    // Similar a handleGridClick pero para estructura de tabla
    if (e.target.classList.contains("task-cell") && !this.isCreatingTask) {
      const cell = e.target;
      const date = cell.dataset.date;
      const hour = parseInt(cell.dataset.hour);

      this.showQuickTaskModal(date, hour);
    }
  }

  generateDayHeaderCells() {
    const daysToShow = this.currentView === "day" ? 1 : 7;
    let headerCells = "";

    for (let i = 0; i < daysToShow; i++) {
      const date = this.getDateForColumn(i);
      const isToday = this.isToday(date);
      headerCells += `
        <th class="day-header-cell ${isToday ? "today" : ""}">
          <div class="day-name">${this.getDayName(date)}</div>
          <div class="day-number">${date.getDate()}</div>
        </th>
      `;
    }
    return headerCells;
  }

  generateTableRows() {
    const daysToShow = this.currentView === "day" ? 1 : 7;
    let rows = "";

    for (let hour = this.startHour; hour <= this.endHour; hour++) {
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? "AM" : "PM";

      rows += `<tr class="calendar-hour-row" data-hour="${hour}">`;

      // Celda de la hora
      rows += `
        <td class="${this.getTimeCellClass()}">
          <span class="time-label">${displayHour}:00 ${ampm}</span>
        </td>
      `;

      // Celdas de los días
      for (let day = 0; day < daysToShow; day++) {
        const date = this.getDateForColumn(day);
        const cellId = `cell-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${hour}`;
        rows += `
          <td class="task-cell" 
              data-date="${date.toISOString().split("T")[0]}" 
              data-hour="${hour}"
              id="${cellId}">
          </td>
        `;
      }

      rows += "</tr>";
    }

    return rows;
  }

  generateDayHeaders() {
    const daysToShow = this.currentView === "day" ? 1 : 7;
    let headers = "";

    for (let i = 0; i < daysToShow; i++) {
      const date = this.getDateForColumn(i);
      const isToday = this.isToday(date);
      headers += `
        <div class="day-header ${isToday ? "today" : ""}">
          <div class="day-name">${this.getDayName(date)}</div>
          <div class="day-number">${date.getDate()}</div>
        </div>
      `;
    }
    return headers;
  }

  generateTimeSlots() {
    let slots = "";
    for (let hour = this.startHour; hour <= this.endHour; hour++) {
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? "AM" : "PM";
      slots += `
        <div class="time-slot">
          <span class="time-label">${displayHour}:00 ${ampm}</span>
        </div>
      `;
    }
    return slots;
  }

  generateCalendarGrid() {
    const daysToShow = this.currentView === "day" ? 1 : 7;
    let grid = "";

    // Solo generar grid de horas (sin headers, ya están arriba)
    grid += '<div class="calendar-hours-grid">';
    for (let hour = this.startHour; hour <= this.endHour; hour++) {
      grid += '<div class="hour-row">';
      for (let day = 0; day < daysToShow; day++) {
        const date = this.getDateForColumn(day);
        const cellId = `cell-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${hour}`;
        grid += `
          <div class="hour-cell" 
               data-date="${date.toISOString().split("T")[0]}" 
               data-hour="${hour}"
               id="${cellId}">
          </div>
        `;
      }
      grid += "</div>";
    }
    grid += "</div>";

    return grid;
  }

  getDateForColumn(columnIndex) {
    const date = new Date(this.currentDate);

    if (this.currentView === "day") {
      return date;
    } else {
      // Vista semanal - empezar desde el lunes
      const dayOfWeek = date.getDay();
      const monday = new Date(date);
      monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      monday.setDate(monday.getDate() + columnIndex);
      return monday;
    }
  }

  formatCurrentDate() {
    if (this.currentView === "day") {
      return this.currentDate.toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } else {
      const startOfWeek = this.getDateForColumn(0);
      const endOfWeek = this.getDateForColumn(6);

      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${startOfWeek.toLocaleDateString(
          "es-ES",
          { month: "long", year: "numeric" }
        )}`;
      } else {
        return `${startOfWeek.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
        })} - ${endOfWeek.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`;
      }
    }
  }

  getDayName(date) {
    if (this.currentView === "day") {
      return "";
    }
    return date.toLocaleDateString("es-ES", { weekday: "short" }).toUpperCase();
  }

  isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  navigatePrevious() {
    if (this.currentView === "day") {
      this.currentDate.setDate(this.currentDate.getDate() - 1);
    } else {
      this.currentDate.setDate(this.currentDate.getDate() - 7);
    }
    this.render();
  }

  navigateNext() {
    if (this.currentView === "day") {
      this.currentDate.setDate(this.currentDate.getDate() + 1);
    } else {
      this.currentDate.setDate(this.currentDate.getDate() + 7);
    }
    this.render();
  }

  goToToday() {
    this.currentDate = new Date();
    this.render();
  }

  changeView(view) {
    this.currentView = view;

    // Update data attribute for CSS styling
    this.container.setAttribute("data-view", view);

    // Actualizar botones activos
    this.container.querySelectorAll(".view-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });

    this.render();
  }

  render() {
    // Actualizar fecha en header
    this.container.querySelector("#calendar-current-date").textContent =
      this.formatCurrentDate();

    // Regenerar headers de días (th)
    const headerRow = this.container.querySelector(".calendar-header-row");
    if (headerRow) {
      headerRow.innerHTML = `
        <th class="${this.getTimeHeaderClass()}">Hora</th>
        ${this.generateDayHeaderCells()}
      `;
    }

    // Regenerar filas de la tabla
    const tableBody = this.container.querySelector("#calendar-table-body");
    if (tableBody) {
      tableBody.innerHTML = this.generateTableRows();
    }

    // Reconfigurar eventos después de regenerar contenido
    this.setupTableEventListeners();

    // Renderizar tareas
    this.renderTasks();
  }

  renderTasks() {
    // Limpiar todas las tareas existentes antes de renderizar
    this.clearExistingTasks();

    // Renderizar tareas actualizadas
    this.tasks.forEach((task) => {
      this.renderTask(task);
    });
  }

  clearExistingTasks() {
    // Remover todas las tareas existentes del calendario
    const existingTasks = this.container.querySelectorAll(".calendar-task");
    existingTasks.forEach((task) => task.remove());
  }

  // Método para agregar una sola tarea sin afectar las demás
  addSingleTask(task) {
    // Verificar si la tarea ya existe para evitar duplicados
    const existingTask = this.container.querySelector(
      `[data-task-id="${task._id}"]`
    );
    if (existingTask) {
      existingTask.remove(); // Remover la versión anterior
    }

    // Renderizar la nueva tarea
    this.renderTask(task);
  }

  renderTask(task) {
    const taskDate = new Date(task.date);
    const dateStr = taskDate.toISOString().split("T")[0];

    // Buscar la celda correspondiente en la tabla
    const cells = this.container.querySelectorAll(
      `.task-cell[data-date="${dateStr}"]`
    );

    if (cells.length === 0) return; // Tarea fuera del rango visible

    // Si la tarea tiene hora específica, colocarla en esa celda
    if (task.time) {
      const [hours, minutes] = task.time.split(":").map(Number);
      const targetCell = this.container.querySelector(
        `.task-cell[data-date="${dateStr}"][data-hour="${hours}"]`
      );

      if (targetCell) {
        const taskElement = this.createTaskElement(task, true);
        // En una tabla, no necesitamos posicionamiento absoluto como antes
        taskElement.style.position = "relative";
        if (minutes > 0) {
          taskElement.style.marginTop = `${(minutes / 60) * 20}px`; // Ajuste menor para tabla
        }
        targetCell.appendChild(taskElement);
      }
    } else {
      // Si no tiene hora, colocarla en la primera celda del día
      const firstCell = cells[0];
      if (firstCell) {
        const taskElement = this.createTaskElement(task, false);
        taskElement.style.position = "relative";
        firstCell.appendChild(taskElement);
      }
    }
  }

  createTaskElement(task, hasTime = false) {
    const taskDiv = document.createElement("div");
    taskDiv.className = `calendar-task ${task.status
      .toLowerCase()
      .replace(" ", "-")}`;
    taskDiv.dataset.taskId = task._id;

    taskDiv.innerHTML = `
      <div class="task-content">
        <div class="task-title">${task.title}</div>
        ${
          task.time
            ? `<div class="task-time">${this.formatTime(task.time)}</div>`
            : ""
        }
        ${task.detail ? `<div class="task-detail">${task.detail}</div>` : ""}
      </div>
      <div class="task-status-indicator status-${task.status
        .toLowerCase()
        .replace(" ", "-")}"></div>
    `;

    // Event listeners para la tarea
    taskDiv.addEventListener("click", (e) => {
      e.stopPropagation();
      this.handleTaskClick(task);
    });

    return taskDiv;
  }

  calculateEndTime(startTime) {
    // Calcular hora de fin basada en duración estimada (1 hora por defecto)
    const [hours, minutes] = startTime.split(":").map(Number);
    const endHour = hours + 1;
    const endMinutes = minutes;

    if (endHour > 23) return null; // No mostrar si pasa de medianoche

    return `${endHour.toString().padStart(2, "0")}:${endMinutes
      .toString()
      .padStart(2, "0")}`;
  }

  formatTime(time) {
    const [hours, minutes] = time.split(":").map(Number);
    const hour12 = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  }

  handleGridClick(e) {
    if (e.target.classList.contains("hour-cell") && !this.isCreatingTask) {
      const date = e.target.dataset.date;
      const hour = e.target.dataset.hour;

      this.openQuickTaskModal(date, hour);
    }
  }

  handleTaskClick(task) {
    // Mostrar modal de confirmación para editar la tarea
    this.showEditTaskModal(task);
    // Si el callback de editar no está definido, mostrar advertencia
    if (!this.onTaskUpdate) {
      toast.warning("Función de edición no disponible");
    }
  }

  showEditTaskModal(task) {
    // Crear modal de edición si no existe
    let editModal = this.container.querySelector("#edit-task-modal");
    if (!editModal) {
      editModal = document.createElement("div");
      editModal.id = "edit-task-modal";
      editModal.className = "edit-task-modal";
      editModal.innerHTML = `
        <div class="edit-task-content">
          <div class="edit-task-header">
            <h3>Editar Tarea</h3>
            <button class="close-edit-task" id="close-edit-task">&times;</button>
          </div>
          <div class="edit-task-body">
            <p>¿Deseas editar la tarea "<span id="edit-task-title"></span>"?</p>
            <div class="edit-task-actions">
              <button class="btn-cancel" id="cancel-edit-task">Cancelar</button>
              <button class="btn-edit" id="confirm-edit-task">Editar</button>
            </div>
          </div>
        </div>
      `;
      this.container.appendChild(editModal);

      // Configurar event listeners del modal
      editModal
        .querySelector("#close-edit-task")
        .addEventListener("click", () => {
          this.closeEditTaskModal();
        });
      editModal
        .querySelector("#cancel-edit-task")
        .addEventListener("click", () => {
          this.closeEditTaskModal();
        });
      editModal.addEventListener("click", (e) => {
        if (e.target.id === "edit-task-modal") {
          this.closeEditTaskModal();
        }
      });
    }

    // Configurar contenido del modal
    editModal.querySelector("#edit-task-title").textContent = task.title;
    editModal.querySelector("#confirm-edit-task").onclick = () => {
      this.closeEditTaskModal();
      if (typeof this.onTaskUpdate === "function") {
        this.onTaskUpdate(task);
      } else {
        toast.warning("No se puede editar la tarea: función no disponible");
      }
    };

    // Mostrar modal
    editModal.style.display = "flex";
  }

  closeEditTaskModal() {
    const editModal = this.container.querySelector("#edit-task-modal");
    if (editModal) {
      editModal.style.display = "none";
    }
  }

  showQuickTaskModal(date, hour) {
    const modal = this.container.querySelector("#quick-task-modal");
    const form = this.container.querySelector("#quick-task-form");

    // Configurar fecha y hora por defecto
    this.container.querySelector("#quick-task-date").value = date;
    if (hour !== undefined) {
      this.container.querySelector("#quick-task-time").value = `${hour
        .toString()
        .padStart(2, "0")}:00`;
    }

    // Limpiar formulario
    form.reset();
    this.container.querySelector("#quick-task-date").value = date;
    if (hour !== undefined) {
      this.container.querySelector("#quick-task-time").value = `${hour
        .toString()
        .padStart(2, "0")}:00`;
    }

    modal.style.display = "flex";
    this.container.querySelector("#quick-task-title").focus();
    this.isCreatingTask = true;
  }

  closeQuickTaskModal() {
    const modal = this.container.querySelector("#quick-task-modal");
    modal.style.display = "none";
    this.isCreatingTask = false;
  }

  async handleQuickTaskSubmit(e) {
    e.preventDefault();

    const formData = {
      title: this.container.querySelector("#quick-task-title").value.trim(),
      detail: this.container.querySelector("#quick-task-detail").value.trim(),
      date: this.container.querySelector("#quick-task-date").value,
      time: this.container.querySelector("#quick-task-time").value || undefined,
      status: "Por hacer",
    };

    if (!formData.title) {
      toast.error("El título es requerido");
      return;
    }

    try {
      // Crear tarea usando el callback
      if (this.onTaskCreate) {
        const newTask = await this.onTaskCreate(formData);

        if (newTask) {
          // Agregar la nueva tarea inmediatamente al array local
          this.tasks.push(newTask);

          // Renderizar solo la nueva tarea sin limpiar todo
          this.addSingleTask(newTask);

          toast.success("Tarea creada exitosamente");
          this.closeQuickTaskModal();
        }
      }
    } catch (error) {
      console.error("Error creating task from calendar:", error);
      toast.error("Error al crear la tarea");
    }
  }

  // Método para actualizar las tareas desde el exterior
  updateTasks(newTasks) {
    this.tasks = newTasks;
    // Solo renderizar tareas, no toda la estructura del calendario
    this.renderTasks();
  }

  // Método para obtener el contenedor del calendario
  getContainer() {
    return this.container;
  }

  // Método para limpiar event listeners al destruir
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
