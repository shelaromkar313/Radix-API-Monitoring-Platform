import api from './api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  google_id?: string | null;
  isGoogleAuth: boolean;
  subscription_tier: string;
  subscription_status?: string | null;
  created_at: string;
  projectCount: number;
  teamCount: number;
}

export const getProfile = async (): Promise<UserProfile> => {
  const response = await api.get('/auth/profile');
  return response.data;
};

export const updateProfile = async (data: { name: string }): Promise<UserProfile> => {
  const response = await api.put('/auth/profile', data);
  return response.data;
};
