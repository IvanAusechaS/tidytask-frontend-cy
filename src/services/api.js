/**
 * API Service
 * Handles all HTTP requests to the backend API
 */

import logger from "../utils/logger.js";

// URL base de la API determinada por variable de entorno.
// En desarrollo local: http://localhost:3001/api (o via proxy de Vite: /api)
// En produccion:       VITE_API_URL definida en .env.production o en Vercel
// Necesidad: eliminar valores hardcodeados y soportar multiples entornos (OWASP A05).
const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === "production"
    ? "https://tidytask-backend-154w.onrender.com/api"
    : "http://localhost:3001/api");

/**
 * Make a GET request to the API
 *
 * @param {string} endpoint - API endpoint to request
 * @param {boolean} requiresAuth - Whether the request requires authentication
 * @returns {Promise<any>} Response data
 */

/**
 * Make a POST request to the API
 *
 * @param {string} endpoint
 * @param {object} data
 * @param {boolean} requiresAuth
 * @returns {Promise<any>}
 */
export async function post(endpoint, data, requiresAuth = true) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (requiresAuth) {
    const token = localStorage.getItem("token");
    if (!token) {
      const err = new Error("Authentication required");
      err.status = 401;
      throw err;
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
    credentials: "include",
    mode: "cors",
  });

  if (!response.ok) {
    let errMsg = `Request failed with status ${response.status}`;

    try {
      const error = await response.json();
      errMsg = error.message || errMsg;
    } catch (_) {}

    const err = new Error(errMsg);
    err.status = response.status;

    // WARN/ERROR: respuesta de error del backend en POST.
    logger.appError("API post request failed", {
      category: "api_client",
      event: "api_post_http_error",
      metadata: {
        severity: response.status >= 500 ? "ERROR" : "WARN",
        error: errMsg,
        endpoint,
        statusCode: response.status,
      },
    });

    throw err;
  }

  return await response.json();
}

export async function get(endpoint, requiresAuth = true) {
  const headers = {
    "Content-Type": "application/json",
  };

  // Add authorization header if required
  if (requiresAuth) {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication required");
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "GET",
    headers,
    credentials: "include", // Include cookies for cross-origin requests
    mode: "cors", // Explicitly set CORS mode
  });

  // Handle response
  if (!response.ok) {
    try {
      const error = await response.json();
      const errMsg =
        error.message || `Request failed with status ${response.status}`;
      // fallos de API en el cliente. OWASP A09:2021.
      // WARN/ERROR: respuesta de error del backend en GET.
      logger.appError("API get request failed", {
        category: "api_client",
        event: "api_get_http_error",
        metadata: {
          severity: response.status >= 500 ? "ERROR" : "WARN",
          error: errMsg,
          endpoint,
          statusCode: response.status,
        },
      });
      throw new Error(errMsg);
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
      const errMsg = `Request failed with status ${response.status}`;
      // WARN/ERROR: respuesta de error del backend en GET.
      logger.appError("API get request failed", {
        category: "api_client",
        event: "api_get_http_error",
        metadata: {
          severity: response.status >= 500 ? "ERROR" : "WARN",
          error: errMsg,
          endpoint,
          statusCode: response.status,
        },
      });
      throw new Error(errMsg);
    }
  }

  return await response.json();
}

/**
 * Make a POST request to the API
  const headers = {
    "Content-Type": "application/json",
  };

  // Add authorization header if required
  if (requiresAuth) {
    const token = localStorage.getItem("token");
    if (!token && requiresAuth) {
      throw new Error("Authentication required");
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
    credentials: "include", // Include cookies for cross-origin requests
    mode: "cors", // Explicitly set CORS mode
  });

  // Handle response
  if (!response.ok) {
    try {
      const error = await response.json();
      const errMsg = error.message || `Request failed with status ${response.status}`;
      // WARN/ERROR: respuesta de error del backend en POST.
      logger.appError("api_post", { severity: response.status >= 500 ? "ERROR" : "WARN", error: errMsg, endpoint, statusCode: response.status });
      throw new Error(errMsg);
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
      const errMsg = `Request failed with status ${response.status}`;
      logger.appError("api_post", { severity: response.status >= 500 ? "ERROR" : "WARN", error: errMsg, endpoint, statusCode: response.status });
      throw new Error(errMsg);
    }
  }

  return await response.json();
}

/**
 * Make a PUT request to the API
 *
 * @param {string} endpoint - API endpoint to request
 * @param {object} data - Data to send in the request body
 * @param {boolean} requiresAuth - Whether the request requires authentication
 * @returns {Promise<any>} Response data
 */
export async function put(endpoint, data, requiresAuth = true) {
  const headers = {
    "Content-Type": "application/json",
  };

  // Add authorization header if required
  if (requiresAuth) {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication required");
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
    credentials: "include", // Include cookies for cross-origin requests
    mode: "cors", // Explicitly set CORS mode
  });

  // Handle response
  if (!response.ok) {
    try {
      const error = await response.json();
      const errMsg =
        error.message || `Request failed with status ${response.status}`;
      // WARN/ERROR: respuesta de error del backend en PUT.
      logger.appError("API put request failed", {
        category: "api_client",
        event: "api_put_http_error",
        metadata: {
          severity: response.status >= 500 ? "ERROR" : "WARN",
          error: errMsg,
          endpoint,
          statusCode: response.status,
        },
      });
      throw new Error(errMsg);
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
      const errMsg = `Request failed with status ${response.status}`;
      // WARN/ERROR: respuesta de error del backend en PUT.
      logger.appError("API put request failed", {
        category: "api_client",
        event: "api_put_http_error",
        metadata: {
          severity: response.status >= 500 ? "ERROR" : "WARN",
          error: errMsg,
          endpoint,
          statusCode: response.status,
        },
      });
      throw new Error(errMsg);
    }
  }

  return await response.json();
}

/**
 * Make a DELETE request to the API
 *
 * @param {string} endpoint - API endpoint to request
 * @param {boolean} requiresAuth - Whether the request requires authentication
 * @returns {Promise<any>} Response data
 */
export async function del(endpoint, requiresAuth = true) {
  const headers = {
    "Content-Type": "application/json",
  };

  // Add authorization header if required
  if (requiresAuth) {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication required");
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "DELETE",
    headers,
    credentials: "include", // Include cookies for cross-origin requests
    mode: "cors", // Explicitly set CORS mode
  });

  // Handle response
  if (!response.ok) {
    try {
      const error = await response.json();
      const errMsg =
        error.message || `Request failed with status ${response.status}`;
      JavaScript;
      // WARN/ERROR: respuesta de error del backend en DELETE.
      logger.appError("API delete request failed", {
        category: "api_client",
        event: "api_delete_http_error",
        metadata: {
          severity: response.status >= 500 ? "ERROR" : "WARN",
          error: errMsg,
          endpoint,
          statusCode: response.status,
        },
      });
      throw new Error(errMsg);
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
      const errMsg = `Request failed with status ${response.status}`;
      // WARN/ERROR: respuesta de error del backend en DELETE.
      logger.appError("API delete request failed", {
        category: "api_client",
        event: "api_delete_http_error",
        metadata: {
          severity: response.status >= 500 ? "ERROR" : "WARN",
          error: errMsg,
          endpoint,
          statusCode: response.status,
        },
      });
      throw new Error(errMsg);
    }
  }

  return await response.json();
}
