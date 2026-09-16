import { AuthService } from '../services/authService.js';
const authService = new AuthService();
export const register = async (req, res, next) => {
    const { name, email, password } = req.body;
    try {
        const result = await authService.register(name, email, password);
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
};
export const login = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const result = await authService.login(email, password);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
export const googleAuth = async (req, res, next) => {
    const { tokenId } = req.body;
    if (!tokenId) {
        res.status(400).json({ message: 'Google Token is required' });
        return;
    }
    try {
        const result = await authService.googleAuth(tokenId);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Detailed Google Auth Error:', error.message || error);
        if (error.code === 'auth/id-token-expired') {
            res.status(401).json({ message: 'Authentication failed: Token expired' });
        }
        else if (error.code === 'auth/argument-error') {
            res.status(401).json({ message: 'Authentication failed: Invalid token argument' });
        }
        else {
            next(error);
        }
    }
};
export const getProfile = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    try {
        const { default: prisma } = await import('../config/client.js');
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                google_id: true,
                subscription_tier: true,
                subscription_status: true,
                created_at: true,
                _count: {
                    select: {
                        projects: true,
                        team_members: true
                    }
                }
            }
        });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            google_id: user.google_id,
            isGoogleAuth: Boolean(user.google_id),
            subscription_tier: user.subscription_tier,
            subscription_status: user.subscription_status,
            created_at: user.created_at,
            projectCount: user._count?.projects || 0,
            teamCount: user._count?.team_members || 0
        });
    }
    catch (error) {
        next(error);
    }
};
export const updateProfile = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ message: 'Valid name is required' });
        return;
    }
    try {
        const { default: prisma } = await import('../config/client.js');
        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data: { name: name.trim() },
            select: {
                id: true,
                name: true,
                email: true,
                subscription_tier: true,
                created_at: true
            }
        });
        res.json(updated);
    }
    catch (error) {
        next(error);
    }
};
