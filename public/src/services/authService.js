/**
 * Authentication Service
 * Manages user authentication, registration, and session state
 */

import { post } from "./api.js";
import logger from "../utils/logger.js";

// URL base de la API determinada por variable de entorno.
// Misma logica que api.js para garantir consistencia entre servicios.
// Necesidad: eliminar valores hardcodeados (OWASP A05).
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === "production"
    ? "https://tidytask-backend-154w.onrender.com/api"
    : "http://localhost:3001/api");

/**
 * Log in a user with email and password
 *
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} User data with auth token
 */
export async function login(email, password) {
  // Login doesn't require auth token
  return post("/auth/login", { email, password }, false);
}

/**
 * Register a new user
 *
 * @param {Object} userData - User registration data
 * @param {string} userData.firstName - User's first name
 * @param {string} userData.lastName - User's last name
 * @param {number} userData.age - User's age (optional)
 * @param {string} userData.email - User's email
 * @param {string} userData.password - User's password
 * @returns {Promise<Object>} New user data with auth token
 */
export async function signup(userData) {
  // Signup doesn't require auth token
  return post("/auth/signup", userData, false);
}

/**
 * Log out the current user
 *
 * @returns {Promise<Object>} Logout confirmation
 */
export async function logout() {
  const result = await post("/auth/logout", {});

  // Clear local storage
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  return result;
}

/**
 * Send password recovery email
 *
 * @param {string} email - User's email for password recovery
 * @returns {Promise<Object>} Recovery confirmation
 */
export async function sendPasswordResetEmail(email) {
  try {
    const result = await post("/auth/recover-password", { email }, false);
    return result;
  } catch (error) {
    // ERROR: fallo al enviar solicitud de recuperacion de contrasena.
    // No se loguea el email para evitar exposicion de PII. GDPR / OWASP A09.
    logger.appError("password_recovery", {
      severity: "ERROR",
      error: error.message,
    });
    return {
      success: false,
      message: error.message || "Error al enviar el correo de recuperacion. Intenta de nuevo mas tarde.",
    };
  }
}

/**
 * Reset user password using token from email
 *
 * @param {string} token - Reset token from email
 * @param {string} newPassword - New password to set
 * @returns {Promise<Object>} Reset confirmation
 */
export async function resetPassword(token, newPassword) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token, password: newPassword }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errMsg = errorData.message || "Reset password failed";
      // WARN: fallo en el reset de contrasena. Token invalido o expirado.
      logger.appError("reset_password", { severity: "WARN", error: errMsg, statusCode: response.status });
      throw new Error(errMsg);
    }

    return await response.json();
  } catch (error) {
    // ERROR: fallo interno o de red al resetear contrasena.
    logger.appError("reset_password", { severity: "ERROR", error: error.message });
    throw error;
  }
}

/**
 * Check if user is currently logged in
 *
 * @returns {boolean} True if user is logged in
 */
export function isLoggedIn() {
  return !!localStorage.getItem("token");
}

/**
 * Get current user data from local storage
 *
 * @returns {Object|null} User data or null if not logged in
 */
export function getCurrentUser() {
  const userJson = localStorage.getItem("user");
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * Update user session after profile changes
 *
 * @param {Object} userData - Updated user data
 */
export function updateUserSession(userData) {
  localStorage.setItem("user", JSON.stringify(userData));
}
