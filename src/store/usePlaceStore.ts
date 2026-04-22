import { create } from 'zustand'
import type { Place } from '../types'
import { placeApi } from '../services/endpoints/PlaceApi'

interface PlaceState {
  places: Place[]
  topPlaces: Place[]
  selectedPlace: Place | null
  isLoading: boolean
  
  fetchPlaces: (keyword?: string, lat?: number, lng?: number) => Promise<void>
  setSelectedPlace: (place: Place | null) => void
  toggleLike: (placeId: number) => Promise<void>
}

export const usePlaceStore = create<PlaceState>((set, get) => ({
  places: [],
  topPlaces: [],
  selectedPlace: null,
  isLoading: false,

  fetchPlaces: async (keyword, lat, lng) => {
    set({ isLoading: true })
    try {
      let response;
      if (keyword && lat && lng) {
        response = await placeApi.searchPlaces(keyword, lat, lng)
      } else {
        response = await placeApi.getPlaces()
      }
      
      const places = response.data
      const topPlaces = [...places].sort((a, b) => b.likeCount - a.likeCount).slice(0, 20)
      
      set({ places, topPlaces, isLoading: false })
    } catch (error) {
      console.error('Fetch places failed:', error)
      set({ isLoading: false })
    }
  },

  setSelectedPlace: (place) => set({ selectedPlace: place }),

  toggleLike: async (placeId) => {
    const { places, topPlaces, selectedPlace } = get()
    const place = places.find(p => p.id === placeId)
    if (!place) return

    try {
      // 낙관적 업데이트를 고려할 수 있으나 여기서는 단순 처리
      await placeApi.likePlace(placeId)
      // 실제 프로젝트에서는 유저의 좋아요 여부에 따라 unlike/like 분기 필요
      
      // 상태 갱신을 위해 다시 페치하거나 수동 업데이트
      const updatedPlaces = places.map(p => 
        p.id === placeId ? { ...p, likeCount: p.likeCount + 1 } : p
      )
      set({ 
        places: updatedPlaces,
        topPlaces: [...updatedPlaces].sort((a, b) => b.likeCount - a.likeCount).slice(0, 20)
      })
    } catch (error) {
      console.error('Like toggle failed:', error)
    }
  }
}))
