import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { PostgrestError } from '@supabase/supabase-js';
import type { UserAchievement } from '../models/User.js';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('SUPABASE CONFIG - URL exists:', !!supabaseUrl);
console.log('SUPABASE CONFIG - KEY exists:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Las variables de entorno SUPABASE_URL y SUPABASE_KEY son requeridas');
}

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Verificar si podemos conectarnos a Supabase
export async function checkConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('users').select('count()', { count: 'exact' }).limit(1);
    
    if (error) {
      console.error('Error conectando a Supabase:', error);
      return false;
    }
    
    console.log('Conexión a Supabase exitosa:', data);
    return true;
  } catch (error) {
    console.error('Error grave conectando a Supabase:', error);
    return false;
  }
}

// Función para ejecutar SQL directamente
export async function executeSQL(query: string, params: any[] = []): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('execute_sql', { 
      query_text: query, 
      params: params 
    });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error ejecutando SQL:', error);
    throw error;
  }
}

// Inicializar la base de datos
export async function initDatabase(): Promise<void> {
  try {
    // Crear tabla de usuarios si no existe
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        login_streak INTEGER DEFAULT 0
      )
    `);

    // Crear tabla de logros si no existe
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS achievements (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        icon VARCHAR(255) NOT NULL
      )
    `);

    // Crear tabla de logros de usuario si no existe
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        achievement_id VARCHAR(255) REFERENCES achievements(id) ON DELETE CASCADE,
        progress INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        UNIQUE(user_id, achievement_id)
      )
    `);

    // Insertar logros predeterminados si no existen
    const achievementsExist = await executeSQL(`SELECT COUNT(*) as count FROM achievements`);
    if (achievementsExist[0].count === 0) {
      await executeSQL(`
        INSERT INTO achievements (id, name, description, icon) VALUES
        ('first_login', 'Primera Conexión', 'Conectarse por primera vez a la plataforma', 'mdi-login-variant'),
        ('daily_login', 'Usuario Frecuente', 'Iniciar sesión durante 5 días consecutivos', 'mdi-calendar-check'),
        ('detection_master', 'Maestro de la Detección', 'Realizar 10 detecciones con alta confianza', 'mdi-shield-check')
        ON CONFLICT (id) DO NOTHING
      `);
    }

    // Crear un usuario de prueba si no hay usuarios
    const usersExist = await executeSQL(`SELECT COUNT(*) as count FROM users`);
    if (usersExist[0].count === 0) {
      // Contraseña: password123
      await executeSQL(`
        INSERT INTO users (username, email, password) VALUES
        ('test', 'test@example.com', '$2a$10$nSBJRlw1Rfw.VLc9hRJeOO.bJGCT5u8HtpzimNDy88Bwt4Z0d5j3.')
      `);
      
      // Asignar logro de primera conexión al usuario de prueba
      const testUser = await executeSQL(`SELECT id FROM users WHERE username = 'test'`);
      if (testUser.length > 0) {
        await executeSQL(`
          INSERT INTO user_achievements (user_id, achievement_id, progress, completed, unlocked_at)
          VALUES ($1, 'first_login', 1, TRUE, CURRENT_TIMESTAMP)
        `, [testUser[0].id]);
      }
    }
    
    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
}

// Función para obtener un usuario por ID
export async function getUserById(id: number): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al obtener usuario por ID:', error);
    return null;
  }
}

// Función para obtener un usuario por nombre de usuario
export async function getUserByUsername(username: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 es "no se encontraron registros"
    return data;
  } catch (error) {
    console.error('Error al obtener usuario por nombre de usuario:', error);
    return null;
  }
}

// Función para crear un nuevo usuario
export async function createUser(username: string, email: string, password: string): Promise<{id: number}> {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        { username, email, password, last_login: new Date().toISOString() }
      ])
      .select('id')
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al crear usuario:', error);
    throw error;
  }
}

// Función para actualizar el streak de login y último login
export async function updateUserLoginStreak(userId: number, newStreak: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        login_streak: newStreak, 
        last_login: new Date().toISOString() 
      })
      .eq('id', userId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error al actualizar streak de login:', error);
    throw error;
  }
}

// Función para asignar o actualizar un logro
export async function assignAchievement(userId: number, achievementId: string, progress: number = 1, completed: boolean = false): Promise<void> {
  try {
    // Verificar si el usuario ya tiene este logro
    const { data: existingAchievement, error: selectError } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single();
    
    if (selectError && selectError.code !== 'PGRST116') throw selectError;

    if (existingAchievement) {
      // Si ya existe, actualizar progreso si no está completado
      if (!existingAchievement.completed) {
        const newProgress = Math.max(existingAchievement.progress + progress, existingAchievement.progress);
        const newCompleted = completed || 
                             (achievementId === 'detection_master' && newProgress >= 10) ||
                             (achievementId === 'daily_login' && newProgress >= 5);
        
        const unlockedAt = newCompleted && !existingAchievement.completed 
          ? new Date().toISOString() 
          : existingAchievement.unlocked_at;
        
        const { error } = await supabase
          .from('user_achievements')
          .update({
            progress: newProgress,
            completed: newCompleted,
            unlocked_at: unlockedAt
          })
          .eq('user_id', userId)
          .eq('achievement_id', achievementId);
        
        if (error) throw error;
      }
    } else {
      // Si no existe, crear nuevo
      const { error } = await supabase
        .from('user_achievements')
        .insert([{
          user_id: userId,
          achievement_id: achievementId,
          progress: progress,
          completed: completed,
          unlocked_at: completed ? new Date().toISOString() : null
        }]);
      
      if (error) throw error;
    }
  } catch (error) {
    console.error('Error al asignar logro:', error);
    throw error;
  }
}

// Función para obtener los logros de un usuario
export async function getUserAchievements(userId: number): Promise<UserAchievement[]> {
  try {
    // Consulta usando JOIN a través de SQL nativo para mayor flexibilidad
    const achievements = await executeSQL(`
      SELECT ua.achievement_id, ua.user_id, ua.unlocked_at, ua.progress, ua.completed,
             a.name, a.description, a.icon
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1
      ORDER BY ua.completed DESC, ua.progress DESC
    `, [userId]);
    
    return achievements;
  } catch (error) {
    console.error('Error al obtener logros del usuario:', error);
    return [];
  }
} 