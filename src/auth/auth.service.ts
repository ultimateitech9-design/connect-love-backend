import {
  Injectable, ConflictException, UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as CryptoJS from 'crypto-js';
import { User } from '../users/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  private decryptOrUsePlainPassword(password: string): string {
    try {
      const secret = process.env.CRYPTO_SECRET || 'fallback-secret-key';
      const bytes = CryptoJS.AES.decrypt(password, secret);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted || password;
    } catch {
      return password;
    }
  }

  private signUserToken(user: User) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      plan: user.plan,
      role: user.role || 'user',
    });
  }

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      gender: dto.gender,
      city: dto.city,
      locationLatitude: dto.locationLatitude,
      locationLongitude: dto.locationLongitude,
    });
    const saved = await this.userRepo.save(user);
    const { password: _, ...safe } = saved as any;
    return { message: 'Account created successfully', user: safe };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email: dto.email })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid email or password.');
    if (user.role !== 'user') {
      throw new UnauthorizedException('Please use the management login for this account.');
    }

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw new UnauthorizedException('Invalid email or password.');

    const token = this.signUserToken(user);

    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
      },
    };
  }

  async adminLogin(dto: LoginDto) {
    const decryptedPassword = this.decryptOrUsePlainPassword(dto.password);

    // 2. Find user
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email: dto.email })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid email or password.');

    // 3. Ensure role is admin or super_admin
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new UnauthorizedException('Access denied. Admin privileges required.');
    }

    // 4. Verify password
    const match = await bcrypt.compare(decryptedPassword, user.password);
    if (!match) throw new UnauthorizedException('Invalid email or password.');

    const token = this.signUserToken(user);

    return {
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async superAdminLogin(dto: LoginDto) {
    const decryptedPassword = this.decryptOrUsePlainPassword(dto.password);

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email: dto.email })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid email or password.');

    if (user.role !== 'super_admin') {
      throw new UnauthorizedException('Access denied. Super Admin privileges required.');
    }

    const match = await bcrypt.compare(decryptedPassword, user.password);
    if (!match) throw new UnauthorizedException('Invalid email or password.');

    const token = this.signUserToken(user);

    return {
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async marketingLogin(dto: LoginDto) {
    const decryptedPassword = this.decryptOrUsePlainPassword(dto.password);

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email: dto.email })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid email or password.');

    if (user.role !== 'marketing' && user.role !== 'super_admin') {
      throw new UnauthorizedException('Access denied. Marketing privileges required.');
    }

    const match = await bcrypt.compare(decryptedPassword, user.password);
    if (!match) throw new UnauthorizedException('Invalid email or password.');

    const token = this.signUserToken(user);

    return {
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async financeLogin(dto: LoginDto) {
    const decryptedPassword = this.decryptOrUsePlainPassword(dto.password);

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email: dto.email })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid email or password.');

    if (user.role !== 'finance' && user.role !== 'super_admin') {
      throw new UnauthorizedException('Access denied. Finance privileges required.');
    }

    const match = await bcrypt.compare(decryptedPassword, user.password);
    if (!match) throw new UnauthorizedException('Invalid email or password.');

    const token = this.signUserToken(user);

    return {
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async managementLogin(dto: LoginDto & { role: string }) {
    const roleMap: Record<string, string[]> = {
      admin: ['admin', 'super_admin'],
      'super-admin': ['super_admin'],
      marketing: ['marketing', 'super_admin'],
      finance: ['finance', 'super_admin'],
      sales: ['sales', 'super_admin'],
      support: ['support', 'admin', 'super_admin'],
    };

    const allowedRoles = roleMap[dto.role];
    if (!allowedRoles) {
      throw new UnauthorizedException('Unknown management role.');
    }

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email: dto.email })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid email or password.');
    if (!allowedRoles.includes(user.role)) {
      throw new UnauthorizedException('Access denied for this management portal.');
    }

    const password = this.decryptOrUsePlainPassword(dto.password);
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Invalid email or password.');

    const token = this.signUserToken(user);
    return {
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}
