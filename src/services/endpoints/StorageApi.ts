import { apiService } from '../api/ApiService';

export const storageApi = {
  // 파일 업로드
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiService.post<string>('/api/v1/storage', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
