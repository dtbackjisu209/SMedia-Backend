import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { AppDataSource } from '../../data-source.js';

const router = Router();
const authRepository = new AuthRepository(AppDataSource);
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

router.post('/register', (req, res, next) => {
    authController.register(req, res, next);
});

router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));
router.post('/reset-password-direct', (req, res, next) => {
    authController.resetPasswordDirect(req, res, next);
});
export default router;