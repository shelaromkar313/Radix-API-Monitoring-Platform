import express from 'express';
import { executeRequest, getRequestHistory, getEndpointMetrics } from '../controllers/testingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply protect middleware to all testing routes
router.use(protect);

router.post('/execute', executeRequest as any);
router.get('/history/:endpointId', getRequestHistory as any);
router.get('/metrics/:endpointId', getEndpointMetrics as any);

export default router;
