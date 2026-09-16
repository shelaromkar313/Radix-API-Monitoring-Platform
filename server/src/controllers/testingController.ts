import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { TestingService } from '../services/testingService.js';

const testingService = new TestingService();

export const executeRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { endpointId, method, url, headers, body } = req.body;
  
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const result = await testingService.executeRequest(
      (req.user as any).id, 
      endpointId, 
      method, 
      url, 
      headers, 
      body
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getRequestHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { endpointId } = req.params;
  try {
    const history = await testingService.getHistory(endpointId);
    res.json(history);
  } catch (error) {
    next(error);
  }
};

export const getEndpointMetrics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { endpointId } = req.params;
  try {
    const metrics = await testingService.getMetrics(endpointId);
    res.json(metrics);
  } catch (error) {
    next(error);
  }
};
