/**
 * Logger estructurado para el frontend de TidyTask.
 *
 * Implementa logging estructurado en JSON para el entorno de navegador.
 * No existe una libreria idiomatica equivalente a Pino para el browser,
 * por lo que se implementa un modulo ligero que sigue el mismo esquema
 * de campos que el backend para mantener consistencia en los logs.
 *
 * Comportamiento por entorno:
 *   - development: emite todos los niveles (DEBUG incluido) en la consola del navegador.
 *   - production:  emite solo INFO, WARN y ERROR. El nivel DEBUG se suprime.
 *
 * Estandares cubiertos:
 *   - OWASP A09:2021: Security Logging and Monitoring Failures
 *   - Consistencia de formato con los logs del backend
 *
 * Uso:
 *   import logger from '../utils/logger.js';
 *   logger.taskEvent('create_success', { taskId: '...', status: 'Por hacer' });
 *   logger.appError('create_task', { taskId: '...', error: err.message });
 */

const APP_ENV =
  import.meta?.env?.VITE_APP_ENV ||
  import.meta?.env?.MODE ||
  'development';
const SERVICE_NAME = 'tidytask-frontend';
const IS_PRODUCTION = APP_ENV === 'production';


/**
 * Retorna el userId desde localStorage.
 * Si no hay sesion activa, devuelve "anonymous" como valor estandar.
 * Necesidad: identificar al actor en cada evento de negocio sin exponer datos sensibles.
 */
function getCurrentUserId() {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return 'anonymous';
    const user = JSON.parse(userStr);
    return user?.id || user?._id || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

/**
 * Crea la entrada base de log con los campos comunes obligatorios.
 * @param {string} level - Nivel del log: DEBUG | INFO | WARN | ERROR
 * @returns {Object} Campos base del log
 */
function createBaseEntry(level) {
  return {
    level,
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    env: APP_ENV,
    source: 'frontend',
  };
}

/**
 * Emite el log a la consola del navegador de forma categorizada por nivel.
 * En produccion suprime los logs de nivel DEBUG.
 * @param {string} level - Nivel del log
 * @param {Object} entry - Objeto de log a emitir
 * @param {string} message - Mensaje legible del log
 */
function emit(level, entry, message) {
  if (IS_PRODUCTION && level === 'DEBUG') return;

  const logEntry = { ...entry, message };

  switch (level) {
    case 'ERROR':
      console.error(JSON.stringify(logEntry));
      break;
    case 'WARN':
      console.warn(JSON.stringify(logEntry));
      break;
    case 'DEBUG':
      console.debug(JSON.stringify(logEntry));
      break;
    default: // INFO
      console.info(JSON.stringify(logEntry));
  }
}

/**
 * Registra un evento de gestion de tareas (task_management).
 *
 * Cubre: create, update, delete, kanban_move y sus estados (attempt, success, error).
 * Necesidad: trazabilidad de operaciones CRUD en el cliente para correlacion con el backend.
 *
 * @param {string} action - Accion realizada (ej: "create_success", "kanban_move", "delete_confirmed")
 * @param {Object} fields - Campos adicionales del evento (taskId, status, deadline, etc.)
 */
function taskEvent(action, fields = {}) {
  const entry = {
    ...createBaseEntry('INFO'),
    event: 'task_management',
    action,
    userId: getCurrentUserId(),
    ...fields,
  };
  emit('INFO', entry, `Task event: ${action}`);
}

/**
 * Registra un error de aplicacion (application_error).
 *
 * Cubre: fallos de API, errores de Kanban, errores de validacion y errores internos.
 * Necesidad: observabilidad de fallos del cliente para diagnostico y monitoreo.
 * OWASP A09:2021 - errores de aplicacion deben quedar registrados.
 *
 * @param {string} action - Accion que estaba realizando cuando ocurrio el error
 * @param {Object} fields - Campos del error (taskId, error, severity, etc.)
 */
function appError(action, fields = {}) {
  const severity = fields.severity || 'ERROR';
  const level = severity === 'WARN' ? 'WARN' : 'ERROR';
  const entry = {
    ...createBaseEntry(level),
    event: 'application_error',
    action,
    userId: getCurrentUserId(),
    severity,
    ...fields,
  };
  emit(level, entry, `Application error in: ${action}`);
}

/**
 * Registra un evento de autenticacion (auth).
 * Uso: login_attempt, login_success, logout, session_expired.
 *
 * @param {string} action - Accion de autenticacion
 * @param {Object} fields - Campos adicionales
 */
function authEvent(action, fields = {}) {
  const entry = {
    ...createBaseEntry('INFO'),
    event: 'auth',
    action,
    userId: getCurrentUserId(),
    ...fields,
  };
  emit('INFO', entry, `Auth event: ${action}`);
}

/**
 * Log de nivel DEBUG para desarrollo. Suprimido en produccion.
 * Uso: diagnostico de flujos internos, no eventos de negocio.
 *
 * @param {string} message - Mensaje de debug
 * @param {Object} fields - Campos adicionales opcionales
 */
function debug(message, fields = {}) {
  if (IS_PRODUCTION) return;
  const entry = {
    ...createBaseEntry('DEBUG'),
    ...fields,
  };
  emit('DEBUG', entry, message);
}

const logger = {
  taskEvent,
  appError,
  authEvent,
  debug,
};

export default logger;
