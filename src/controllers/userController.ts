import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserAchievement } from '../models/User.js';
import { JWT_SECRET } from '../middleware/auth.js';
import { AuthRequest } from '../middleware/auth.js';
import * as supabaseDB from '../db/supabase.js';

// Función para detectar intentos de SQLi
function detectSQLi(input: string): boolean {
  if (!input) return false;
  
  // Patrones comunes de SQLi
  const sqlInjectionPatterns = [
    /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC|ORDER BY)(\s|$)/i,
    /'--/i,
    /\/\*.*\*\//i,
    /;(\s|$)/,
    /'(\s|)*OR(\s|)*'(\s|)*=(\s|)*'/i,
    /'(\s|)*OR(\s|)*1(\s|)*=(\s|)*1/i,
    /"\s*OR\s*".*"\s*=\s*"/i,
    /"\s*OR\s*1\s*=\s*1/i,
    /'\s*OR\s*'\d+'\s*=\s*'\d+/i,
    /SLEEP\(\d+\)/i,
    /BENCHMARK\(\d+,.*\)/i,
    /WAITFOR DELAY '\d+:\d+:\d+'/i
  ];
  
  return sqlInjectionPatterns.some(pattern => pattern.test(input));
}

// Respuestas divertidas para intentos de SQLi
const funnyResponses = [
  "¿Ah, sí? Intento de Script Kiddie, ve y aprende de s4vitar un poco, quedaste en la base de datos. ¡Es broma! 😉",
  "SQLi en 2024? ¿En serio? Mejor aprende a programar, quedaste registrado. (No es cierto, pero suena intimidante, ¿no?)",
  "SELECT * FROM hackers WHERE skill = 'novato' AND need_practice = TRUE; ... ¡Te encontré!",
  "Oh, qué tierno. Un intento de inyección SQL. Mi abuela hackea mejor, y ella piensa que SQL es una marca de detergente.",
  "DROP TABLE estudiantes; -- Ups, ¿creíste que funcionaría? Ve a hacer el curso de s4vitar y vuelve cuando seas pro.",
  "¿Sabías que cada intento de SQLi hace llorar a un programador? Piensa en los programadores. Sé amable."
];

// Obtener respuesta aleatoria para intentos de SQLi
function getRandomSQLiResponse(): string {
  const randomIndex = Math.floor(Math.random() * funnyResponses.length);
  return funnyResponses[randomIndex];
}

