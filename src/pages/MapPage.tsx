import { Map, MapMarker } from 'react-kakao-maps-sdk'
import { Search, Heart, User, Navigation, Plus, Star, MapPin, Menu, X, LogOut, ShieldCheck } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { usePlaceStore } from '../store/usePlaceStore'
import { useAuthStore } from '../store/useAuthStore'
import { userApi } from '../services/endpoints/UserApi'
import type { Category } from '../types'
import { CATEGORY_LABELS } from '../types'
import { LoginModal } from '../components/common/LoginModal'
import { ReportPlaceModal } from '../components/common/ReportPlaceModal'
import { AdminModal } from '../components/common/AdminModal'

const MapPage = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL')
  const [map, setMap] = useState<kakao.maps.Map>()
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number }>({ lat: 37.5665, lng: 126.978 })
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const [isSelectingLocation, setIsSelectingLocation] = useState(false)
  const [tempReportPosition, setTempReportPosition] = useState<{ lat: number; lng: number } | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const { topPlaces, places, selectedPlace, isLoading, fetchPlaces, setSelectedPlace, toggleLike } = usePlaceStore()
  const { isLoggedIn, logout, user, syncUser } = useAuthStore()
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsSidebarOpen(true)
      else setIsSidebarOpen(false)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const verifyIdentity = async () => {
      if (isLoggedIn) {
        try {
          const res = await userApi.getProfile()
          if (res.statusCode === 200) {
            const serverUser = res.data
            if (user && serverUser.role !== user.role) {
              alert('보안 정책상 권한 정보가 변경되어 로그아웃됩니다.')
              logout()
              return
            }
            syncUser(serverUser)
          }
        } catch (err) {
          logout()
        }
      }
    }
    verifyIdentity()
  }, [isLoggedIn])

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

  useEffect(() => {
    if (map) fetchPlaces(searchKeyword, map.getCenter().getLat(), map.getCenter().getLng())
  }, [selectedCategory])

  const handleMapIdle = (map: kakao.maps.Map) => {
    if (timer) clearTimeout(timer)
    const newTimer = setTimeout(() => {
      fetchPlaces(searchKeyword, map.getCenter().getLat(), map.getCenter().getLng())
    }, 2000)
    setTimer(newTimer)
  }

  const handleMapClick = (_t: any, mouseEvent: kakao.maps.event.MouseEvent) => {
    if (isSelectingLocation) {
      const latlng = mouseEvent.latLng
      setTempReportPosition({ lat: latlng.getLat(), lng: latlng.getLng() })
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (map) fetchPlaces(searchKeyword, map.getCenter().getLat(), map.getCenter().getLng())
    if (window.innerWidth < 1024) setIsSidebarOpen(true)
  }

  const handleMoveToCurrentLocation = () => {
    if (map) map.setCenter(new kakao.maps.LatLng(currentPosition.lat, currentPosition.lng))
  }

  const handleAdminButtonClick = () => {
    if (user?.role !== 'ADMIN') {
      alert('관리자 권한이 없습니다.')
      return
    }
    setIsAdminModalOpen(true)
  }

  const handleWheel = (e: React.WheelEvent) => { if (scrollRef.current) scrollRef.current.scrollLeft += e.deltaY }
  const onDragStart = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    isDragging.current = true
    startX.current = e.pageX - scrollRef.current.offsetLeft
    scrollLeft.current = scrollRef.current.scrollLeft
  }
  const onDragEnd = () => { isDragging.current = false }
  const onDragMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX.current) * 2
    scrollRef.current.scrollLeft = scrollLeft.current - walk
  }

  const filteredPlaces = selectedCategory === 'ALL' ? topPlaces : topPlaces.filter(p => p.category === selectedCategory)

  return (
    <div className={S.container}>
      {!isSidebarOpen && !isSelectingLocation && (
        <div className={S.mobileSearchContainer}>
          <div className={S.mobileSearchBar}>
            <button onClick={() => setIsSidebarOpen(true)} className={S.mobileMenuBtn}><Menu size={20} className="text-[#FFB800]" /></button>
            <form onSubmit={handleSearch} className="flex-1"><input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="장소 검색" className={S.mobileInput} /></form>
            <div className="flex items-center space-x-1">
              {user?.role === 'ADMIN' && (
                <button onClick={handleAdminButtonClick} className="p-2 text-red-500"><ShieldCheck size={20} /></button>
              )}
              <button onClick={() => !isLoggedIn ? setIsLoginModalOpen(true) : null} className={S.mobileUserBtn}><User size={20} className={isLoggedIn ? "text-[#FFB800]" : "text-gray-400"} /></button>
            </div>
          </div>
          <div ref={scrollRef} onWheel={handleWheel} onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd} className="flex space-x-2 overflow-x-auto no-scrollbar py-2 select-none">
            {['ALL', ...Object.keys(CATEGORY_LABELS)].map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat as any)} className={`${S.filterBadge} ${selectedCategory === cat ? S.filterBadgeActive : S.filterBadgeInactive} text-[10px] px-3 py-1.5`}>{cat === 'ALL' ? '전체' : CATEGORY_LABELS[cat as Category]}</button>
            ))}
          </div>
        </div>
      )}

      {isSelectingLocation && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center space-y-3 w-[90%] max-w-md">
          <div className="bg-black/80 text-white px-6 py-3 rounded-full shadow-2xl backdrop-blur-md animate-bounce text-sm text-center"><span className="font-bold">제보할 장소를 지도에서 클릭해주세요!</span></div>
          <div className="flex space-x-2">
            <button onClick={() => setIsSelectingLocation(false)} className="bg-white text-gray-500 px-5 py-2.5 rounded-2xl font-bold shadow-xl">취소</button>
            {tempReportPosition && (
              <button onClick={() => { setIsReportModalOpen(true); setIsSelectingLocation(false); }} className="bg-[#FFB800] text-white px-5 py-2.5 rounded-2xl font-bold shadow-xl">이 위치로 제보하기</button>
            )}
          </div>
        </div>
      )}

      <aside className={`${S.sidebar} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className={S.sidebarHeader}>
          <div className={S.logoWrapper}>
            <div className={S.logoContainer}>
              <img src="/puppynote-icon.png" alt="Logo" className={S.logoImage} />
              <span className={S.logoText}>PUPPYMAP</span>
            </div>
            <div className="flex items-center space-x-1">
              {user?.role === 'ADMIN' && (
                <button onClick={handleAdminButtonClick} className={`${S.iconButton} text-red-500 bg-red-50 hover:bg-red-100 border-none mr-1`}>
                  <ShieldCheck size={20} />
                </button>
              )}
              {isLoggedIn ? (
                <button onClick={logout} className={S.authButton}><LogOut size={16} className="mr-1.5" /><span>로그아웃</span></button>
              ) : (
                <button onClick={() => setIsLoginModalOpen(true)} className={S.authButton}><User size={16} className="mr-1.5" /><span>로그인</span></button>
              )}
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-100 rounded-full ml-1"><X size={24} className="text-gray-400" /></button>
            </div>
          </div>
          
          <form onSubmit={handleSearch} className="relative group mb-4">
            <input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="산책하기 좋은 곳을 찾아보세요" className={S.searchInput} />
            <Search className={S.searchIcon} size={20} />
          </form>

          <div ref={scrollRef} onWheel={handleWheel} onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd} className="flex space-x-2 overflow-x-auto no-scrollbar pb-1 cursor-grab active:cursor-grabbing select-none">
            <button onClick={() => setSelectedCategory('ALL')} className={`${S.filterBadge} ${selectedCategory === 'ALL' ? S.filterBadgeActive : S.filterBadgeInactive}`}>전체</button>
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`${S.filterBadge} ${selectedCategory === cat ? S.filterBadgeActive : S.filterBadgeInactive}`}>{CATEGORY_LABELS[cat]}</button>
            ))}
          </div>
        </div>

        <div className={S.contentArea}>
          {selectedPlace ? (
            <div className="animate-in slide-in-from-left duration-300 h-full">
              <button onClick={() => setSelectedPlace(null)} className={S.backButton}>← 리스트로 돌아가기</button>
              <div className={S.detailCard}>
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-[10px] font-bold px-2 py-1 bg-orange-100 text-[#FFB800] rounded-lg">{CATEGORY_LABELS[selectedPlace.category]}</span>
                </div>
                <img src={selectedPlace.imageUrls?.[0] || 'https://via.placeholder.com/300?text=PuppyMap'} className={S.detailImage} alt={selectedPlace.title} />
                <h2 className={S.detailTitle}>{selectedPlace.title}</h2>
                <div className={S.detailAddr}><MapPin size={14} className="mr-1" /><span className="truncate">{selectedPlace.content}</span></div>
                <div className="grid grid-cols-3 gap-2 mb-6">
                  <Tag active={selectedPlace.largeDogAvailable} label="대형견" color="orange" />
                  <Tag active={selectedPlace.parkingAvailable} label="주차" color="blue" />
                  <Tag active={selectedPlace.offLeashAvailable} label="오프리쉬" color="green" />
                </div>
                <button onClick={() => !isLoggedIn ? setIsLoginModalOpen(true) : toggleLike(selectedPlace.id)} className={S.primaryButton}>
                  <Heart size={20} fill={selectedPlace.likeCount > 0 ? "white" : "transparent"} />
                  <span>좋아요 {selectedPlace.likeCount}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="pb-10">
              <div className={S.sectionTitleRow}>
                <h2 className={S.sectionTitle}><Star size={18} className="text-[#FFB800] fill-[#FFB800] mr-2" />인기 산책 장소 Top 20</h2>
                {isLoading && <div className={S.loadingSpinner} />}
              </div>
              <div className="space-y-4">
                {filteredPlaces.length > 0 ? filteredPlaces.map((place, index) => (
                  <div key={place.id} onClick={() => { setSelectedPlace(place); setIsSidebarOpen(true); }} className={S.placeCard}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1.5">
                          <span className={S.rankBadge}>NO.{index + 1}</span>
                          <span className={S.categoryText}>{CATEGORY_LABELS[place.category]}</span>
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
                  <div className={S.emptyState}>해당 카테고리의 장소가 없습니다.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className={S.mapMain}>
        <Map center={currentPosition} style={{ width: '100%', height: '100%' }} level={3} onCreate={setMap} onIdle={handleMapIdle} onClick={handleMapClick}>
          <MapMarker position={currentPosition} image={{ src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png", size: { width: 24, height: 35 } }} title="내 위치" />
          {isSelectingLocation && tempReportPosition && (
            <MapMarker position={tempReportPosition} image={{ src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png", size: { width: 31, height: 35 } }} />
          )}
          {places.map((place) => (
            <MapMarker key={place.id} position={{ lat: place.latitude, lng: place.longitude }} onClick={() => { if(!isSelectingLocation) { setSelectedPlace(place); setIsSidebarOpen(true); } }} />
          ))}
        </Map>
        
        <div className={S.floatingControls}>
          <button onClick={handleMoveToCurrentLocation} className={S.navButton}><Navigation size={24} className="fill-[#FFB800] text-[#FFB800]" /></button>
          <button onClick={() => !isLoggedIn ? setIsLoginModalOpen(true) : setIsSelectingLocation(true)} className={S.reportButton}>
            <Plus size={24} strokeWidth={3} />
            <span className={S.reportBtnText}>장소 제보</span>
          </button>
        </div>
      </main>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <ReportPlaceModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        position={tempReportPosition || currentPosition} 
        onSuccess={() => map && handleMapIdle(map)} 
      />
      <AdminModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} />
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

const S = {
  container: "flex h-screen w-full overflow-hidden bg-white font-sans text-gray-900 relative",
  sidebar: "fixed lg:static inset-0 w-full lg:w-[380px] h-full flex flex-col border-r border-gray-100 z-[150] shadow-2xl bg-white transition-transform duration-300 ease-in-out",
  sidebarHeader: "p-6 pb-4",
  logoWrapper: "flex items-center justify-between mb-6",
  logoContainer: "flex items-center space-x-2",
  logoImage: "h-10 w-10 object-contain rounded-xl shadow-sm",
  logoText: "font-black text-2xl tracking-tighter text-[#FFB800]",
  iconButton: "p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors text-gray-600",
  searchInput: "w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#FFB800] focus:border-transparent transition-all outline-none shadow-sm",
  searchIcon: "absolute left-4 top-4 text-gray-400 group-focus-within:text-[#FFB800] transition-colors",
  contentArea: "flex-1 overflow-y-auto px-6 py-2 bg-gray-50/50",
  backButton: "text-sm font-medium text-gray-500 mb-4 flex items-center hover:text-gray-800",
  detailCard: "bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 mb-20 lg:mb-0",
  detailImage: "w-full h-48 lg:h-64 object-cover rounded-2xl mb-4",
  detailTitle: "text-2xl font-bold mb-2",
  detailAddr: "flex items-center text-sm text-gray-500 mb-4",
  primaryButton: "w-full py-4 bg-[#FFB800] text-white rounded-2xl font-bold hover:shadow-lg transition-all flex items-center justify-center space-x-2",
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
  mapMain: "flex-1 relative bg-gray-100 z-10",
  floatingControls: "absolute bottom-10 right-6 lg:right-10 z-20 flex flex-col space-y-4 items-end",
  navButton: "bg-white p-4 rounded-2xl shadow-xl hover:bg-gray-50 transition-all transform hover:scale-110 border border-gray-100",
  reportButton: "bg-[#FFB800] text-white px-6 lg:px-8 py-4 rounded-3xl shadow-xl hover:shadow-[#FFB800]/20 transition-all transform hover:scale-105 font-bold flex items-center space-x-2",
  reportBtnText: "text-base lg:text-lg",
  filterBadge: "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border-2",
  filterBadgeActive: "bg-[#FFB800] border-[#FFB800] text-white shadow-md",
  filterBadgeInactive: "bg-white border-gray-50 text-gray-400 hover:border-gray-200",
  mobileSearchContainer: "absolute top-4 left-0 right-0 z-40 px-4 flex flex-col space-y-2",
  mobileSearchBar: "w-full bg-white rounded-2xl shadow-2xl p-2 flex items-center space-x-2 border border-gray-100",
  mobileMenuBtn: "p-2 hover:bg-gray-50 rounded-xl transition-colors",
  mobileInput: "w-full py-2 px-1 text-sm outline-none bg-transparent",
  mobileUserBtn: "p-2 hover:bg-gray-50 rounded-xl transition-colors",
  authButton: "flex items-center px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all text-xs font-bold text-gray-600 border border-gray-100 shadow-sm",
}

export default MapPage
