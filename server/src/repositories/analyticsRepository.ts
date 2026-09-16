import { Prisma } from '@prisma/client';
import prisma from '../config/client.js';

export class AnalyticsRepository {
  async getRequestCountsByEndpoint(projectId: string): Promise<any[]> {
    return prisma.requestHistory.groupBy({
      by: ['endpoint_id', 'method', 'url'],
      where: { endpoint: { project_id: projectId } },
      _count: { id: true },
      _avg: { duration: true },
      orderBy: { _count: { id: 'desc' } }
    } as any);
  }

  async getDailyRequestCounts(projectId: string, days: number = 7): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*) as count, AVG(duration) as avg_latency
      FROM "RequestHistory"
      WHERE endpoint_id IN (SELECT id FROM "Endpoint" WHERE project_id = ${projectId})
      AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
  }

  /**
   * Calculates P95 and P99 latencies for endpoints in a project.
   */
  async getLatencyPercentiles(projectId: string) {
    return prisma.$queryRaw`
      SELECT 
        endpoint_id,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration) as p99
      FROM "RequestHistory"
      WHERE endpoint_id IN (SELECT id FROM "Endpoint" WHERE project_id = ${projectId})
      GROUP BY endpoint_id
    `;
  }

  /**
   * Detects outliers (anomalies) where latency is > (avg + 3 * stddev)
   */
  async detectLatencyAnomalies(projectId: string) {
    return prisma.$queryRaw`
      WITH stats AS (
        SELECT endpoint_id, AVG(duration) as avg_d, STDDEV(duration) as std_d
        FROM "RequestHistory"
        WHERE endpoint_id IN (SELECT id FROM "Endpoint" WHERE project_id = ${projectId})
        GROUP BY endpoint_id
      )
      SELECT h.*
      FROM "RequestHistory" h
      JOIN stats s ON h.endpoint_id = s.endpoint_id
      WHERE h.duration > (s.avg_d + 3 * s.std_d)
      AND h.created_at >= NOW() - INTERVAL '24 hours'
    `;
  }

  async getTotalEndpoints(projectId: string): Promise<number> {
    return prisma.endpoint.count({
      where: { project_id: projectId }
    });
  }

  async getPlatformOverview(userId: string) {
    const totalProjects = await prisma.project.count({ where: { user_id: userId } });
    const totalEndpoints = await prisma.endpoint.count({ where: { project: { user_id: userId } } });
    const totalCalls = await prisma.requestHistory.count({ where: { user_id: userId } });
    const avgDurationResult = await prisma.requestHistory.aggregate({
      where: { user_id: userId },
      _avg: { duration: true }
    });
    const errorCount = await prisma.requestHistory.count({
      where: { user_id: userId, status: { gte: 400 } }
    });
    const errorRate = totalCalls > 0 ? ((errorCount / totalCalls) * 100).toFixed(2) : '0.00';
    const recentHistory = await prisma.requestHistory.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 15,
      select: {
        id: true,
        method: true,
        url: true,
        status: true,
        duration: true,
        created_at: true
      }
    });

    return {
      totalProjects,
      totalEndpoints,
      totalCalls,
      avgLatencyMs: Math.round(avgDurationResult._avg.duration || 0),
      errorRatePct: errorRate,
      errorCount,
      recentHistory
    };
  }
}
