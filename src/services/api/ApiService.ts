import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { storageService } from '../auth/StorageService';

const BASE_URL = import.meta.env.VITE_API_URL;

export interface ApiResponse<T> {
  statusCode: number;
  httpStatus: string;
  message: string;
  data: T;
}

class ApiService {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.instance = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
    });

    // Request Interceptor
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = storageService.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response.data;
      },
      async (error: AxiosError) => {
        const { config, response } = error;
        const originalRequest = config as AxiosRequestConfig & { _retry?: boolean };

        if (response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.instance(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = storageService.getRefreshToken();
            if (!refreshToken) throw new Error('No refresh token');

            const refreshResponse = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
              `${BASE_URL}/api/v1/auth/refresh`,
              { refreshToken }
            );

            if (refreshResponse.data.statusCode === 200) {
              const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data.data;
              storageService.saveAccessToken(accessToken);
              storageService.saveRefreshToken(newRefreshToken);

              this.isRefreshing = false;
              this.onTokenRefreshed(accessToken);

              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              }
              return this.instance(originalRequest);
            } else {
              throw new Error('Refresh failed');
            }
          } catch (refreshError) {
            this.isRefreshing = false;
            this.refreshSubscribers = [];
            storageService.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        if (response) {
          const errorData = response.data as any;
          return Promise.reject({
            message: errorData?.message || '서버 오류가 발생했습니다.',
            statusCode: errorData?.statusCode || response.status,
            ...errorData
          });
        }
        return Promise.reject({ message: '네트워크 연결을 확인해주세요.' });
      }
    );
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.instance.get(url, config);
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.instance.post(url, data, config);
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.instance.put(url, data, config);
  }

  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.instance.patch(url, data, config);
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.instance.delete(url, config);
  }
}

export const apiService = new ApiService();
