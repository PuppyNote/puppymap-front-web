import { apiService } from '../api/ApiService';
import type { Place, Review, Category } from '../../types';

export const placeApi = {
  // 장소 목록 조회 (필터 포함)
  getPlaces: (params?: { category?: Category; largeDog?: boolean; parking?: boolean; offLeash?: boolean }) =>
    apiService.get<Place[]>('/api/v1/places', { params }),

  // 장소 상세 조회
  getPlaceDetail: (placeId: number) =>
    apiService.get<Place>(`/api/v1/places/${placeId}`),

  // 장소 검색
  searchPlaces: (keyword: string, lat: number, lng: number, radius: number = 5.0) =>
    apiService.get<Place[]>('/api/v1/places/search', {
      params: { keyword, lat, lng, radius },
    }),

  // 장소 제보
  reportPlace: (data: Omit<Place, 'id' | 'userId' | 'userNickName' | 'status' | 'imageUrls' | 'activeTags' | 'likeCount' | 'createdDate'>) =>
    apiService.post<Place>('/api/v1/places', data),

  // 장소 리뷰 목록 조회
  getPlaceReviews: (placeId: number) =>
    apiService.get<Review[]>(`/api/v1/places/${placeId}/reviews`),

  // 좋아요
  likePlace: (placeId: number) =>
    apiService.post<void>(`/api/v1/places/${placeId}/likes`),

  // 좋아요 취소
  unlikePlace: (placeId: number) =>
    apiService.delete<void>(`/api/v1/places/${placeId}/likes`),
};
