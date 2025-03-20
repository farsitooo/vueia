import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const dbDir = path.dirname(dbPath);

// Asegurar que el directorio existe
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Definición de logros predeterminados del sistema
export const DEFAULT_ACHIEVEMENTS = [
  {
    id: 'first_login',
    name: 'Primera Conexión',
    description: 'Iniciar sesión por primera vez en el sistema',
    icon: 'fas fa-door-open'
  },
  {
    id: 'profile_complete',
    name: 'Perfil Completo',
    description: 'Completar todos los datos del perfil',
    icon: 'fas fa-user-check'
  },
  {
    id: 'detection_master',
    name: 'Maestro de Detección',
    description: 'Realizar 10 detecciones con más del 90% de confianza',
    icon: 'fas fa-medal'
  },
  {
    id: 'daily_login',
    name: 'Visitante Frecuente',
    description: 'Iniciar sesión 5 días consecutivos',
    icon: 'fas fa-calendar-check'
  },
  {
    id: 'security_aware',
    name: 'Conciencia de Seguridad',
    description: 'Cambiar la contraseña por primera vez',
    icon: 'fas fa-shield-alt'
  }
];

// Función para inicializar la base de datos
export async function initializeDatabase() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Crear tabla de usuarios si no existe
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP,
      login_streak INTEGER DEFAULT 0
    )
  `);

  // Crear tabla de logros si no existe
  await db.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL
    )
  `);

  // Crear tabla de relación usuario-logros si no existe
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id INTEGER,
      achievement_id TEXT,
      unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      progress INTEGER DEFAULT 0,
      completed BOOLEAN DEFAULT 0,
      PRIMARY KEY (user_id, achievement_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
    )
  `);

  // Insertar logros predeterminados si no existen
  const achievementCount = await db.get('SELECT COUNT(*) as count FROM achievements');
  if (achievementCount.count === 0) {
    const stmt = await db.prepare('INSERT INTO achievements (id, name, description, icon) VALUES (?, ?, ?, ?)');
    for (const achievement of DEFAULT_ACHIEVEMENTS) {
      await stmt.run(achievement.id, achievement.name, achievement.description, achievement.icon);
    }
    await stmt.finalize();
    console.log('Logros predeterminados creados');
  }

  // Crear usuario de prueba si no existe ninguno
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Insertar usuario de prueba
    const result = await db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      ['usuario', 'usuario@ejemplo.com', hashedPassword]
    );
    
    // Asignar logro de primera conexión al usuario de prueba
    if (result.lastID) {
      await db.run(
        'INSERT INTO user_achievements (user_id, achievement_id, progress, completed) VALUES (?, ?, ?, ?)',
        [result.lastID, 'first_login', 1, 1]
      );
    }
    
    console.log('Usuario de prueba creado: usuario / password123');
  }

  return db;
}

// Obtener una instancia de la base de datos
let dbInstance: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await initializeDatabase();
  }
  return dbInstance;
} 