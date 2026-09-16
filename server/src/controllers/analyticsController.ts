import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { AnalyticsService } from '../services/analyticsService.js';

const analyticsService = new AnalyticsService();

export const getProjectAnalytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { projectId } = req.params;
  
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const result = await analyticsService.getProjectAnalytics(projectId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getPlatformOverview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const result = await analyticsService.getPlatformOverview((req.user as any).id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

