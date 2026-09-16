import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/userRepository.js';
import { generateToken } from '../utils/jwtUtils.js';
import admin from '../config/firebaseAdmin.js';

const userRepository = new UserRepository();

export class AuthService {
  async register(name: string, email: string, password?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const userExists = await userRepository.findByEmail(normalizedEmail);
    if (userExists) {
      const error = new Error('User already exists');
      (error as any).statusCode = 400;
      throw error;
    }

    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const user = await userRepository.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user.id),
    };
  }

  async login(email: string, password?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user || (password && !user.password)) {
      const error = new Error('Invalid email or password');
      (error as any).statusCode = 401;
      throw error;
    }

    if (password && user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
         const error = new Error('Invalid email or password');
         (error as any).statusCode = 401;
         throw error;
      }
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user.id),
    };
  }

  async googleAuth(tokenId: string) {
    const decodedToken = await admin.auth().verifyIdToken(tokenId);
    if (!decodedToken) {
       const error = new Error('Invalid Google Token');
       (error as any).statusCode = 401;
       throw error;
    }

    const { email, name, uid: google_id } = decodedToken;
    if (!email) {
       const error = new Error('Google account must have an email');
       (error as any).statusCode = 400;
       throw error;
    }

    let user = await userRepository.findByEmail(email);
    if (!user) {
      user = await userRepository.create({
        name: name || email.split('@')[0],
        email,
        google_id,
      });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user.id),
    };
  }
}
