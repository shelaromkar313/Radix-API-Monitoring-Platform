import { AnalyticsService } from '../services/analyticsService.js';
const analyticsService = new AnalyticsService();
export const getProjectAnalytics = async (req, res, next) => {
    const { projectId } = req.params;
    if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    try {
        const result = await analyticsService.getProjectAnalytics(projectId);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
export const getPlatformOverview = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    try {
        const result = await analyticsService.getPlatformOverview(req.user.id);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
