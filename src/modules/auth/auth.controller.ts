import { NextFunction, Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './auth.dto.js';

export class AuthController {
    private authService: AuthService;
    constructor(authService: AuthService) {
        this.authService = authService;
    }
    register = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await this.authService.register(req.body);
            res.status(201).json({ message: 'User created successfully', userId: user.id });
        } catch (error: any) {
            next(error); 
        }
    };

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, password } = req.body;
            const loginDto = new LoginDto();
            loginDto.email = email;
            loginDto.password = password;
            const result = await this.authService.login(loginDto);
            res.status(200).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    logout = (req: Request, res: Response, next: NextFunction) => {
        res.status(200).json({ message: 'Logged out successfully' });
    };

    async resetPasswordDirect(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, newPassword } = req.body;
            
            if (!email || !newPassword) {
                return res.status(400).json({ message: 'Please enter both your email and new password.' });
            }

            await this.authService.resetPasswordDirect(email, newPassword);
            
            return res.status(200).json({ message: 'Password reset successfully!' });
        } catch (error: any) {
            return res.status(400).json({ message: error.message || 'Something went wrong' });
        }
    }
}
