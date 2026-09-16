import { ProjectService } from '../services/projectService.js';
import { ExportService } from '../services/exportService.js';
const projectService = new ProjectService();
const exportService = new ExportService();
export const importRepository = async (req, res, next) => {
    const { repositoryUrl } = req.body;
    if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    try {
        const project = await projectService.importRepository(req.user.id, repositoryUrl);
        res.status(201).json(project);
    }
    catch (error) {
        next(error);
    }
};
export const getUserProjects = async (req, res, next) => {
    if (!req.user)
        return;
    try {
        const projects = await projectService.getProjectsByUser(req.user.id);
        res.json(projects);
    }
    catch (error) {
        next(error);
    }
};
export const getProjectDetails = async (req, res, next) => {
    if (!req.user)
        return;
    try {
        const project = await projectService.getProjectById(req.params.id, req.user.id);
        res.json(project);
    }
    catch (error) {
        next(error);
    }
};
export const rescanProject = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    try {
        const project = await projectService.rescanProject(req.params.id, req.user.id);
        res.json({ message: 'Scan initiated', project });
    }
    catch (error) {
        next(error);
    }
};
export const deleteProject = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    try {
        const result = await projectService.deleteProject(req.params.id, req.user.id);
        res.json({ message: 'Project deleted successfully', project: result });
    }
    catch (error) {
        next(error);
    }
};
export const exportOpenApi = async (req, res, next) => {
    try {
        const spec = await exportService.generateOpenApiSpec(req.params.id);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="openapi-${req.params.id}.json"`);
        res.json(spec);
    }
    catch (error) {
        next(error);
    }
};
export const exportPostman = async (req, res, next) => {
    try {
        const collection = await exportService.generatePostmanCollection(req.params.id);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="postman-collection-${req.params.id}.json"`);
        res.json(collection);
    }
    catch (error) {
        next(error);
    }
};
