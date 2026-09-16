import api from './api';

export interface MetricSnapshot {
  currentLatencyMs: number;
  baselineLatencyMs: number;
  latencyDeviationPct: number;
  currentErrorRatePct: number;
  baselineErrorRatePct: number;
  fiveXxCount: number;
  fourXxCount: number;
  timeoutCount: number;
  totalRequests: number;
  sampleWindowSeconds: number;
}

export interface IncidentItem {
  id: string;
  project_id: string;
  endpoint_id?: string;
  title: string;
  description?: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 
    | 'OPEN'
    | 'INVESTIGATING'
    | 'AI_ANALYZING'
    | 'REMEDIATION_PENDING'
    | 'AWAITING_APPROVAL'
    | 'REMEDIATING'
    | 'VERIFYING'
    | 'RESOLVED'
    | 'REMEDIATION_FAILED'
    | 'ESCALATED';
  category: string;
  detected_at: string;
  resolved_at?: string;
  metrics_snapshot?: MetricSnapshot;
  endpoint?: {
    id: string;
    path: string;
    method: string;
  };
  project?: {
    id: string;
    name: string;
  };
  analyses?: any[];
  remediations?: any[];
  events?: any[];
  feedbacks?: any[];
}

export interface IncidentStats {
  totalIncidents: number;
  criticalCount: number;
  highCount: number;
  openCount: number;
  resolvedCount: number;
  mttrMinutes: number;
  aiAccuracyPct: number;
  feedbackCount: number;
  categoryDistribution: { category: string; count: number }[];
}

export const incidentService = {
  async getIncidents(params?: {
    projectId?: string;
    severity?: string;
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await api.get('/incidents', { params });
    return response.data;
  },

  async getIncidentById(id: string): Promise<IncidentItem> {
    const response = await api.get(`/incidents/${id}`);
    return response.data;
  },

  async triggerAnalysis(id: string) {
    const response = await api.post(`/incidents/${id}/analyze`);
    return response.data;
  },

  async getStats(projectId?: string): Promise<IncidentStats> {
    const response = await api.get('/incidents/stats', { params: { projectId } });
    return response.data;
  },

  async approveRemediation(remediationId: string, reason?: string) {
    const response = await api.post(`/remediations/${remediationId}/approve`, { reason });
    return response.data;
  },

  async rejectRemediation(remediationId: string, reason: string) {
    const response = await api.post(`/remediations/${remediationId}/reject`, { reason });
    return response.data;
  },

  async executeRemediation(remediationId: string) {
    const response = await api.post(`/remediations/${remediationId}/execute`);
    return response.data;
  },

  async submitFeedback(incidentId: string, data: { isCorrect: boolean; correctRootCause?: string; comments?: string }) {
    const response = await api.post(`/incidents/${incidentId}/feedback`, data);
    return response.data;
  },

  async simulateOutageDemo(projectId?: string) {
    const response = await api.post('/incidents/demo/simulate-outage', { projectId });
    return response.data;
  },

  async testEmailAlert(toEmail?: string) {
    const response = await api.post('/incidents/test-email', { toEmail });
    return response.data;
  },

  async getRemediationRegistry() {
    const response = await api.get('/remediations/registry');
    return response.data;
  }
};
