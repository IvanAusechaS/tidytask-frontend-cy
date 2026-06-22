import { navigate } from "../router.js";
import toast from "../utils/toast.js";

export default function setupHome() {
  console.log("Configurando página de inicio (Landing Page)");

  // Limpiar cualquier intervalo que pueda estar ejecutándose desde otras páginas
  if (window.googleAuthCheckInterval) {
    clearInterval(window.googleAuthCheckInterval);
    delete window.googleAuthCheckInterval;
    console.log("Intervalos de Google Auth limpiados en home");
  }

  if (window.dashboardIntervalId) {
    clearInterval(window.dashboardIntervalId);
    delete window.dashboardIntervalId;
    console.log("Intervalos del dashboard limpiados en home");
  }

  // Botón de login en el header
  const loginButton = document.getElementById("login-button");
  if (loginButton) {
    loginButton.addEventListener("click", () => {
      console.log("Navegando a login desde header");
      navigate("login");
    });
  }

  // Botón de signup en el header
  const signupButton = document.getElementById("signup-button");
  if (signupButton) {
    signupButton.addEventListener("click", () => {
      console.log("Navegando a signup desde header");
      navigate("signup");
    });
  }

  // Botón principal "Comenzar Gratis"
  const getStartedButton = document.getElementById("get-started-button");
  if (getStartedButton) {
    getStartedButton.addEventListener("click", () => {
      console.log("Navegando a signup desde hero");
      navigate("signup");
    });
  }

  // Botón "Saber Más" - scroll suave a la sección de características
  const learnMoreButton = document.getElementById("learn-more-button");
  if (learnMoreButton) {
    learnMoreButton.addEventListener("click", () => {
      const featuresSection = document.querySelector(".features-section");
      if (featuresSection) {
        featuresSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  }

  // Botón CTA "Comenzar Ahora"
  const ctaSignupButton = document.getElementById("cta-signup-button");
  if (ctaSignupButton) {
    ctaSignupButton.addEventListener("click", () => {
      console.log("Navegando a signup desde CTA");
      navigate("signup");
    });
  }

  // Verificar si el usuario ya está logueado
  const token = localStorage.getItem("token");
  if (token) {
    // Si ya está logueado, cambiar los botones del header
    updateHeaderForLoggedUser();
  }

  // Animación de scroll para el header
  setupScrollAnimation();

  // Animación de aparición para las cards de características
  setupFeatureCardsAnimation();

  // Configurar menú hamburguesa
  setupHamburgerMenu();

  // Footer is now handled automatically by the router
}

function updateHeaderForLoggedUser() {
  const headerActions = document.querySelector(".header-actions");
  if (headerActions) {
    headerActions.innerHTML = `
            <button id="dashboard-button" class="btn-primary btn-float">Ir al Dashboard</button>
        `;

    const dashboardButton = document.getElementById("dashboard-button");
    if (dashboardButton) {
      dashboardButton.addEventListener("click", () => {
        // Cerrar menú hamburguesa si está abierto
        const hamburgerBtn = document.getElementById("hamburger-btn");
        const headerNav = document.getElementById("header-nav");
        if (hamburgerBtn && headerNav) {
          hamburgerBtn.classList.remove("active");
          headerNav.classList.remove("active");
        }
        navigate("dashboard");
      });
    }
  }
}

function setupScrollAnimation() {
  const header = document.querySelector(".landing-header");
  if (!header) return;

  let lastScrollY = window.scrollY;

  window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY;

    // Cambiar opacidad del header basado en el scroll
    if (currentScrollY > 100) {
      header.style.background = "rgba(255, 255, 255, 0.98)";
      header.style.boxShadow = "0 2px 20px rgba(0, 0, 0, 0.1)";
    } else {
      header.style.background = "rgba(255, 255, 255, 0.95)";
      header.style.boxShadow = "none";
    }

    lastScrollY = currentScrollY;
  });
}

function setupFeatureCardsAnimation() {
  const featureCards = document.querySelectorAll(".feature-card");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Añadir un pequeño delay para cada card
          setTimeout(() => {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
          }, index * 100);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    }
  );

  featureCards.forEach((card) => {
    // Inicializar estado de animación
    card.style.opacity = "0";
    card.style.transform = "translateY(30px)";
    card.style.transition = "opacity 0.6s ease, transform 0.6s ease";

    observer.observe(card);
  });
}

function setupHamburgerMenu() {
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const headerNav = document.getElementById("header-nav");

  if (!hamburgerBtn || !headerNav) {
    console.log("Elementos del menú hamburguesa no encontrados");
    return;
  }

  // Toggle del menú hamburguesa
  hamburgerBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevenir que se propague al document
    const isActive = hamburgerBtn.classList.contains("active");

    if (isActive) {
      // Cerrar menú
      hamburgerBtn.classList.remove("active");
      headerNav.classList.remove("open");
    } else {
      // Abrir menú
      hamburgerBtn.classList.add("active");
      headerNav.classList.add("open");
    }
  });

  // Cerrar menú al hacer clic en los botones de navegación
  const navButtons = headerNav.querySelectorAll("button, .nav-link");
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      hamburgerBtn.classList.remove("active");
      headerNav.classList.remove("open");
    });
  });

  // Event listeners específicos para botones móviles
  const mobileLoginButton = document.getElementById("mobile-login-button");
  const mobileSignupButton = document.getElementById("mobile-signup-button");

  if (mobileLoginButton) {
    mobileLoginButton.addEventListener("click", (e) => {
      e.preventDefault();
      navigate("login");
    });
  }

  if (mobileSignupButton) {
    mobileSignupButton.addEventListener("click", (e) => {
      e.preventDefault();
      navigate("signup");
    });
  }

  // Cerrar menú al hacer clic fuera de él
  document.addEventListener("click", (e) => {
    if (!hamburgerBtn.contains(e.target) && !headerNav.contains(e.target)) {
      hamburgerBtn.classList.remove("active");
      headerNav.classList.remove("open");
    }
  });

  // Cerrar menú al redimensionar la ventana (para volver a desktop)
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      hamburgerBtn.classList.remove("active");
      headerNav.classList.remove("open");
    }
  });

  // Cerrar menú con tecla ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && headerNav.classList.contains("open")) {
      hamburgerBtn.classList.remove("active");
      headerNav.classList.remove("open");
    }
  });
}

// Función para manejar errores de navegación
function handleNavigationError(error) {
  console.error("Error en navegación:", error);
  toast.error("Error al navegar. Intenta nuevamente.");
}
