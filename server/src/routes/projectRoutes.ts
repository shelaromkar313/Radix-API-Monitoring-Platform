import { Router } from 'express';
import { importRepository, getUserProjects, getProjectDetails, rescanProject, deleteProject, exportOpenApi, exportPostman } from '../controllers/projectController.js';
import { getProjectAnalytics, getPlatformOverview } from '../controllers/analyticsController.js';
import { createVersion, getVersions } from '../controllers/versionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(protect as any); // secure all routes below

router.post('/import', importRepository as any);
router.get('/', getUserProjects as any);
router.get('/analytics/overview', getPlatformOverview as any);
router.get('/:id', getProjectDetails as any);
router.post('/:id/rescan', rescanProject as any);
router.delete('/:id', deleteProject as any);

// Specification Exports (OpenAPI 3.1 & Postman Collection v2.1)
router.get('/:id/export/openapi', exportOpenApi as any);
router.get('/:id/export/postman', exportPostman as any);

// Analytics & Versioning
router.get('/:projectId/analytics', getProjectAnalytics as any);
router.post('/:projectId/version', authorize(['ADMIN', 'MEMBER']), createVersion as any);
router.get('/:projectId/versions', getVersions as any);

export default router;
