import api from './api';

export const getProjectAnalytics = async (projectId: string) => {
  const response = await api.get(`/projects/${projectId}/analytics`);
  return response.data;
};

export const getPlatformOverview = async () => {
  const response = await api.get('/projects/analytics/overview');
  return response.data;
};

