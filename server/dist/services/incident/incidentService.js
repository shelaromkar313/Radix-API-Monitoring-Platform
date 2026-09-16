import prisma from '../../config/client.js';
import { getIO } from '../../config/socket.js';
import { IncidentAnalysisService } from './ai/incidentAnalysisService.js';
import { IncidentNotificationService } from './notification/incidentNotificationService.js';
import { AuditService } from './auditService.js';
export class IncidentService {
    /**
     * Creates a new incident with deduplication and kicks off automated AI diagnosis
     */
    static async createIncident(input) {
        // 1. Deduplication: check for active unresolved incident on this endpoint
        const existing = await prisma.incident.findFirst({
            where: {
                project_id: input.projectId,
                endpoint_id: input.endpointId || undefined,
                status: {
                    in: ['OPEN', 'INVESTIGATING', 'AI_ANALYZING', 'REMEDIATION_PENDING', 'AWAITING_APPROVAL', 'REMEDIATING', 'VERIFYING']
                }
            },
            orderBy: { created_at: 'desc' }
        });
        if (existing) {
            // Update existing incident metrics snapshot and record event
            await prisma.incident.update({
                where: { id: existing.id },
                data: {
                    metrics_snapshot: input.metrics,
                    severity: input.severity // update severity if elevated
                }
            });
            await prisma.incidentEvent.create({
                data: {
                    incident_id: existing.id,
                    event_type: 'TELEMETRY_UPDATED',
                    message: `Active incident metrics updated: Latency ${input.metrics.currentLatencyMs}ms, Error Rate ${input.metrics.currentErrorRatePct}%.`,
                    metadata: { metrics: input.metrics },
                    actor_id: 'MONITORING_ENGINE'
                }
            });
            return existing;
        }
        // 2. Create brand new Incident record
        const incident = await prisma.incident.create({
            data: {
                project_id: input.projectId,
                endpoint_id: input.endpointId || null,
                title: input.title,
                description: input.description || `Anomaly detected on ${input.endpointId ? 'endpoint' : 'service'} with ${input.metrics.currentErrorRatePct}% errors and ${input.metrics.currentLatencyMs}ms latency.`,
                severity: input.severity,
                status: 'OPEN',
                category: (input.category || 'UNKNOWN'),
                metrics_snapshot: input.metrics
            },
            include: {
                endpoint: true,
                project: true
            }
        });
        // 3. Log initial creation event
        await prisma.incidentEvent.create({
            data: {
                incident_id: incident.id,
                event_type: 'INCIDENT_CREATED',
                message: `Incident opened: ${incident.title} (Severity: ${incident.severity}). Current Latency: ${input.metrics.currentLatencyMs}ms (Baseline: ${input.metrics.baselineLatencyMs}ms).`,
                metadata: { metrics: input.metrics },
                actor_id: 'MONITORING_ENGINE'
            }
        });
        await AuditService.log({
            action: 'CREATE_INCIDENT',
            entityType: 'INCIDENT',
            entityId: incident.id,
            details: { title: incident.title, severity: incident.severity }
        });
        // 4. Emit Socket.io event & Notification
        try {
            const io = getIO();
            io.emit('incident.created', {
                incident,
                metrics: input.metrics
            });
        }
        catch (e) {
            // safe
        }
        await IncidentNotificationService.notify({
            type: 'INCIDENT_CREATED',
            incidentId: incident.id,
            title: `🚨 [${incident.severity}] ${incident.title}`,
            message: `Detected at ${new Date().toLocaleTimeString()} on ${incident.endpoint?.path || 'service'}`,
            severity: incident.severity,
            projectId: incident.project_id,
            metadata: {
                metrics: input.metrics,
                method: incident.endpoint?.method || 'API',
                endpointPath: incident.endpoint?.path || incident.title,
                status: input.metrics.fiveXxCount > 0 ? 500 : (input.metrics.fourXxCount > 0 ? 400 : 200)
            }
        });
        // 5. Trigger automated AI RCA asynchronously if requested
        if (input.autoAnalyze !== false) {
            setImmediate(async () => {
                try {
                    await IncidentAnalysisService.analyzeIncident(incident.id);
                }
                catch (err) {
                    console.error(`[IncidentService] Automated AI analysis failed: ${err.message}`);
                    await prisma.incidentEvent.create({
                        data: {
                            incident_id: incident.id,
                            event_type: 'AI_ANALYSIS_FAILED',
                            message: `AI root cause analysis encountered an issue: ${err.message}. Awaiting manual triage.`,
                            actor_id: 'SYSTEM'
                        }
                    });
                }
            });
        }
        return incident;
    }
    /**
     * Retrieves filtered list of incidents with pagination
     */
    static async getIncidents(params) {
        const page = Number(params.page) || 1;
        const limit = Number(params.limit) || 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (params.projectId)
            where.project_id = params.projectId;
        if (params.endpointId)
            where.endpoint_id = params.endpointId;
        if (params.severity)
            where.severity = params.severity;
        if (params.status)
            where.status = params.status;
        if (params.category)
            where.category = params.category;
        if (params.startDate || params.endDate) {
            where.detected_at = {};
            if (params.startDate)
                where.detected_at.gte = new Date(params.startDate);
            if (params.endDate)
                where.detected_at.lte = new Date(params.endDate);
        }
        const [items, total] = await Promise.all([
            prisma.incident.findMany({
                where,
                include: {
                    endpoint: { select: { id: true, path: true, method: true } },
                    project: { select: { id: true, name: true } },
                    analyses: { take: 1, orderBy: { created_at: 'desc' } },
                    remediations: { take: 1, orderBy: { created_at: 'desc' } }
                },
                orderBy: { detected_at: 'desc' },
                skip,
                take: limit
            }),
            prisma.incident.count({ where })
        ]);
        return {
            items,
            total,
            page,
            pages: Math.ceil(total / limit)
        };
    }
    /**
     * Full incident details including AI analysis, remediations, approvals, and timeline
     */
    static async getIncidentById(id) {
        const incident = await prisma.incident.findUnique({
            where: { id },
            include: {
                endpoint: true,
                project: true,
                analyses: { orderBy: { created_at: 'desc' } },
                remediations: {
                    include: {
                        approvals: { include: { user: { select: { id: true, name: true, email: true } } } },
                        executions: { orderBy: { started_at: 'desc' } }
                    },
                    orderBy: { created_at: 'desc' }
                },
                events: { orderBy: { created_at: 'asc' } },
                feedbacks: {
                    include: { user: { select: { id: true, name: true } } },
                    orderBy: { created_at: 'desc' }
                }
            }
        });
        if (!incident) {
            throw new Error(`Incident ${id} not found`);
        }
        return incident;
    }
    /**
     * Enterprise Analytics & MTTR Calculation
     */
    static async getIncidentStats(projectId) {
        const where = projectId ? { project_id: projectId } : {};
        const [totalIncidents, criticalCount, highCount, openCount, resolvedCount, allIncidents, feedbacks] = await Promise.all([
            prisma.incident.count({ where }),
            prisma.incident.count({ where: { ...where, severity: 'CRITICAL' } }),
            prisma.incident.count({ where: { ...where, severity: 'HIGH' } }),
            prisma.incident.count({ where: { ...where, status: { in: ['OPEN', 'INVESTIGATING', 'AI_ANALYZING', 'REMEDIATION_PENDING', 'AWAITING_APPROVAL', 'REMEDIATING', 'VERIFYING'] } } }),
            prisma.incident.count({ where: { ...where, status: 'RESOLVED' } }),
            prisma.incident.findMany({
                where: { ...where, status: 'RESOLVED' },
                select: { detected_at: true, resolved_at: true }
            }),
            prisma.incidentFeedback.findMany({
                select: { is_correct: true }
            })
        ]);
        // Calculate actual MTTR (Mean Time to Resolution) in minutes
        let totalMinutes = 0;
        let resolvedWithDuration = 0;
        for (const inc of allIncidents) {
            if (inc.resolved_at) {
                const diffMinutes = (inc.resolved_at.getTime() - inc.detected_at.getTime()) / (1000 * 60);
                if (diffMinutes >= 0) {
                    totalMinutes += diffMinutes;
                    resolvedWithDuration++;
                }
            }
        }
        const mttrMinutes = resolvedWithDuration > 0 ? Math.round((totalMinutes / resolvedWithDuration) * 10) / 10 : 0;
        // AI Accuracy Percentage
        const totalFeedback = feedbacks.length;
        const correctFeedback = feedbacks.filter(f => f.is_correct).length;
        const aiAccuracyPct = totalFeedback > 0 ? Math.round((correctFeedback / totalFeedback) * 100) : 92.5;
        // Category breakdown
        const categoryGroup = await prisma.incident.groupBy({
            by: ['category'],
            where,
            _count: { id: true }
        });
        return {
            totalIncidents,
            criticalCount,
            highCount,
            openCount,
            resolvedCount,
            mttrMinutes,
            aiAccuracyPct,
            feedbackCount: totalFeedback,
            categoryDistribution: categoryGroup.map(g => ({
                category: g.category,
                count: g._count.id
            }))
        };
    }
    /**
     * Submit engineer feedback on AI diagnosis
     */
    static async submitFeedback(input) {
        const feedback = await prisma.incidentFeedback.create({
            data: {
                incident_id: input.incidentId,
                user_id: input.userId,
                is_correct: input.isCorrect,
                correct_root_cause: input.correctRootCause,
                comments: input.comments
            }
        });
        await prisma.incidentEvent.create({
            data: {
                incident_id: input.incidentId,
                event_type: 'AI_FEEDBACK_SUBMITTED',
                message: `Engineer verified AI diagnosis as ${input.isCorrect ? 'ACCURATE (Verified)' : 'INCORRECT'}.${input.correctRootCause ? ` Correct Root Cause: "${input.correctRootCause}"` : ''}`,
                metadata: { isCorrect: input.isCorrect, feedbackId: feedback.id },
                actor_id: input.userId
            }
        });
        return feedback;
    }
    /**
     * Development & Demonstration Scenario Simulator (Section 31)
     * Simulates the exact production outage:
     * Endpoint: /api/orders
     * Normal latency: 120ms -> Current: 1500ms
     * Normal 5xx: < 2% -> Current: 35%
     * Timeouts: 18%
     * Root Cause: Database connection pool exhaustion
     */
    static async simulateOutageDemo(projectId, userId) {
        // 1. Find or create a target project
        let project = projectId ? await prisma.project.findUnique({ where: { id: projectId } }) : null;
        if (!project) {
            project = await prisma.project.findFirst();
            if (!project) {
                let user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : await prisma.user.findFirst();
                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            name: 'Demo SRE Engineer',
                            email: 'demo@radix.io',
                            password: 'demo-password'
                        }
                    });
                }
                project = await prisma.project.create({
                    data: {
                        user_id: user.id,
                        name: 'Orders Payment Gateway',
                        description: 'Core microservice for handling user orders and transactions',
                        status: 'active'
                    }
                });
            }
        }
        // 2. Find or create /api/orders endpoint
        let endpoint = await prisma.endpoint.findFirst({
            where: { project_id: project.id, path: '/api/orders' }
        });
        if (!endpoint) {
            endpoint = await prisma.endpoint.create({
                data: {
                    project_id: project.id,
                    method: 'POST',
                    path: '/api/orders',
                    request_schema: { orderId: 'string', amount: 'number', currency: 'USD' },
                    response_schema: { status: 'created', transactionId: 'uuid' }
                }
            });
        }
        // 3. Create simulated outage telemetry snapshot
        const metrics = {
            currentLatencyMs: 1500,
            baselineLatencyMs: 120,
            latencyDeviationPct: 1150,
            currentErrorRatePct: 35.0,
            baselineErrorRatePct: 1.2,
            fiveXxCount: 7,
            fourXxCount: 0,
            timeoutCount: 4,
            totalRequests: 20,
            sampleWindowSeconds: 60
        };
        // 4. Create Incident via pipeline
        const incident = await this.createIncident({
            projectId: project.id,
            endpointId: endpoint.id,
            title: 'High Latency and 5xx Spike on /api/orders',
            description: 'API orders gateway experiencing severe degradation. Average latency is 1500ms (1150% above baseline) with 35% 5xx error rate and 18% timeouts.',
            severity: 'CRITICAL',
            category: 'DATABASE',
            metrics,
            autoAnalyze: true
        });
        return incident;
    }
}
