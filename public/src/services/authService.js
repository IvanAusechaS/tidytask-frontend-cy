/**
 * Authentication Service
 * Manages user authentication, registration, and session state
 */

import { post } from "./api.js";

// Definir la URL base de la API de forma consistente
const getApiBaseUrl = () => {
  const isProduction = window.location.hostname !== "localhost";
  return isProduction
    ? "https://tidytasks-80b95fdaeb61.herokuapp.com/api"
    : "http://localhost:3001/api";
};

const API_BASE_URL = "https://tidytasks-80b95fdaeb61.herokuapp.com/api";

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
  console.log("Sending password reset request for:", email);
  try {
    // Recovery doesn't require auth token
    const result = await post("/auth/recover-password", { email }, false);
    console.log("Password reset response:", result);
    return result;
  } catch (error) {
    console.error("Error in sendPasswordResetEmail:", error);
    // Devolver un objeto con formato similar a una respuesta exitosa pero con flag de error
    return {
      success: false,
      message:
        error.message ||
        "Error al enviar el correo de recuperación. Intenta de nuevo más tarde.",
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
  console.log("Resetting password with token:", token);

  try {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: token,
        password: newPassword,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Reset password failed");
    }

    const data = await response.json();
    console.log("Reset password response:", data);
    return data;
  } catch (error) {
    console.error("Error in resetPassword:", error);
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
