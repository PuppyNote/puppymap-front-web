import { apiService } from '../api/ApiService';
import type { Place } from '../../types';

export const adminApi = {
  // 전체 제보 목록 조회
  getPendingPlaces: () =>
    apiService.get<Place[]>('/api/v1/admin/places', { params: { status: 'PENDING' } }),

  // 제보 장소 상세 조회
  getPlaceDetail: (placeId: number) =>
    apiService.get<Place>(`/api/v1/admin/places/${placeId}`),

  // 장소 승인
  approvePlace: (placeId: number) =>
    apiService.patch<void>(`/api/v1/admin/places/${placeId}/approve`),

  // 장소 거절
  rejectPlace: (placeId: number, reason: string) =>
    apiService.patch<void>(`/api/v1/admin/places/${placeId}/reject`, null, { params: { reason } }),
};
