import { apiService } from '../api/ApiService';
import type { Place, Review, Category, PaginatedResponse } from '../../types';

export const placeApi = {
  // 장소 목록 조회 (키워드 + 카테고리 페이징)
  listPlaces: (keyword: string = '', category?: Category, page: number = 1, size: number = 10) =>
    apiService.get<PaginatedResponse<Place>>('/api/v1/places/list', { 
      params: { keyword, category, page, size } 
    }),

  // 장소 상세 조회
  getPlaceDetail: (placeId: number) =>
    apiService.get<Place>(`/api/v1/places/${placeId}`),

  // 장소 검색 (페이징 추가)
  searchPlaces: (keyword: string, lat: number, lng: number, radius: number = 5.0, category?: Category, page: number = 1, size: number = 10) =>
    apiService.get<PaginatedResponse<Place>>('/api/v1/places/search', {
      params: { keyword, lat, lng, radius, category, page, size },
    }),

  // 근처 인기 장소 Top20 조회 (페이징 추가)
  getNearbyTopPlaces: (lat: number, lng: number, radiusKm: number = 5.0, category?: Category, page: number = 1, size: number = 10) =>
    apiService.get<PaginatedResponse<Place>>('/api/v1/places/nearby/top', {
      params: { lat, lng, radiusKm, category, page, size },
    }),

  // 장소 제보
  reportPlace: (data: Omit<Place, 'id' | 'userId' | 'userNickName' | 'status' | 'activeTags' | 'likeCount' | 'createdDate'>) =>
    apiService.post<Place>('/api/v1/places', data),

  // 장소 리뷰 목록 조회
  getPlaceReviews: (placeId: number) =>
    apiService.get<Review[]>(`/api/v1/places/${placeId}/reviews`),

  // 장소 삭제
  deletePlace: (placeId: number) =>
    apiService.delete<void>(`/api/v1/places/${placeId}`),

  // 좋아요
  likePlace: (placeId: number) =>
    apiService.post<void>(`/api/v1/places/${placeId}/likes`),

  // 좋아요 취소
  unlikePlace: (placeId: number) =>
    apiService.delete<void>(`/api/v1/places/${placeId}/likes`),

  // 즐겨찾기 목록 조회
  getFavorites: () =>
    apiService.get<{ favoriteId: number; place: Place }[]>('/api/v1/users/me/favorites'),

  // 즐겨찾기 추가
  addFavorite: (placeId: number) =>
    apiService.post<void>(`/api/v1/places/${placeId}/favorites`),

  // 즐겨찾기 삭제
  removeFavorite: (placeId: number) =>
    apiService.delete<void>(`/api/v1/places/${placeId}/favorites`),
};
