# TidyTask Frontend 📋✨

Una aplicación web moderna de gestión de tareas construida con **Vite** y **Vanilla JavaScript**. Interfaz de usuario intuitiva y responsive para organizar tus actividades diarias.

## 🚀 Características Principales

- ✅ **Gestión Completa de Tareas** - Crear, editar, eliminar y organizar tareas
- 📱 **Diseño Responsive** - Optimizado para desktop y móvil
- 🎨 **Interfaz Moderna** - Diseño limpio y profesional
- 🔐 **Autenticación Segura** - Login/registro con Google OAuth
- 📊 **Tablero Kanban** - Visualización por columnas: Por hacer, En proceso, Completado
- 🔄 **Navegación SPA** - Single Page Application con enrutamiento dinámico
- 🎯 **Sistema de Prioridades** - Organiza tareas por importancia
- 📅 **Fechas Límite** - Control de vencimientos
- 🌙 **Toast Notifications** - Feedback visual elegante
- 📱 **Pestañas Móviles** - Navegación optimizada para dispositivos móviles

## 🛠️ Tecnologías Utilizadas

- **Vite** - Build tool y dev server ultrarrápido
- **Vanilla JavaScript** - JavaScript moderno (ES6+)
- **CSS3** - Estilos responsive con Flexbox y Grid
- **HTML5** - Estructura semántica
- **Módulos ES6** - Arquitectura modular
- **API Fetch** - Comunicación con el backend

## 📁 Estructura del Proyecto

```
tidytask-frontend/
├── index.html              # Punto de entrada
├── package.json            # Dependencias y scripts
├── vite.config.js          # Configuración de Vite
├── vercel.json            # Configuración para deploy en Vercel
└── public/
    └── src/
        ├── main.js         # Archivo principal de la aplicación
        ├── router.js       # Sistema de enrutamiento SPA
        ├── style.css       # Estilos principales
        ├── assets/
        │   ├── content/    # Imágenes y recursos
        │   └── styles/     # Archivos CSS modulares
        ├── services/
        │   ├── api.js          # Cliente HTTP para el backend
        │   └── authService.js  # Gestión de autenticación
        ├── utils/
        │   ├── toast.js        # Sistema de notificaciones
        │   └── page-loader.js  # Utilidades de carga
        └── views/
            ├── login.html/js       # Página de login
            ├── signup.html/js      # Página de registro
            ├── recovery.html/js    # Recuperación de contraseña
            ├── reset.html/js       # Reset de contraseña
            └── dashboard.html/js   # Panel principal de tareas
```

## ⚙️ Instalación y Configuración

### Prerrequisitos
- Node.js (v14 o superior)
- npm o yarn

### Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/AndreyQuicenoC/tidytask-frontend.git
   cd tidytask-frontend
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   - El frontend se conecta automáticamente al backend
   - Asegúrate de que el backend esté ejecutándose

4. **Ejecutar en modo desarrollo:**
   ```bash
   npm run dev
   ```

5. **Acceder a la aplicación:**
   - Abre tu navegador en `http://localhost:5173`

## 🔧 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo con hot reload
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la versión de producción

## 🌟 Funcionalidades Implementadas

### Autenticación
- ✅ Login con email/contraseña
- ✅ Registro de nuevos usuarios
- ✅ Integración con Google OAuth
- ✅ Recuperación de contraseña
- ✅ Reset de contraseña seguro

### Dashboard de Tareas
- ✅ Vista Kanban (Por hacer, En proceso, Completado)
- ✅ Crear nuevas tareas con título, descripción, fecha y prioridad
- ✅ Editar tareas existentes
- ✅ Eliminar tareas
- ✅ Cambiar estado de las tareas
- ✅ Contador de tareas por columna
- ✅ Diseño responsive para móviles

### UX/UI Mejoradas
- ✅ Notificaciones toast elegantes
- ✅ Animaciones suaves
- ✅ Carga asíncrona de vistas
- ✅ Navegación por pestañas en móvil
- ✅ Diseño Material Design inspirado

## 📱 Compatibilidad

- ✅ **Desktop** - Chrome, Firefox, Safari, Edge
- ✅ **Mobile** - iOS Safari, Android Chrome
- ✅ **Tablet** - iPadOS, Android tablets

## 🚀 Deploy

### Vercel (Recomendado)
```bash
npm run build
vercel --prod
```

### Build Manual
```bash
npm run build
# Los archivos estarán en la carpeta /dist
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👨‍💻 Autor

**Andrey Quiceno C.**
- GitHub: [@AndreyQuicenoC](https://github.com/AndreyQuicenoC)
- Email: adolfo.quiceno@correounivalle.edu.co

---

## 🔗 Repositories Relacionados

- **Backend**: [tidytask-backend](https://github.com/AndreyQuicenoC/tidytask-backend)

---

**TidyTask** - Mantén tu vida organizada 🎯✨
