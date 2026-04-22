import { create } from 'zustand'
import { storageService } from '../services/auth/StorageService'
import type { UserInfo } from '../types'

interface AuthState {
  isLoggedIn: boolean
  user: UserInfo | null
  login: (accessToken: string, refreshToken: string, user: UserInfo) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: !!storageService.getAccessToken(),
  user: storageService.getUser(), 
  
  login: (accessToken, refreshToken, user) => {
    storageService.saveAccessToken(accessToken)
    storageService.saveRefreshToken(refreshToken)
    storageService.saveUser(user)
    set({ isLoggedIn: true, user })
  },
  
  logout: () => {
    storageService.clearTokens()
    set({ isLoggedIn: false, user: null })
  }
}))
