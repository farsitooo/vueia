import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as userController from './controllers/userController.js';
import * as imageController from './controllers/imageController.js';
import { authenticate } from './middleware/auth.js';
import * as supabaseDB from './db/supabase.js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Mostrar variables de entorno disponibles (solo nombres, no valores)
console.log('Variables de entorno disponibles:', Object.keys(process.env).join(', '));
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

// Obtener el directorio actual desde el módulo ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar la aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ruta de diagnóstico para verificar la conexión a Supabase
app.get('/api/diagnose', async (req, res) => {
  try {
    const connectionStatus = await supabaseDB.checkConnection();
    
    // Enmascarar valores sensibles para mayor seguridad
    const maskValue = (value: string | undefined): string => {
      if (!value) return 'no-value';
      if (value.length <= 8) return '***masked***';
      return value.substring(0, 4) + '...' + value.substring(value.length - 4);
    };
    
    res.status(200).json({
      success: true,
      connection: connectionStatus,
      env: {
        supabaseUrl: process.env.SUPABASE_URL ? maskValue(process.env.SUPABASE_URL) : null,
        supabaseKey: process.env.SUPABASE_KEY ? maskValue(process.env.SUPABASE_KEY) : null,
        jwtSecret: process.env.JWT_SECRET ? maskValue(process.env.JWT_SECRET) : null,
        nodeEnv: process.env.NODE_ENV,
      }
    });
  } catch (error) {
    console.error('Error en diagnóstico:', error);
    res.status(500).json({ error: 'Error al diagnosticar la conexión', details: (error as Error).message });
  }
});

// Rutas de la API
// Usuarios
app.post('/api/register', userController.register);
app.post('/api/login', userController.login);
app.get('/api/user', userController.getCurrentUser);
app.get('/api/achievements', userController.getAllAchievements);
app.get('/api/user/:userId/achievements', userController.getUserAchievementsById);
app.post('/api/detection/record', authenticate, userController.recordHighConfidenceDetection);

// Imágenes
app.post('/api/analyze', imageController.analyzeImage);

// Ruta para servir la aplicación SPA (Vue)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar el servidor después de inicializar la base de datos
(async () => {
  try {
    console.log('Verificando conexión a Supabase...');
    const connected = await supabaseDB.checkConnection();
    console.log('Estado de conexión a Supabase:', connected ? 'CONECTADO' : 'NO CONECTADO');
    
    if (!connected) {
      console.log('⚠️ Advertencia: No se pudo conectar a Supabase pero continuaremos...');
    }

    // Inicializar la base de datos Supabase
    console.log('Intentando inicializar la base de datos...');
    try {
      await supabaseDB.initDatabase();
      console.log('✅ Base de datos inicializada correctamente');
    } catch (dbError) {
      console.error('❌ Error al inicializar la base de datos:', dbError);
      console.log('⚠️ Continuando sin inicialización de la base de datos');
    }
    
    // Iniciar el servidor
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error grave al iniciar el servidor:', error);
    process.exit(1);
  }
})(); 