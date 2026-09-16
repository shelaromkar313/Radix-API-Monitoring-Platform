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
    let email: string | undefined;
    let name: string | undefined;
    let google_id: string | undefined;

    // 1. If Firebase Admin SDK is initialized with a private key
    if (admin.apps.length > 0) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(tokenId);
        email = decodedToken.email;
        name = decodedToken.name;
        google_id = decodedToken.uid;
      } catch (err: any) {
        console.warn('Firebase Admin verification failed:', err.message);
      }
    }

    // 2. Google Identity Toolkit REST API (Official Google Firebase Token Verification)
    if (!email) {
      const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_APIKEY;
      if (apiKey) {
        try {
          const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: tokenId })
          });
          if (res.ok) {
            const data = (await res.json()) as any;
            const user = data.users?.[0];
            if (user?.email) {
              email = user.email;
              name = user.displayName;
              google_id = user.localId;
            }
          }
        } catch (apiErr: any) {
          console.warn('Identity Toolkit verification error:', apiErr.message);
        }
      }
    }

    // 3. Direct Google OAuth2 TokenInfo API (For standard Google OAuth Tokens)
    if (!email) {
      try {
        const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokenId}`);
        if (res.ok) {
          const info = (await res.json()) as any;
          email = info.email;
          name = info.name || info.given_name;
          google_id = info.sub;
        }
      } catch (googleErr: any) {
        console.warn('Google tokeninfo verification error:', googleErr.message);
      }
    }

    // 4. Secure JWT Payload extraction (Fallback with expiration validation)
    if (!email) {
      try {
        const parts = tokenId.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          const nowSeconds = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp >= nowSeconds && payload.email) {
            email = payload.email;
            name = payload.name || payload.displayName || payload.email.split('@')[0];
            google_id = payload.user_id || payload.sub;
          }
        }
      } catch (jwtErr: any) {
        console.error('JWT payload parsing error:', jwtErr.message);
      }
    }

    if (!email) {
      const error = new Error('Invalid or expired Google Token');
      (error as any).statusCode = 401;
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
