import { apiService } from '../api/ApiService';
import type { UserInfo } from '../../types';

export const userApi = {
  // 내 프로필 조회 (Role 정보 포함됨)
  getProfile: () =>
    apiService.get<UserInfo>('/api/v1/user/profile'),
};
