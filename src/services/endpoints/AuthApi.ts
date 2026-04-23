import { apiService } from '../api/ApiService';

export interface LoginResponse {
  email: string;
  accessToken: string;
  refreshToken: string;
  settingStatus: null;
}

export interface SignupRequest {
  email: string;
  password: string;
  nickName: string;
}

export interface SignupResponse {
  email: string;
  nickName: string;
}

export const authApi = {
  // 일반 로그인
  login: (data: { email: string; password: string; deviceId: string; pushKey: string }) =>
    apiService.post<LoginResponse>('/api/v1/auth/login', data),

  // OAuth 로그인
  oauthLogin: (data: { token: string; snsType: 'KAKAO' | 'GOOGLE' | 'APPLE'; deviceId: string; pushKey: string }) =>
    apiService.post<LoginResponse>('/api/v1/auth/oauth/login', data),

  // 회원가입
  signup: (data: SignupRequest) =>
    apiService.post<SignupResponse>('/api/v1/user/signup', data),

  // 이메일 중복 체크
  checkEmailDuplicate: (email: string) =>
    apiService.get<boolean>(`/api/v1/user/email/check`, { params: { email } }),

  // 이메일 인증번호 전송
  sendEmailVerification: (email: string) =>
    apiService.post<string>('/api/v1/user/email/send', { email }),

  // 이메일 인증번호 확인
  verifyEmailCode: (email: string, code: string) =>
    apiService.post<boolean>('/api/v1/user/email/verify', { email, code }),

  // 비밀번호 재설정 이메일 전송
  sendPasswordResetEmail: (email: string) =>
    apiService.post<string>('/api/v1/auth/password/email/send', { email }),
};
