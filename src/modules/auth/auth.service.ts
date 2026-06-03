import { AuthRepository } from './auth.repository.js';
import { RegisterDto, LoginDto } from './auth.dto.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class AuthService {

    private authRepo: AuthRepository;

    constructor(authRepo: AuthRepository) {
        this.authRepo = authRepo;
    }

    async register(registerDto: RegisterDto) {
        const existingUser = await this.authRepo.findByUsernameOrEmail(registerDto.username, registerDto.email);
        if (existingUser) throw new Error('Username hoặc Email đã tồn tại');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(registerDto.password, salt);

        return await this.authRepo.createUser({
            username: registerDto.username,
            email: registerDto.email,
            password_hash: hashedPassword,
            full_name: registerDto.full_name
        });
    }

    async login(loginDto: LoginDto) {
        const user = await this.authRepo.findByEmail(loginDto.email);
        if (!user) throw new Error('Thông tin đăng nhập không chính xác');

        const isMatch = await bcrypt.compare(loginDto.password, user.password_hash);
        if (!isMatch) throw new Error('Thông tin đăng nhập không chính xác');

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'SMEDIA_SECRET',
            { expiresIn: '1d' }
        );

        return { token, userId: user.id };
    }

    // Trong file auth.service.ts

async resetPasswordDirect(email: string, newPassword: string): Promise<void> {
    const user = await this.authRepo.findByEmail(email);
    if (!user) {
        throw new Error('Email không tồn tại trong hệ thống');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.authRepo.update(user.id, { password_hash: hashedPassword });
}
}