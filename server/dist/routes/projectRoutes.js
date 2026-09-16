import { Router } from 'express';
import { importRepository, getUserProjects, getProjectDetails, rescanProject, deleteProject, exportOpenApi, exportPostman } from '../controllers/projectController.js';
import { getProjectAnalytics, getPlatformOverview } from '../controllers/analyticsController.js';
import { createVersion, getVersions } from '../controllers/versionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';
const router = Router();
router.use(protect); // secure all routes below
router.post('/import', importRepository);
router.get('/', getUserProjects);
router.get('/analytics/overview', getPlatformOverview);
router.get('/:id', getProjectDetails);
router.post('/:id/rescan', rescanProject);
router.delete('/:id', deleteProject);
// Specification Exports (OpenAPI 3.1 & Postman Collection v2.1)
router.get('/:id/export/openapi', exportOpenApi);
router.get('/:id/export/postman', exportPostman);
// Analytics & Versioning
router.get('/:projectId/analytics', getProjectAnalytics);
router.post('/:projectId/version', authorize(['ADMIN', 'MEMBER']), createVersion);
router.get('/:projectId/versions', getVersions);
export default router;
