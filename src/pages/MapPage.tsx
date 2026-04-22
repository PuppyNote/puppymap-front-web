import { Map, MapMarker } from 'react-kakao-maps-sdk'
import { Search, Heart, User, Navigation, Plus, Star, MapPin, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePlaceStore } from '../store/usePlaceStore'
import { useAuthStore } from '../store/useAuthStore'
import type { Place } from '../types'
import { LoginModal } from '../components/common/LoginModal'
import { ReportPlaceModal } from '../components/common/ReportPlaceModal'

const MapPage = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [map, setMap] = useState<kakao.maps.Map>()
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number }>({ lat: 37.5665, lng: 126.978 })
  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  const { topPlaces, places, selectedPlace, isLoading, fetchPlaces, setSelectedPlace, toggleLike } = usePlaceStore()
  const { isLoggedIn, logout, user } = useAuthStore()
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const defaultPos = { lat: 37.5665, lng: 126.978 }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = { lat: position.coords.latitude, lng: position.coords.longitude }
          setCurrentPosition(newPos)
          fetchPlaces(undefined, newPos.lat, newPos.lng)
        },
        () => fetchPlaces(undefined, defaultPos.lat, defaultPos.lng),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      )
    } else {
      fetchPlaces(undefined, defaultPos.lat, defaultPos.lng)
    }
  }, [fetchPlaces])

  const handleMapIdle = (map: kakao.maps.Map) => {
    if (timer) clearTimeout(timer)
    const newTimer = setTimeout(() => {
      fetchPlaces(searchKeyword, map.getCenter().getLat(), map.getCenter().getLng())
    }, 2000)
    setTimer(newTimer)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (map) fetchPlaces(searchKeyword, map.getCenter().getLat(), map.getCenter().getLng())
  }

  const handleMoveToCurrentLocation = () => {
    if (map) map.setCenter(new kakao.maps.LatLng(currentPosition.lat, currentPosition.lng))
  }

  return (
    <div className={S.container}>
      <aside className={S.sidebar}>
        <div className={S.sidebarHeader}>
          <div className={S.logoWrapper}>
            <div className={S.logoContainer}>
              <img src="/puppynote-icon.png" alt="Logo" className={S.logoImage} />
              <span className={S.logoText}>PUPPYMAP</span>
            </div>
            <div className="flex space-x-2">
              {isLoggedIn ? (
                <div className="flex items-center space-x-2">
                  <span className={S.userName}>{user?.nickName}님</span>
                  <button onClick={logout} className={S.logoutButton}><LogOut size={18} /></button>
                </div>
              ) : (
                <button onClick={() => setIsLoginModalOpen(true)} className={S.iconButton}><User size={20} /></button>
              )}
            </div>
          </div>
          
          <form onSubmit={handleSearch} className="relative group">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="산책하기 좋은 곳을 찾아보세요"
              className={S.searchInput}
            />
            <Search className={S.searchIcon} size={20} />
          </form>
        </div>

        <div className={S.contentArea}>
          {selectedPlace ? (
            <div className="animate-in slide-in-from-left duration-300">
              <button onClick={() => setSelectedPlace(null)} className={S.backButton}>
                ← 리스트로 돌아가기
              </button>
              <div className={S.detailCard}>
                <img 
                  src={selectedPlace.imageUrls?.[0] || 'https://via.placeholder.com/300?text=PuppyMap'} 
                  className={S.detailImage} 
                  alt={selectedPlace.title} 
                />
                <h2 className={S.detailTitle}>{selectedPlace.title}</h2>
                <div className={S.detailAddr}>
                  <MapPin size={14} className="mr-1" />
                  <span className="truncate">{selectedPlace.content}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-6">
                  <Tag active={selectedPlace.largeDogAvailable} label="대형견" color="orange" />
                  <Tag active={selectedPlace.parkingAvailable} label="주차" color="blue" />
                  <Tag active={selectedPlace.offLeashAvailable} label="오프리쉬" color="green" />
                </div>

                <button 
                  onClick={() => !isLoggedIn ? setIsLoginModalOpen(true) : toggleLike(selectedPlace.id)}
                  className={S.primaryButton}
                >
                  <Heart size={20} fill={selectedPlace.likeCount > 0 ? "white" : "transparent"} />
                  <span>좋아요 {selectedPlace.likeCount}</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className={S.sectionTitleRow}>
                <h2 className={S.sectionTitle}>
                  <Star size={18} className="text-[#FFB800] fill-[#FFB800] mr-2" />
                  인기 산책 장소 Top 20
                </h2>
                {isLoading && <div className={S.loadingSpinner} />}
              </div>
              
              <div className="space-y-4 pb-20">
                {topPlaces.length > 0 ? topPlaces.map((place, index) => (
                  <div key={place.id} onClick={() => setSelectedPlace(place)} className={S.placeCard}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1.5">
                          <span className={S.rankBadge}>NO.{index + 1}</span>
                          <span className={S.categoryText}>{place.category}</span>
                        </div>
                        <h3 className={S.placeTitle}>{place.title}</h3>
                        <p className={S.placeDesc}>{place.content}</p>
                      </div>
                      <div className={S.likeWrapper}>
                        <Heart size={18} className="text-red-400 group-hover:fill-red-400 transition-all" />
                        <span className="text-[10px] font-bold text-gray-400">{place.likeCount}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className={S.emptyState}>주변에 등록된 장소가 없습니다.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className={S.mapMain}>
        <Map center={currentPosition} style={{ width: '100%', height: '100%' }} level={3} onCreate={setMap} onIdle={handleMapIdle}>
          <MapMarker position={currentPosition} image={{ src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png", size: { width: 24, height: 35 } }} title="내 위치" />
          {places.map((place) => (
            <MapMarker key={place.id} position={{ lat: place.latitude, lng: place.longitude }} onClick={() => setSelectedPlace(place)} />
          ))}
        </Map>
        
        <div className={S.floatingControls}>
          <button onClick={handleMoveToCurrentLocation} className={S.navButton}><Navigation size={24} className="fill-[#FFB800] text-[#FFB800]" /></button>
          <button onClick={() => !isLoggedIn ? setIsLoginModalOpen(true) : setIsReportModalOpen(true)} className={S.reportButton}>
            <Plus size={24} strokeWidth={3} />
            <span className="text-lg">장소 제보</span>
          </button>
        </div>
      </main>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <ReportPlaceModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        position={map ? { lat: map.getCenter().getLat(), lng: map.getCenter().getLng() } : currentPosition}
        onSuccess={() => map && handleMapIdle(map)}
      />
    </div>
  )
}

const Tag = ({ active, label, color }: { active: boolean, label: string, color: 'orange' | 'blue' | 'green' }) => {
  const colors = {
    orange: active ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400',
    blue: active ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400',
    green: active ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
  }
  return <div className={`p-2 rounded-xl text-center text-[10px] font-bold ${colors[color]}`}>{label}</div>
}

// --- Styles ---
const S = {
  container: "flex h-screen w-full overflow-hidden bg-white font-sans text-gray-900",
  sidebar: "w-[380px] h-full flex flex-col border-r border-gray-100 z-10 shadow-2xl bg-white relative",
  sidebarHeader: "p-6 pb-4",
  logoWrapper: "flex items-center justify-between mb-6",
  logoContainer: "flex items-center space-x-2",
  logoImage: "h-10 w-10 object-contain rounded-xl shadow-sm",
  logoText: "font-black text-2xl tracking-tighter text-[#FFB800]",
  userName: "text-xs font-bold text-gray-500",
  logoutButton: "p-2.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-colors",
  iconButton: "p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors text-gray-600",
  searchInput: "w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#FFB800] focus:border-transparent transition-all outline-none shadow-sm",
  searchIcon: "absolute left-4 top-4 text-gray-400 group-focus-within:text-[#FFB800] transition-colors",
  contentArea: "flex-1 overflow-y-auto px-6 py-2 bg-gray-50/50",
  backButton: "text-sm font-medium text-gray-500 mb-4 flex items-center hover:text-gray-800",
  detailCard: "bg-white rounded-3xl p-6 shadow-sm border border-gray-100",
  detailImage: "w-full h-48 object-cover rounded-2xl mb-4",
  detailTitle: "text-2xl font-bold mb-2",
  detailAddr: "flex items-center text-sm text-gray-500 mb-4",
  primaryButton: "flex-1 py-4 bg-[#FFB800] text-white rounded-2xl font-bold hover:shadow-lg transition-all flex items-center justify-center space-x-2",
  sectionTitleRow: "flex items-center justify-between mb-4",
  sectionTitle: "font-bold text-lg text-gray-800 flex items-center",
  loadingSpinner: "animate-spin rounded-full h-4 w-4 border-2 border-[#FFB800] border-t-transparent",
  placeCard: "p-5 bg-white border border-gray-100 rounded-2xl hover:border-[#FFB800] cursor-pointer transition-all shadow-sm hover:shadow-md group",
  rankBadge: "text-[10px] font-black px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md",
  categoryText: "text-xs font-bold text-[#FFB800] uppercase tracking-wider",
  placeTitle: "font-bold text-gray-900 group-hover:text-[#FFB800] transition-colors",
  placeDesc: "text-xs text-gray-400 mt-2 line-clamp-1",
  likeWrapper: "flex flex-col items-center ml-4 space-y-1",
  emptyState: "text-center py-20 text-gray-400 text-sm",
  mapMain: "flex-1 relative bg-gray-100",
  floatingControls: "absolute bottom-10 right-10 z-20 flex flex-col space-y-4 items-end",
  navButton: "bg-white p-4 rounded-2xl shadow-xl hover:bg-gray-50 transition-all transform hover:scale-110 border border-gray-100",
  reportButton: "bg-[#FFB800] text-white px-8 py-4 rounded-3xl shadow-xl hover:shadow-[#FFB800]/20 transition-all transform hover:scale-105 font-bold flex items-center space-x-2",
}

export default MapPage
