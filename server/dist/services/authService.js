import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/userRepository.js';
import { generateToken } from '../utils/jwtUtils.js';
import admin from '../config/firebaseAdmin.js';
const userRepository = new UserRepository();
export class AuthService {
    async register(name, email, password) {
        const normalizedEmail = email.trim().toLowerCase();
        const userExists = await userRepository.findByEmail(normalizedEmail);
        if (userExists) {
            const error = new Error('User already exists');
            error.statusCode = 400;
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
    async login(email, password) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await userRepository.findByEmail(normalizedEmail);
        if (!user || (password && !user.password)) {
            const error = new Error('Invalid email or password');
            error.statusCode = 401;
            throw error;
        }
        if (password && user.password) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                const error = new Error('Invalid email or password');
                error.statusCode = 401;
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
    async googleAuth(tokenId) {
        let email;
        let name;
        let google_id;
        if (admin.apps.length > 0) {
            try {
                const decodedToken = await admin.auth().verifyIdToken(tokenId);
                email = decodedToken.email;
                name = decodedToken.name;
                google_id = decodedToken.uid;
            }
            catch (err) {
                console.warn('Firebase Admin verification failed, falling back to Google TokenInfo API:', err.message);
            }
        }
        // Direct Google OAuth2 TokenInfo verification (Zero-config server fallback)
        if (!email) {
            try {
                const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokenId}`);
                if (res.ok) {
                    const info = (await res.json());
                    email = info.email;
                    name = info.name || info.given_name;
                    google_id = info.sub;
                }
            }
            catch (googleErr) {
                console.error('Google tokeninfo verification error:', googleErr);
            }
        }
        if (!email) {
            const error = new Error('Invalid Google Token');
            error.statusCode = 401;
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
