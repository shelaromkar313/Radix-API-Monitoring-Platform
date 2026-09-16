import { Router } from 'express';
import { IncidentController } from '../controllers/incidentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect as any);

router.get('/', IncidentController.getIncidents as any);
router.get('/stats', IncidentController.getStats as any);
router.post('/demo/simulate-outage', IncidentController.simulateOutage as any);
router.post('/test-email', IncidentController.testEmailAlert as any);
router.get('/:id', IncidentController.getIncidentById as any);
router.post('/:id/analyze', IncidentController.triggerAnalysis as any);
router.post('/:id/feedback', IncidentController.submitFeedback as any);

export default router;