// Sanitizar entradas (eliminar caracteres peligrosos)
function sanitizeInput(input: string): string {
  if (!input) return '';
  // Eliminar caracteres potencialmente peligrosos
  return input.replace(/[;'"\\\/<>]/g, '');
}

// Función para actualizar el streak de inicio de sesión
async function updateLoginStreak(userId: number): Promise<void> {
  try {
    // Obtener último login y streak actual
    const user = await supabaseDB.getUserById(userId);
    
    if (!user) return;
    
    let newStreak = 1; // Valor predeterminado si es el primer login o se perdió el streak
    
    if (user.last_login) {
      const lastLogin = new Date(user.last_login);
      const now = new Date();
      
      // Calcular diferencia en días
      const diffTime = Math.abs(now.getTime() - lastLogin.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Si el último login fue ayer, aumentar el streak
      if (diffDays === 1) {
        newStreak = (user.login_streak || 0) + 1;
      } 
      // Si fue hoy, mantener el mismo streak
      else if (diffDays < 1) {
        newStreak = user.login_streak || 1;
      }
      // Si fue hace más de un día, reiniciar streak
    }
    
    // Actualizar streak y último login
    await supabaseDB.updateUserLoginStreak(userId, newStreak);
    
    // Si llegó a 5 días, otorgar logro de login diario
    if (newStreak >= 5) {
      await supabaseDB.assignAchievement(userId, 'daily_login', 5, true);
    } else if (newStreak > 0) {
      // Actualizar progreso pero no completar todavía
      await supabaseDB.assignAchievement(userId, 'daily_login', newStreak, false);
    }
    
  } catch (error) {
    console.error('Error al actualizar streak de login:', error);
  }
}

// Registrar un nuevo usuario
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password } = req.body;

    // Validar datos de entrada
    if (!username || !email || !password) {
      res.status(400).json({ error: 'Todos los campos son obligatorios' });
      return;
    }
    
    // Detectar intentos de SQLi
    if (detectSQLi(username) || detectSQLi(email) || detectSQLi(password)) {
      res.status(403).json({ error: getRandomSQLiResponse() });
      console.log(`⚠️ Posible intento de SQLi detectado desde IP: ${req.ip}`);
      return;
    }
    
    // Sanitizar entradas
    const sanitizedUsername = sanitizeInput(username);
    const sanitizedEmail = sanitizeInput(email);

    // Verificar si el usuario ya existe 
    const existingUser = await supabaseDB.getUserByUsername(sanitizedUsername);
    if (existingUser) {
      res.status(409).json({ error: 'El nombre de usuario o email ya está en uso' });
      return;
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar el nuevo usuario
    const result = await supabaseDB.createUser(sanitizedUsername, sanitizedEmail, hashedPassword);

    // Asignar logro de primera conexión al nuevo usuario
    const userId = result.id;
    if (userId) {
      await supabaseDB.assignAchievement(userId, 'first_login', 1, true);
    }

    // Generar token JWT
    const token = jwt.sign({ id: userId, username: sanitizedUsername }, JWT_SECRET, { expiresIn: '24h' });

    // Obtener logros del usuario
    const achievements = userId ? await supabaseDB.getUserAchievements(userId) : [];

    res.status(201).json({
      message: 'Usuario registrado con éxito',
      user: {
        id: userId,
        username: sanitizedUsername,
        email: sanitizedEmail,
        achievements: achievements
      },
      token
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Iniciar sesión
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    // Validar datos de entrada
    if (!username || !password) {
      res.status(400).json({ error: 'Se requiere nombre de usuario y contraseña' });
      return;
    }
    
    // Detectar intentos de SQLi
    if (detectSQLi(username) || detectSQLi(password)) {
      res.status(403).json({ error: getRandomSQLiResponse() });
      console.log(`⚠️ Posible intento de SQLi detectado desde IP: ${req.ip}`);
      return;
    }
    
    // Sanitizar entradas
    const sanitizedUsername = sanitizeInput(username);

    // Buscar el usuario
    const user = await supabaseDB.getUserByUsername(sanitizedUsername);
    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    // Actualizar streak de login y último login
    await updateLoginStreak(user.id);

    // Generar token JWT
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

    // Obtener usuario actualizado con streak actualizado
    const updatedUser = await supabaseDB.getUserById(user.id);
    
    // Obtener logros del usuario
    const achievements = await supabaseDB.getUserAchievements(user.id);

    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        login_streak: updatedUser.login_streak,
        last_login: updatedUser.last_login,
        achievements: achievements
      },
      token
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Obtener datos del usuario actual
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ error: 'Se requiere autenticación' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
    
    // Obtener usuario
    const user = await supabaseDB.getUserById(decoded.id);
    
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Obtener logros del usuario
    const achievements = await supabaseDB.getUserAchievements(user.id);

    // Incluir logros en la respuesta
    const userWithAchievements = {
      ...user,
      achievements
    };

    res.status(200).json(userWithAchievements);
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Registrar una detección con alta confianza
export async function recordHighConfidenceDetection(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ error: 'Se requiere autenticación' });
      return;
    }
    
    const userId = req.user.id;
    
    // Actualizar el logro de detección
    await supabaseDB.assignAchievement(userId, 'detection_master', 1);
    
    // Obtener el progreso actualizado
    const achievements = await supabaseDB.getUserAchievements(userId);
    const detectionAchievement = achievements.find(a => a.achievement_id === 'detection_master');
    
    res.status(200).json({ 
      success: true,
      progress: detectionAchievement?.progress || 0,
      completed: detectionAchievement?.completed === true
    });
  } catch (error) {
    console.error('Error al registrar detección:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Obtener todos los logros disponibles
export async function getAllAchievements(_req: Request, res: Response): Promise<void> {
  try {
    const achievements = await supabaseDB.executeSQL('SELECT * FROM achievements');
    
    res.status(200).json(achievements);
  } catch (error) {
    console.error('Error al obtener logros:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Obtener los logros de un usuario específico
export async function getUserAchievementsById(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }
    
    const achievements = await supabaseDB.getUserAchievements(userId);
    
    res.status(200).json(achievements);
  } catch (error) {
    console.error('Error al obtener logros del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} 