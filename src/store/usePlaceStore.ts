import { create } from 'zustand'
import type { Place, Category } from '../types'
import { placeApi } from '../services/endpoints/PlaceApi'

interface PageInfo {
  currentPage: number
  totalPage: number
  totalElement: number
}

interface PlaceState {
  places: Place[]
  topPlaces: Place[]
  favorites: Place[]
  selectedPlace: Place | null
  isLoading: boolean
  
  placesPage: PageInfo
  topPlacesPage: PageInfo

  fetchPlaces: (keyword?: string, lat?: number, lng?: number, radius?: number, category?: Category | 'ALL', page?: number) => Promise<void>
  fetchMorePlaces: (keyword?: string, lat?: number, lng?: number, radius?: number, category?: Category | 'ALL') => Promise<void>
  
  fetchTopPlaces: (lat: number, lng: number, radius?: number, category?: Category | 'ALL', page?: number) => Promise<void>
  fetchMoreTopPlaces: (lat: number, lng: number, radius?: number, category?: Category | 'ALL') => Promise<void>
  
  fetchFavorites: () => Promise<void>
  toggleFavorite: (placeId: number) => Promise<void>
  deletePlace: (placeId: number) => Promise<void>
  setSelectedPlace: (place: Place | null) => void
  toggleLike: (placeId: number) => Promise<void>
}

const initialPageInfo = { currentPage: 0, totalPage: 0, totalElement: 0 }

export const usePlaceStore = create<PlaceState>((set, get) => ({
  places: [],
  topPlaces: [],
  favorites: [],
  selectedPlace: null,
  isLoading: false,
  placesPage: initialPageInfo,
  topPlacesPage: initialPageInfo,

  fetchPlaces: async (keyword, lat, lng, radius, category, page = 1) => {
    set({ isLoading: true })
    try {
      let response;
      const catParam = category === 'ALL' ? undefined : category
      
      if (keyword) {
        // 키워드 + 카테고리 리스트 검색 API 사용
        response = await placeApi.listPlaces(keyword, catParam, page, 10)
      } else if (lat && lng) {
        // 위치 정보가 있고 키워드가 없으면 주변 검색 API 사용
        response = await placeApi.searchPlaces('', lat, lng, radius, catParam, page, 10)
      } else {
        // 둘 다 없으면 전체 목록 조회 (카테고리 포함)
        response = await placeApi.listPlaces('', catParam, page, 10)
      }

      set({ 
        places: page === 1 ? response.data.content : [...get().places, ...response.data.content],
        placesPage: response.data.pageInfo,
        isLoading: false 
      })
    } catch (error) {
      console.error('Fetch places failed:', error)
      set({ isLoading: false })
    }
  },

  fetchMorePlaces: async (keyword, lat, lng, radius, category) => {
    const { placesPage, isLoading } = get()
    if (isLoading || placesPage.currentPage >= placesPage.totalPage) return
    await get().fetchPlaces(keyword, lat, lng, radius, category, placesPage.currentPage + 1)
  },

  fetchTopPlaces: async (lat, lng, radius, category, page = 1) => {
    try {
      const catParam = category === 'ALL' ? undefined : category
      const response = await placeApi.getNearbyTopPlaces(lat, lng, radius, catParam, page, 10)
      set({ 
        topPlaces: page === 1 ? response.data.content : [...get().topPlaces, ...response.data.content],
        topPlacesPage: response.data.pageInfo
      })
    } catch (error) {
      console.error('Fetch top places failed:', error)
    }
  },

  fetchMoreTopPlaces: async (lat, lng, radius, category) => {
    const { topPlacesPage, isLoading } = get()
    if (isLoading || topPlacesPage.currentPage >= topPlacesPage.totalPage) return
    await get().fetchTopPlaces(lat, lng, radius, category, topPlacesPage.currentPage + 1)
  },

  fetchFavorites: async () => {
    try {
      const response = await placeApi.getFavorites()
      set({ favorites: response.data.map(f => f.place) })
    } catch (error) {
      console.error('Fetch favorites failed:', error)
      set({ favorites: [] })
    }
  },

  toggleFavorite: async (placeId) => {
    const { favorites } = get()
    const isFav = favorites.some(p => p.id === placeId)

    try {
      if (isFav) {
        await placeApi.removeFavorite(placeId)
        set({ favorites: favorites.filter(p => p.id !== placeId) })
      } else {
        await placeApi.addFavorite(placeId)
        const { places, topPlaces, selectedPlace } = get()
        const placeToAdd = [...places, ...topPlaces, selectedPlace].find(p => p?.id === placeId)
        if (placeToAdd) set({ favorites: [...favorites, placeToAdd as Place] })
        else {
          const res = await placeApi.getPlaceDetail(placeId)
          set({ favorites: [...favorites, res.data] })
        }
      }
    } catch (error) {
      console.error('Toggle favorite failed:', error)
    }
  },

  deletePlace: async (placeId) => {
    try {
      await placeApi.deletePlace(placeId)
      const { places, topPlaces, favorites, selectedPlace } = get()
      set({
        places: places.filter(p => p.id !== placeId),
        topPlaces: topPlaces.filter(p => p.id !== placeId),
        favorites: favorites.filter(p => p.id !== placeId),
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
      await placeApi.likePlace(placeId)
      const res = await placeApi.getPlaceDetail(placeId)
      const updatedPlace = res.data
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
