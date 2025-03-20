import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Clave secreta para JWT
export const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_aqui';

// Extender la interfaz Request para incluir usuario autenticado
export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
  };
}

// Middleware para verificar token JWT
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    // Obtener el token desde el header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      res.status(401).json({ error: 'Acceso no autorizado: Token requerido' });
      return;
    }
    
    // Verificar el token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
    
    // Agregar el usuario al objeto request
    req.user = {
      id: decoded.id,
      username: decoded.username
    };
    
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(401).json({ error: 'Acceso no autorizado: Token inválido' });
  }
} 