# Sistema de Análisis Visual con Logros

Aplicación web que integra un modelo de Teachable Machine para clasificación visual con un sistema completo de autenticación, protecciones contra SQLi y un sistema de logros.

## Características

- **Sistema de autenticación**: Registro e inicio de sesión de usuarios
- **Integración con Teachable Machine**: Reconocimiento visual en tiempo real
- **Sistema de logros**: Logros desbloqueables y racha de inicio de sesión
- **Protección contra SQLi**: Validación en cliente y servidor con mensajes humorísticos
- **Interfaz moderna**: Diseño profesional con animaciones y notificaciones

## Requisitos

- Node.js >= 18
- SQLite (para desarrollo local)

## Desarrollo local

Para ejecutar el proyecto en modo desarrollo:

```bash
# Instalar dependencias
npm install

# Construir el servidor TypeScript
npm run build:server

# Iniciar el servidor
npm run start
```

## Despliegue en Vercel

El proyecto está configurado para ser desplegado en Vercel como una aplicación fullstack.

### Pasos para desplegar

1. **Instalar la CLI de Vercel** (opcional, puedes usar la interfaz web)
   ```bash
   npm install -g vercel
   ```

2. **Iniciar sesión en tu cuenta Vercel**
   ```bash
   vercel login
   ```

3. **Realizar el despliegue desde la raíz del proyecto**
   ```bash
   vercel
   ```

4. **Para despliegue en producción**
   ```bash
   vercel --prod
   ```

### Consideraciones importantes

- La base de datos SQLite en Vercel se creará en `/tmp` y será volátil (se reiniciará periódicamente).
- Para una aplicación en producción, es recomendable migrar a una base de datos persistente (MySQL, PostgreSQL) usando servicios como:
  - [PlanetScale](https://planetscale.com/)
  - [Supabase](https://supabase.com/)
  - [Neon](https://neon.tech/)

## Estructura del proyecto

```
vueia/
├── dist/             # Código compilado
├── src/
│   ├── controllers/  # Controladores de la API
│   ├── db/           # Configuración de base de datos
│   ├── middleware/   # Middleware (autenticación, etc.)
│   ├── models/       # Definiciones de tipos/modelos
│   ├── public/       # Archivos estáticos (HTML, CSS, JS)
│   ├── routes/       # Rutas de la API
│   └── server.ts     # Punto de entrada del servidor
├── package.json      # Dependencias y scripts
├── tsconfig.json     # Configuración de TypeScript
├── vercel.json       # Configuración de Vercel
└── README.md         # Este archivo
```

## Lista de logros implementados

- **Primera Conexión**: Otorgado al registrarse
- **Visitante Frecuente**: Otorgado al iniciar sesión 5 días consecutivos
- **Maestro de Detección**: Otorgado al realizar 10 detecciones con alta confianza
- **Perfil Completo**: Disponible para implementación futura
- **Conciencia de Seguridad**: Disponible para implementación futura

## Notas de seguridad

La aplicación incluye protecciones contra inyección SQL (SQLi):
- Validación de entradas en el cliente
- Sanitización de entradas en el servidor
- Uso de parámetros preparados para consultas SQL
- Mensajes humorísticos personalizados para intentos de SQLi 