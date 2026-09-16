import { getIO } from '../../../config/socket.js';
import prisma from '../../../config/client.js';
import { EmailService } from './emailService.js';
export class IncidentNotificationService {
    /**
     * Dispatches notifications across configured delivery channels (Socket.io, Webhook, Email)
     */
    static async notify(payload) {
        const timestamp = new Date().toISOString();
        console.log(`[ALERT NOTIFICATION] [${payload.severity}] ${payload.title} - ${payload.message}`);
        // 1. Socket.io Real-Time UI Broadcast
        try {
            const io = getIO();
            io.emit('incident.notification', {
                ...payload,
                timestamp
            });
        }
        catch (e) {
            // safe
        }
        // 2. Automated Email Alert to Project Owner
        if (payload.projectId) {
            try {
                const project = await prisma.project.findUnique({
                    where: { id: payload.projectId },
                    include: { user: true }
                });
                if (project?.user?.email) {
                    const metrics = payload.metadata?.metrics;
                    await EmailService.sendLatencyAlert({
                        toEmail: project.user.email,
                        userName: project.user.name || 'API Administrator',
                        projectName: project.name || 'API Service',
                        endpointPath: payload.metadata?.endpointPath || payload.message,
                        method: payload.metadata?.method || 'GET',
                        currentLatencyMs: metrics?.currentLatencyMs || 0,
                        baselineLatencyMs: metrics?.baselineLatencyMs || 120,
                        latencyDeviationPct: metrics?.latencyDeviationPct || 0,
                        status: payload.metadata?.status || 200,
                        incidentId: payload.incidentId,
                        reason: payload.title
                    });
                }
            }
            catch (emailErr) {
                console.warn(`[IncidentNotificationService] Email alert failed: ${emailErr.message}`);
            }
        }
        // 3. Webhook notification (if WEBHOOK_URL env configured)
        if (process.env.INCIDENT_WEBHOOK_URL && typeof globalThis.fetch === 'function') {
            try {
                await globalThis.fetch(process.env.INCIDENT_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: payload.type,
                        incidentId: payload.incidentId,
                        title: payload.title,
                        message: payload.message,
                        severity: payload.severity,
                        timestamp
                    })
                });
            }
            catch (err) {
                console.warn(`[IncidentNotificationService] Webhook dispatch failed: ${err.message}`);
            }
        }
    }
}
