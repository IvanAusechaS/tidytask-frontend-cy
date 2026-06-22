// src/utils/footer-manager.js
import FooterComponent from "../components/footer.js";

/**
 * Footer Manager Utility
 * Handles the integration and management of the footer component across all pages
 */
class FooterManager {
  constructor() {
    this.footerInstance = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the footer component
   * @param {Object} options - Configuration options
   */
  init(options = {}) {
    if (this.isInitialized) {
      console.warn("Footer already initialized");
      return;
    }

    try {
      // Create footer instance
      this.footerInstance = new FooterComponent();

      // Inject footer into the page
      this.injectFooter();

      // Update authentication state if provided
      if (options.isAuthenticated !== undefined) {
        this.updateAuthState(options.isAuthenticated);
      }

      this.isInitialized = true;
      console.log("Footer initialized successfully");
    } catch (error) {
      console.error("Failed to initialize footer:", error);
    }
  }

  /**
   * Inject the footer into the page
   */
  injectFooter() {
    const body = document.body;
    const existingFooter = document.querySelector(".site-footer");

    // Remove existing footer if present
    if (existingFooter) {
      existingFooter.remove();
    }

    // Add footer directly to body (after app container)
    if (body && this.footerInstance) {
      body.appendChild(this.footerInstance.getContainer());

      // Ensure proper body structure for footer positioning
      this.setupBodyLayout();
    }
  }

  /**
   * Setup body layout to accommodate footer
   */
  setupBodyLayout() {
    const body = document.body;
    const appContainer = document.querySelector("#app");

    // Ensure body has proper flex layout for sticky footer
    if (!body.classList.contains("footer-ready")) {
      // Override the original body styles to work with footer
      body.style.minHeight = "100vh";
      body.style.display = "flex";
      body.style.flexDirection = "column";
      body.style.placeItems = "stretch"; // Changed from center to stretch
      body.style.justifyContent = "flex-start"; // Ensure content starts from top
      body.classList.add("footer-ready");
    }

    // Ensure app container grows to fill space and centers content
    if (appContainer && !appContainer.classList.contains("footer-app")) {
      appContainer.style.flex = "1";
      appContainer.style.display = "flex";
      appContainer.style.flexDirection = "column";
      appContainer.style.justifyContent = "center"; // Center content vertically within available space
      appContainer.style.alignItems = "center"; // Center content horizontally
      appContainer.style.maxWidth = "1280px";
      appContainer.style.margin = "0 auto";

      // Only add padding for non-home pages
      const currentRoute =
        window.location.pathname.slice(1) ||
        window.location.hash.slice(1) ||
        "home";
      const cleanRoute = currentRoute.replace(/^\/+|\/+$/g, "");

      // Never add padding for home page (including root, empty route, or explicit "home")
      const isHomePage =
        cleanRoute === "" ||
        cleanRoute === "home" ||
        window.location.pathname === "/" ||
        window.location.hash === "#home" ||
        window.location.hash === "";

      if (!isHomePage) {
        appContainer.style.padding = "2rem";
      } else {
        appContainer.style.padding = "0";
        // Force remove any existing padding
        appContainer.style.paddingTop = "0";
        appContainer.style.paddingBottom = "0";
        appContainer.style.paddingLeft = "0";
        appContainer.style.paddingRight = "0";
      }

      appContainer.style.textAlign = "center";
      appContainer.classList.add("footer-app");
    }
  }

  /**
   * Update footer authentication state
   * @param {boolean} isAuthenticated - Whether user is authenticated or not
   */
  updateAuthState(isAuthenticated) {
    if (this.footerInstance) {
      this.footerInstance.updateAuthenticationState(isAuthenticated);
    }
  }

  /**
   * Remove footer from the page
   */
  remove() {
    if (this.footerInstance) {
      this.footerInstance.remove();
      this.footerInstance = null;
      this.isInitialized = false;
    }

    // Reset body layout when footer is removed
    this.resetBodyLayout();
  }

  /**
   * Reset body layout to original state when footer is not present
   */
  resetBodyLayout() {
    const body = document.body;
    const appContainer = document.querySelector("#app");

    if (body.classList.contains("footer-ready")) {
      // Reset body styles to original values
      body.style.display = "flex";
      body.style.placeItems = "center";
      body.style.justifyContent = "";
      body.style.flexDirection = "";
      body.classList.remove("footer-ready");
    }

    if (appContainer && appContainer.classList.contains("footer-app")) {
      // Reset app container styles
      appContainer.style.flex = "";
      appContainer.style.display = "";
      appContainer.style.flexDirection = "";
      appContainer.style.justifyContent = "";
      appContainer.style.alignItems = "";
      appContainer.style.padding = ""; // Reset padding
      appContainer.classList.remove("footer-app");
    }
  }

  /**
   * Reinitialize footer (useful for page changes)
   */
  reinit(options = {}) {
    this.remove();
    this.init(options);
  }

  /**
   * Get current footer instance
   */
  getInstance() {
    return this.footerInstance;
  }

  /**
   * Check if footer is initialized
   */
  isReady() {
    return this.isInitialized && this.footerInstance !== null;
  }

  /**
   * Auto-initialize footer based on current page and authentication status
   */
  autoInit() {
    const token = localStorage.getItem("token");
    const isAuthenticated = !!token;

    // Check if we should show footer on current page
    if (this.shouldShowFooter()) {
      this.init({ isAuthenticated });
    }
  }

  /**
   * Determine if footer should be shown on current page
   * @returns {boolean}
   */
  shouldShowFooter() {
    // Get current route
    const path = window.location.pathname;
    const hash = window.location.hash.slice(1);
    const route = hash || path.slice(1) || "home";

    // Clean route by removing leading/trailing slashes and normalizing
    const cleanRoute = route.replace(/^\/+|\/+$/g, "");

    // Pages where footer should be shown
    const footerPages = [
      "", // root
      "home",
      "login",
      "signup",
      "recovery",
      "reset",
      "dashboard",
      "profile",
      "profile/edit",
      "profile-edit",
    ];

    // Pages where footer should NOT be shown
    const noFooterPages = ["auth-callback", "google-callback"];

    if (noFooterPages.includes(cleanRoute)) {
      return false;
    }

    return footerPages.includes(cleanRoute);
  }

  /**
   * Handle page navigation - update footer accordingly
   * @param {string} newRoute - The new route being navigated to
   */
  handleNavigation(newRoute) {
    const shouldShow = this.shouldShowFooter();

    if (shouldShow && !this.isInitialized) {
      // Show footer if not present
      this.autoInit();
    } else if (!shouldShow && this.isInitialized) {
      // Hide footer if present
      this.remove();
    } else if (shouldShow && this.isInitialized) {
      // Update authentication state and refresh layout
      const token = localStorage.getItem("token");
      this.updateAuthState(!!token);
      // Refresh padding based on current route
      this.updatePaddingForCurrentRoute();
    }
  }

  /**
   * Update padding based on current route
   */
  updatePaddingForCurrentRoute() {
    const appContainer = document.querySelector("#app");
    if (appContainer && appContainer.classList.contains("footer-app")) {
      const currentRoute =
        window.location.pathname.slice(1) ||
        window.location.hash.slice(1) ||
        "home";
      const cleanRoute = currentRoute.replace(/^\/+|\/+$/g, "");

      // Never add padding for home page
      const isHomePage =
        cleanRoute === "" ||
        cleanRoute === "home" ||
        window.location.pathname === "/" ||
        window.location.hash === "#home" ||
        window.location.hash === "";

      if (!isHomePage) {
        appContainer.style.padding = "2rem";
      } else {
        appContainer.style.padding = "0";
        // Force remove any existing padding
        appContainer.style.paddingTop = "0";
        appContainer.style.paddingBottom = "0";
        appContainer.style.paddingLeft = "0";
        appContainer.style.paddingRight = "0";
      }
    }
  }
}

// Create singleton instance
const footerManager = new FooterManager();

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    footerManager.autoInit();
  }, 100);
});

// Handle route changes
window.addEventListener("popstate", () => {
  setTimeout(() => {
    const route =
      window.location.hash.slice(1) ||
      window.location.pathname.slice(1) ||
      "home";
    footerManager.handleNavigation(route);
  }, 100);
});

// Handle hash changes (for SPA navigation)
window.addEventListener("hashchange", () => {
  setTimeout(() => {
    const route =
      window.location.hash.slice(1) ||
      window.location.pathname.slice(1) ||
      "home";
    footerManager.handleNavigation(route);
  }, 100);
});

// Export singleton instance
export default footerManager;
