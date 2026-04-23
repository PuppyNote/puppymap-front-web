import { create } from 'zustand'
import type { Place } from '../types'
import { placeApi } from '../services/endpoints/PlaceApi'

interface PlaceState {
  places: Place[]
  topPlaces: Place[]
  selectedPlace: Place | null
  isLoading: boolean
  
  fetchPlaces: (keyword?: string, lat?: number, lng?: number, radius?: number, category?: Category | 'ALL') => Promise<void>
  fetchTopPlaces: (lat: number, lng: number, radius?: number, category?: Category | 'ALL') => Promise<void>
  deletePlace: (placeId: number) => Promise<void>
  setSelectedPlace: (place: Place | null) => void
  toggleLike: (placeId: number) => Promise<void>
}

export const usePlaceStore = create<PlaceState>((set, get) => ({
  places: [],
  topPlaces: [],
  selectedPlace: null,
  isLoading: false,

  fetchPlaces: async (keyword, lat, lng, radius, category) => {
    set({ isLoading: true })
    try {
      let response;
      if (lat && lng) {
        const catParam = category === 'ALL' ? undefined : category
        response = await placeApi.searchPlaces(keyword || '', lat, lng, radius, catParam)
      } else {
        response = await placeApi.getPlaces()
      }
      set({ places: response.data, isLoading: false })
    } catch (error) {
      console.error('Fetch places failed:', error)
      set({ isLoading: false, places: [] })
    }
  },

  fetchTopPlaces: async (lat, lng, radius, category) => {
    try {
      const catParam = category === 'ALL' ? undefined : category
      const response = await placeApi.getNearbyTopPlaces(lat, lng, radius, catParam)
      set({ topPlaces: response.data })
    } catch (error) {
      console.error('Fetch top places failed:', error)
      set({ topPlaces: [] })
    }
  },

  deletePlace: async (placeId) => {
    try {
      await placeApi.deletePlace(placeId)
      const { places, topPlaces, selectedPlace } = get()
      set({
        places: places.filter(p => p.id !== placeId),
        topPlaces: topPlaces.filter(p => p.id !== placeId),
        selectedPlace: selectedPlace?.id === placeId ? null : selectedPlace
      })
    } catch (error) {
      console.error('Delete place failed:', error)
      throw error
    }
  },

  setSelectedPlace: (place) => set({ selectedPlace: place }),

  toggleLike: async (placeId) => {
    try {
      // 1. 좋아요 API 호출
      await placeApi.likePlace(placeId)

      // 2. 해당 장소의 최신 정보만 다시 가져오기
      const res = await placeApi.getPlaceDetail(placeId)
      const updatedPlace = res.data

      // 3. 현재 상태의 모든 리스트에서 해당 장소만 교체 (메모리 상에서 업데이트)
      const { places, topPlaces, selectedPlace } = get()
      const syncList = (list: Place[]) => list.map(p => p.id === placeId ? updatedPlace : p)

      set({
        places: syncList(places),
        topPlaces: syncList(topPlaces),
        selectedPlace: selectedPlace?.id === placeId ? updatedPlace : selectedPlace
      })
    } catch (error) {
      console.error('Like toggle failed:', error)
      throw error
    }
  }
}))
