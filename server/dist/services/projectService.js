import { ProjectRepository } from '../repositories/projectRepository.js';
// import { getChannel } from '../config/rabbitmq.js';
import { processScanJob } from '../workers/scannerWorker.js';
const projectRepository = new ProjectRepository();
export class ProjectService {
    async importRepository(userId, repositoryUrl) {
        const trimmedUrl = repositoryUrl.trim();
        let name = 'New Project';
        try {
            const parsed = new URL(trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`);
            const pathParts = parsed.pathname.split('/').filter(Boolean);
            if (pathParts.length > 0) {
                name = pathParts[pathParts.length - 1].replace('.git', '');
            }
            else {
                name = parsed.hostname.replace('.onrender.com', '').replace(/^www\./, '');
            }
        }
        catch {
            name = trimmedUrl.split('/').filter(Boolean).pop()?.replace('.git', '') || 'New Project';
        }
        const project = await projectRepository.create(userId, trimmedUrl, name);
        // Trigger scan directly in the background
        processScanJob(project.id, trimmedUrl).catch(err => {
            console.error(`Background scan failed for project ${project.id}:`, err);
        });
        return project;
    }
    async getProjectsByUser(userId) {
        return projectRepository.findByUserId(userId);
    }
    async getProjectById(id, userId) {
        const project = await projectRepository.findById(id, userId);
        if (!project) {
            const error = new Error('Project not found');
            error.statusCode = 404;
            throw error;
        }
        return project;
    }
    async rescanProject(id, userId) {
        const project = await this.getProjectById(id, userId);
        await projectRepository.updateStatus(id, 'scanning');
        processScanJob(project.id, project.repository_url).catch(err => {
            console.error(`Background scan failed for project ${project.id}:`, err);
        });
        return { ...project, status: 'scanning' };
    }
    async deleteProject(id, userId) {
        const deleted = await projectRepository.delete(id, userId);
        if (!deleted) {
            const error = new Error('Project not found or unauthorized');
            error.statusCode = 404;
            throw error;
        }
        return deleted;
    }
}
