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
    const { places, topPlaces } = get()
    
    try {
      await placeApi.likePlace(placeId)
      
      const updateList = (list: Place[]) => 
        list.map(p => p.id === placeId ? { ...p, likeCount: p.likeCount + 1 } : p)

      const updatedPlaces = updateList(places)
      const updatedTopPlaces = updateList(topPlaces)

      set({ 
        places: updatedPlaces,
        topPlaces: updatedTopPlaces
      })
    } catch (error) {
      console.error('Like toggle failed:', error)
    }
  }
}))
