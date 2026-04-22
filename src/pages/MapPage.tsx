import { Map, MapMarker } from 'react-kakao-maps-sdk'
import { Search, Heart, User, Navigation, Plus, Star, MapPin } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePlaceStore } from '../store/usePlaceStore'
import type { Place } from '../types'

const MapPage = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [map, setMap] = useState<kakao.maps.Map>()
  // 초기값을 서울시청으로 설정하여 GPS 대기 중에도 화면이 뜨게 함
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number }>({ lat: 37.5665, lng: 126.978 })
  
  const { topPlaces, places, selectedPlace, isLoading, fetchPlaces, setSelectedPlace, toggleLike } = usePlaceStore()

  // 현재 위치 가져오기
  useEffect(() => {
    const defaultPos = { lat: 37.5665, lng: 126.978 }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setCurrentPosition(newPos)
          fetchPlaces(undefined, newPos.lat, newPos.lng)
        },
        (error) => {
          console.error('GPS Error:', error)
          fetchPlaces(undefined, defaultPos.lat, defaultPos.lng)
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      )
    } else {
      fetchPlaces(undefined, defaultPos.lat, defaultPos.lng)
    }
  }, [fetchPlaces])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchPlaces(searchKeyword, currentPosition.lat, currentPosition.lng)
  }

  const handleMoveToCurrentLocation = () => {
    if (map) {
      map.setCenter(new kakao.maps.LatLng(currentPosition.lat, currentPosition.lng))
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-[380px] h-full flex flex-col border-r border-gray-100 z-10 shadow-2xl bg-white relative">
        {/* Header with Logo */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <img src="/logo.png" alt="PuppyNote Logo" className="h-8 object-contain" onError={(e) => (e.currentTarget.src = 'https://api.puppynote.co.kr/web/logo.png')} />
            <div className="flex space-x-2">
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <User size={20} className="text-gray-600" />
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSearch} className="relative group">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="산책하기 좋은 곳을 찾아보세요"
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#FFB800] focus:border-transparent transition-all outline-none shadow-sm"
            />
            <Search className="absolute left-4 top-4 text-gray-400 group-focus-within:text-[#FFB800] transition-colors" size={20} />
          </form>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-2 bg-gray-50/50">
          {selectedPlace ? (
            <div className="animate-in slide-in-from-left duration-300">
              <button 
                onClick={() => setSelectedPlace(null)}
                className="text-sm font-medium text-gray-500 mb-4 flex items-center hover:text-gray-800"
              >
                ← 리스트로 돌아가기
              </button>
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <img 
                  src={selectedPlace.imageUrls?.[0] || 'https://via.placeholder.com/300?text=PuppyMap'} 
                  className="w-full h-48 object-cover rounded-2xl mb-4" 
                  alt={selectedPlace.title} 
                />
                <h2 className="text-2xl font-bold mb-2">{selectedPlace.title}</h2>
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <MapPin size={14} className="mr-1" />
                  <span className="truncate">{selectedPlace.content}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className={`p-3 rounded-xl text-center text-xs font-bold ${selectedPlace.largeDogAvailable ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
                    대형견 가능
                  </div>
                  <div className={`p-3 rounded-xl text-center text-xs font-bold ${selectedPlace.parkingAvailable ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                    주차 가능
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button 
                    onClick={() => toggleLike(selectedPlace.id)}
                    className="flex-1 py-4 bg-[#FFB800] text-white rounded-2xl font-bold hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                  >
                    <Heart size={20} fill={selectedPlace.likeCount > 0 ? "white" : "transparent"} />
                    <span>좋아요 {selectedPlace.likeCount}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg text-gray-800 flex items-center">
                  <Star size={18} className="text-[#FFB800] fill-[#FFB800] mr-2" />
                  인기 산책 장소 Top 20
                </h2>
                {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#FFB800] border-t-transparent" />}
              </div>
              
              <div className="space-y-4">
                {topPlaces.length > 0 ? topPlaces.map((place, index) => (
                  <div 
                    key={place.id}
                    onClick={() => setSelectedPlace(place)}
                    className="p-5 bg-white border border-gray-100 rounded-2xl hover:border-[#FFB800] cursor-pointer transition-all shadow-sm hover:shadow-md group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1.5">
                          <span className="text-[10px] font-black px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">
                            NO.{index + 1}
                          </span>
                          <span className="text-xs font-bold text-[#FFB800] uppercase tracking-wider">{place.category}</span>
                        </div>
                        <h3 className="font-bold text-gray-900 group-hover:text-[#FFB800] transition-colors">
                          {place.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-2 line-clamp-1">{place.content}</p>
                      </div>
                      <div className="flex flex-col items-center ml-4 space-y-1">
                        <Heart size={18} className="text-red-400 group-hover:fill-red-400 transition-all" />
                        <span className="text-[10px] font-bold text-gray-400">{place.likeCount}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-20 text-gray-400 text-sm">
                    주변에 등록된 장소가 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Map Container */}
      <main className="flex-1 relative bg-gray-100">
        <Map
          center={currentPosition}
          style={{ width: '100%', height: '100%' }}
          level={3}
          onCreate={setMap}
        >
          {/* 현재 위치 마커 */}
          <MapMarker
            position={currentPosition}
            image={{
              src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
              size: { width: 24, height: 35 },
            }}
            title="내 위치"
          />

          {/* 장소 마커들 */}
          {places.map((place) => (
            <MapMarker
              key={place.id}
              position={{ lat: place.latitude, lng: place.longitude }}
              onClick={() => setSelectedPlace(place)}
            />
          ))}
        </Map>
        
        {/* Floating Controls */}
        <div className="absolute bottom-10 right-10 z-20 flex flex-col space-y-4 items-end">
          <button 
            onClick={handleMoveToCurrentLocation}
            className="bg-white p-4 rounded-2xl shadow-xl hover:bg-gray-50 transition-all transform hover:scale-110 border border-gray-100"
          >
            <Navigation size={24} className="fill-[#FFB800] text-[#FFB800]" />
          </button>

          <button className="bg-[#FFB800] text-white px-8 py-4 rounded-3xl shadow-xl hover:shadow-[#FFB800]/20 transition-all transform hover:scale-105 font-bold flex items-center space-x-2">
            <Plus size={24} strokeWidth={3} />
            <span className="text-lg">장소 제보</span>
          </button>
        </div>
      </main>
    </div>
  )
}

export default MapPage
