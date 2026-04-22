import { apiService } from '../api/ApiService';

export interface LoginResponse {
  email: string;
  accessToken: string;
  refreshToken: string;
  settingStatus: null;
}

export const authApi = {
  // 일반 로그인
  login: (data: { email: string; password: string; deviceId: string; pushKey: string }) =>
    apiService.post<LoginResponse>('/api/v1/auth/login', data),

  // OAuth 로그인
  oauthLogin: (data: { token: string; snsType: 'KAKAO' | 'GOOGLE' | 'APPLE'; deviceId: string; pushKey: string }) =>
    apiService.post<LoginResponse>('/api/v1/auth/oauth/login', data),

  // 비밀번호 재설정 이메일 전송
  sendPasswordResetEmail: (email: string) =>
    apiService.post<string>('/api/v1/auth/password/email/send', { email }),
};
