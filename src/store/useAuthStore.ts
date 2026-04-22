import { create } from 'zustand'
import { storageService } from '../services/auth/StorageService'

interface UserInfo {
  email: string
  nickName: string
  profileUrl?: string
}

interface AuthState {
  isLoggedIn: boolean
  user: UserInfo | null
  login: (accessToken: string, refreshToken: string, user: UserInfo) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: !!storageService.getAccessToken(),
  user: null, // 실제로는 앱 로드 시 프로필 조회를 통해 채워야 함
  
  login: (accessToken, refreshToken, user) => {
    storageService.saveAccessToken(accessToken)
    storageService.saveRefreshToken(refreshToken)
    set({ isLoggedIn: true, user })
  },
  
  logout: () => {
    storageService.clearTokens()
    set({ isLoggedIn: false, user: null })
  }
}))
