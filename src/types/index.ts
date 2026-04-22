export type Category = 'PARK' | 'TRAIL' | 'CAFE' | 'ETC';
export type UserRole = 'USER' | 'ADMIN';

export const CATEGORY_LABELS: Record<Category, string> = {
  PARK: '공원',
  TRAIL: '산책로',
  CAFE: '카페',
  ETC: '기타',
};

export type PlaceStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Place {
  id: number;
  userId: number;
  userNickName: string;
  title: string;
  content: string;
  latitude: number;
  longitude: number;
  category: Category;
  status: PlaceStatus;
  largeDogAvailable: boolean;
  parkingAvailable: boolean;
  offLeashAvailable: boolean;
  imageUrls: string[];
  activeTags: string[];
  likeCount: number;
  createdDate: string;
}

export interface Review {
  id: number;
  placeId: number;
  userId: number;
  userNickName: string;
  rating: number;
  comment: string;
  createdDate: string;
}

export interface UserInfo {
  email: string;
  nickName: string;
  profileUrl?: string;
  role: UserRole;
}
