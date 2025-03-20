import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Clave secreta para firmar tokens JWT
export const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_aqui';

// Interfaz para extender Request con datos del usuario
export interface AuthRequest extends Request {
  user?: { id: number; username: string };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ error: 'Se requiere autenticación' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.status(403).json({ error: 'Token inválido o expirado' });
      return;
    }
    
    req.user = user as { id: number; username: string };
    next();
  });
} 