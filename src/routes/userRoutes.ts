import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Rutas públicas
router.post('/register', userController.register);
router.post('/login', userController.login);
router.get('/', userController.getCurrentUser);
router.get('/achievements', userController.getAllAchievements);

// Rutas protegidas
router.get('/:userId/achievements', authenticate, userController.getUserAchievementsById);
router.post('/detection/record', authenticate, userController.recordHighConfidenceDetection);

export default router; 