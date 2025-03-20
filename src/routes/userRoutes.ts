import express, { RequestHandler } from 'express';
import { 
  register, 
  login, 
  getCurrentUser, 
  recordHighConfidenceDetection,
  getAllAchievements,
  getUserAchievementsById
} from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Rutas públicas
router.post('/register', register as RequestHandler);
router.post('/login', login as RequestHandler);

// Rutas protegidas
router.get('/me', authenticateToken as RequestHandler, getCurrentUser as RequestHandler);

// Rutas de logros
router.get('/achievements', authenticateToken as RequestHandler, getAllAchievements as RequestHandler);
router.get('/achievements/:userId', authenticateToken as RequestHandler, getUserAchievementsById as RequestHandler);
router.post('/detection', authenticateToken as RequestHandler, recordHighConfidenceDetection as RequestHandler);

export default router; 