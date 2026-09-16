import axios from 'axios';
import prisma from '../config/client.js';
import { TestingRepository } from '../repositories/testingRepository.js';
const testingRepository = new TestingRepository();
export class TestingService {
    async executeRequest(userId, endpointId, method, url, headers, body) {
        const startTime = Date.now();
        let response;
        let status;
        let duration;
        try {
            const axiosRes = await axios({
                method,
                url,
                headers: headers || {},
                data: body,
                validateStatus: () => true, // Catch all statuses to show them to the user
            });
            response = axiosRes.data;
            status = axiosRes.status;
            duration = Date.now() - startTime;
        }
        catch (error) {
            status = error.response ? error.response.status : 500;
            response = error.response ? error.response.data : { message: error.message };
            duration = Date.now() - startTime;
        }
        // Save to PostgreSQL history
        try {
            await testingRepository.saveHistory({
                endpoint_id: endpointId,
                user_id: userId,
                method: method.toUpperCase(),
                url,
                headers: headers || {},
                body: body || {},
                status,
                duration,
                response: response || {}
            });
        }
        catch (saveError) {
            console.error('Failed to save request history:', saveError);
            // Don't fail the request if history save fails
        }
        // Feed telemetry into anomaly detection engine
        try {
            const endpoint = await prisma.endpoint.findUnique({
                where: { id: endpointId },
                select: { project_id: true, path: true }
            });
            let resolvedProjectId = endpoint?.project_id;
            if (!resolvedProjectId) {
                const anyProject = await prisma.project.findFirst({ select: { id: true } });
                resolvedProjectId = anyProject?.id;
            }
            if (resolvedProjectId) {
                const { AnomalyDetectionService } = await import('./incident/anomaly/anomalyDetectionService.js');
                AnomalyDetectionService.recordTelemetry({
                    endpointId,
                    projectId: resolvedProjectId,
                    endpointPath: endpoint?.path || url,
                    method: method.toUpperCase(),
                    duration,
                    status,
                    isError: status >= 400,
                    isTimeout: duration > 5000 || status === 504
                });
                // If anomalous (e.g. 5xx or sudden latency spike > 800ms), evaluate endpoint for automatic incident creation & email alert
                if (status >= 500 || duration > 800) {
                    const anomaly = await AnomalyDetectionService.evaluateEndpoint(resolvedProjectId, endpointId);
                    if (anomaly.hasAnomaly || duration > 1000) {
                        const { IncidentService } = await import('./incident/incidentService.js');
                        await IncidentService.createIncident({
                            projectId: resolvedProjectId,
                            endpointId,
                            title: `Sudden Latency Surge: ${method.toUpperCase()} ${endpoint?.path || url} (${duration}ms)`,
                            description: `Live request detected degradation: Status ${status}, Latency ${duration}ms (${Math.round(anomaly.metrics?.latencyDeviationPct || 0)}% above baseline).`,
                            severity: anomaly.severity || (duration > 2000 ? 'CRITICAL' : 'HIGH'),
                            category: 'PERFORMANCE',
                            metrics: {
                                ...anomaly.metrics,
                                currentLatencyMs: duration,
                                latencyDeviationPct: Math.round(anomaly.metrics?.baselineLatencyMs ? ((duration - anomaly.metrics.baselineLatencyMs) / anomaly.metrics.baselineLatencyMs) * 100 : 100)
                            },
                            autoAnalyze: true
                        });
                    }
                }
            }
        }
        catch (telemetryErr) {
            // Safe failover
        }
        return { status, duration, response };
    }
    async getHistory(endpointId) {
        return testingRepository.getHistoryByEndpoint(endpointId);
    }
    async getMetrics(endpointId) {
        const history = await testingRepository.getHistoryByEndpoint(endpointId);
        const totalRequests = await prisma.requestHistory.count({
            where: { endpoint_id: endpointId }
        });
        if (history.length === 0) {
            return {
                totalRequests: 0,
                avgLatencyMs: 0,
                minLatencyMs: 0,
                maxLatencyMs: 0,
                p95LatencyMs: 0,
                errorCount: 0,
                errorRatePct: 0,
                successCount: 0,
                lastStatus: null,
                lastLatencyMs: null,
                recentHistory: [],
                statusBreakdown: { 200: 0, 400: 0, 500: 0 }
            };
        }
        const durations = history.map(h => h.duration).sort((a, b) => a - b);
        const avgLatency = Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
        const minLatency = durations[0];
        const maxLatency = durations[durations.length - 1];
        const p95Index = Math.min(Math.floor(durations.length * 0.95), durations.length - 1);
        const p95Latency = durations[p95Index] || maxLatency;
        const errorCount = history.filter(h => h.status >= 400).length;
        const successCount = history.filter(h => h.status < 400).length;
        const errorRatePct = Number(((errorCount / history.length) * 100).toFixed(1));
        const statusBreakdown = {};
        for (const h of history) {
            statusBreakdown[h.status] = (statusBreakdown[h.status] || 0) + 1;
        }
        return {
            totalRequests: totalRequests || history.length,
            avgLatencyMs: avgLatency,
            minLatencyMs: minLatency,
            maxLatencyMs: maxLatency,
            p95LatencyMs: p95Latency,
            errorCount,
            errorRatePct,
            successCount,
            lastStatus: history[0]?.status ?? null,
            lastLatencyMs: history[0]?.duration ?? null,
            recentHistory: history,
            statusBreakdown
        };
    }
}
