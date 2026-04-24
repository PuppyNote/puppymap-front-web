import { Map, MapMarker } from 'react-kakao-maps-sdk'
import { Search, Heart, User, Navigation, Plus, Star, MapPin, Menu, X, LogOut, ShieldCheck, ArrowLeft, Trash2, ThumbsUp } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { usePlaceStore } from '../store/usePlaceStore'
import { useAuthStore } from '../store/useAuthStore'
import type { Category } from '../types'
import { CATEGORY_LABELS } from '../types'
import { LoginModal } from '../components/common/LoginModal'
import { ReportPlaceModal } from '../components/common/ReportPlaceModal'
import { AdminModal } from '../components/common/AdminModal'
import { PlaceDetailCard } from '../components/common/PlaceDetailCard'
import { PlaceListItemCard } from '../components/common/PlaceListItemCard'
import { placeApi } from '../services/endpoints/PlaceApi'

const MapPage = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL')
  const [isFavoriteMode, setIsFavoriteMode] = useState(false)
  const [map, setMap] = useState<kakao.maps.Map>()
  // 로컬 스토리지에서 마지막 위치 불러오기 (없으면 서울시청)
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number }>(() => {
    const saved = localStorage.getItem('last-position')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        return { lat: 37.5665, lng: 126.978 }
      }
    }
    return { lat: 37.5665, lng: 126.978 }
  })
  
  const updateCurrentLocation = (isAuto = false) => {
    if (navigator.geolocation) {
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const newPos = { lat: latitude, lng: longitude }
          setCurrentPosition(newPos)
          localStorage.setItem('last-position', JSON.stringify(newPos)) // 위치 저장
          if (map) map.setCenter(new kakao.maps.LatLng(latitude, longitude))
        },
        (error) => {
          console.error('Geolocation error:', error)
          if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const { latitude, longitude } = pos.coords
                const newPos = { lat: latitude, lng: longitude }
                setCurrentPosition(newPos)
                localStorage.setItem('last-position', JSON.stringify(newPos)) // 위치 저장
                if (map) map.setCenter(new kakao.maps.LatLng(latitude, longitude))
              },
              (err) => {
                if (!isAuto) alert('위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.')
              },
              { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
            )
          } else if (!isAuto) {
            alert('위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.')
          }
        },
        options
      )
    } else if (!isAuto) {
      alert('이 브라우저에서는 위치 정보를 지원하지 않습니다.')
    }
  }

  useEffect(() => {
    updateCurrentLocation(true)
  }, [])

  useEffect(() => {
    if (map) {
      map.setCenter(new kakao.maps.LatLng(currentPosition.lat, currentPosition.lng))
    }
  }, [map])

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const [isSelectingLocation, setIsSelectingLocation] = useState(false)
  const [tempReportPosition, setTempReportPosition] = useState<{ lat: number; lng: number } | null>(null)

  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchOffset, setTouchOffset] = useState(0)

  const [lastSearchInfo, setLastSearchInfo] = useState<{
    lat: number;
    lng: number;
    keyword: string;
    category: Category | 'ALL';
    level: number;
  } | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const { topPlaces, places, favorites, selectedPlace, isLoading, fetchPlaces, fetchTopPlaces, fetchFavorites, setSelectedPlace, toggleLike, toggleFavorite, deletePlace } = usePlaceStore()
  const { isLoggedIn, logout, user } = useAuthStore()
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const handleDeletePlace = async (placeId: number) => {
    if (!window.confirm('정말 이 장소를 삭제하시겠습니까?')) return
    try {
      await deletePlace(placeId)
      alert('장소가 삭제되었습니다.')
      if (window.innerWidth < 1024) handleCloseDetail()
      else setSelectedPlace(null)
    } catch (err) {
      alert('삭제에 실패했습니다.')
    }
  }

  const panToPlace = (lat: number, lng: number) => {
    if (!map) return
    const latlng = new kakao.maps.LatLng(lat, lng)
    map.setCenter(latlng)
    map.setLevel(2)
    if (window.innerWidth < 1024) {
      setTimeout(() => { map.panBy(0, 180) }, 100)
    }
  }

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLng = (lng2 - lng1) * (Math.PI / 180)
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const getDynamicRadius = (level: number) => {
    if (level <= 3) return 0.5
    if (level === 4) return 1.0
    if (level === 5) return 2.0
    if (level === 6) return 4.0
    return 10.0
  }

  const performSearch = (mapObj: kakao.maps.Map, keyword: string, category: Category | 'ALL', force: boolean = false) => {
    if (isFavoriteMode) return
    const center = mapObj.getCenter()
    const lat = center.getLat()
    const lng = center.getLng()
    const level = mapObj.getLevel()
    const radius = getDynamicRadius(level)
    if (!force && lastSearchInfo) {
      const distance = getDistance(lat, lng, lastSearchInfo.lat, lastSearchInfo.lng)
      if (distance < 0.2 && keyword === lastSearchInfo.keyword && category === lastSearchInfo.category && level === lastSearchInfo.level) return
    }
    fetchPlaces(keyword, lat, lng, radius, category)
    fetchTopPlaces(lat, lng, 5.0, category) 
    setLastSearchInfo({ lat, lng, keyword, category, level })
  }

  useEffect(() => { if (isLoggedIn) fetchFavorites() }, [isLoggedIn])

  const lastWidth = useRef(window.innerWidth)

  useEffect(() => {
    const handleResize = () => {
      const currentWidth = window.innerWidth
      if (currentWidth === lastWidth.current) return // 너비가 변하지 않았다면(키보드 등 높이만 변한 경우) 무시
      
      if (currentWidth >= 1024) {
        setIsSidebarOpen(true)
      } else if (!selectedPlace) {
        setIsSidebarOpen(false)
      }
      lastWidth.current = currentWidth
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [selectedPlace])

  const handleMapCreate = (mapObj: kakao.maps.Map) => {
    setMap(mapObj)
    performSearch(mapObj, searchKeyword, selectedCategory, true)
  }

  useEffect(() => {
    if (map) {
      if (isFavoriteMode) {
        if (isLoggedIn) fetchFavorites()
        else {
          setIsLoginModalOpen(true)
          setIsFavoriteMode(false)
        }
      } else {
        performSearch(map, searchKeyword, selectedCategory, true)
      }
    }
  }, [selectedCategory, isFavoriteMode, isLoggedIn])

  const handleMapIdle = (mapObj: kakao.maps.Map) => {
    if (timer) clearTimeout(timer)
    const newTimer = setTimeout(() => { performSearch(mapObj, searchKeyword, selectedCategory) }, 1000)
    setTimer(newTimer)
  }

  const handleMapClick = (_map: kakao.maps.Map, mouseEvent: kakao.maps.event.MouseEvent) => {
    if (isSelectingLocation) {
      setTempReportPosition({
        lat: mouseEvent.latLng.getLat(),
        lng: mouseEvent.latLng.getLng()
      })
      return
    }
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false)
      setSelectedPlace(null)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (map) performSearch(map, searchKeyword, selectedCategory, true)
    if (window.innerWidth < 1024) setIsSidebarOpen(true)
  }

  const handleMoveToCurrentLocation = () => {
    updateCurrentLocation()
  }

  const handleAdminButtonClick = () => {
    if (user?.role !== 'ADMIN') return alert('관리자 권한이 없습니다.')
    setIsAdminModalOpen(true)
  }

  const handleCloseDetail = () => {
    setIsSidebarOpen(false)
    setTouchOffset(0)
    setTimeout(() => { setSelectedPlace(null) }, 300)
  }

  const handleDragStart = (y: number) => {
    if (window.innerWidth >= 1024 || !selectedPlace) return
    setTouchStart(y)
  }

  const handleDragMove = (y: number) => {
    if (window.innerWidth >= 1024 || touchStart === null || !selectedPlace) return
    const offset = y - touchStart
    if (offset > 0) setTouchOffset(offset)
  }

  const handleDragEnd = () => {
    if (window.innerWidth >= 1024 || touchStart === null || !selectedPlace) return
    if (touchOffset > 120) handleCloseDetail()
    else setTouchOffset(0)
    setTouchStart(null)
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

  const filteredPlaces = isFavoriteMode ? favorites : topPlaces

  return (
    <div className={S.container}>
      {!isSelectingLocation && (
        <div className={`${S.mobileSearchContainer} lg:hidden`}>
          <div className={S.mobileSearchBar}>
            <button onClick={() => { setSelectedPlace(null); setIsSidebarOpen(true); }} className={S.mobileMenuBtn}><Menu size={20} className="text-[#FFB800]" /></button>
            <form onSubmit={handleSearch} className="flex-1"><input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="장소 검색" className={S.mobileInput} /></form>
          </div>
          {!selectedPlace && (
            <div ref={scrollRef} onWheel={handleWheel} onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd} className="flex space-x-2 overflow-x-auto no-scrollbar py-2 select-none">
              {['ALL', ...Object.keys(CATEGORY_LABELS)].map((cat) => (
                <button key={cat} onClick={() => { setSelectedCategory(cat as any); setIsFavoriteMode(false); }} className={`${S.filterBadge} ${!isFavoriteMode && selectedCategory === cat ? S.filterBadgeActive : S.filterBadgeInactive} text-[10px] px-3 py-1.5`}>{cat === 'ALL' ? '전체' : CATEGORY_LABELS[cat as Category]}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {isSelectingLocation && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center space-y-3 w-[90%] max-w-md">
          <div className="bg-black/80 text-white px-6 py-3 rounded-full shadow-2xl backdrop-blur-md animate-bounce text-sm text-center font-bold">제보할 장소를 지도에서 클릭해주세요!</div>
          <div className="flex space-x-2">
            <button onClick={() => setIsSelectingLocation(false)} className="bg-white text-gray-500 px-5 py-2.5 rounded-2xl font-bold shadow-xl">취소</button>
            {tempReportPosition && <button onClick={() => { setIsReportModalOpen(true); setIsSelectingLocation(false); }} className="bg-[#FFB800] text-white px-5 py-2.5 rounded-2xl font-bold shadow-xl">이 위치로 제보하기</button>}
          </div>
        </div>
      )}

      <aside 
        onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
        onTouchEnd={handleDragEnd}
        onMouseDown={(e) => handleDragStart(e.clientY)}
        onMouseMove={(e) => touchStart !== null && handleDragMove(e.clientY)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        style={window.innerWidth < 1024 && selectedPlace ? { transform: `translateY(${touchOffset}px)`, transition: touchStart === null ? 'transform 0.3s ease-out' : 'none' } : {}}
        className={`
        ${S.sidebar} 
        ${selectedPlace ? 'h-fit max-h-[90dvh] lg:h-full rounded-t-[32px] lg:rounded-none bottom-0 left-0 right-0 top-auto' : 'h-full top-0 left-0 right-0'}
        ${isSidebarOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:-translate-x-full'}
      `}>
        {selectedPlace && <div className="w-full flex justify-center py-3 lg:hidden shrink-0"><div className="w-12 h-1.5 bg-gray-200 rounded-full" /></div>}
        {(!selectedPlace || window.innerWidth >= 1024) && (
          <div className={S.sidebarHeader}>
            <div className={S.logoWrapper}>
              <div className={S.logoContainer}>
                <img src="/puppynote-icon.png" alt="Logo" className={S.logoImage} />
                <span className={S.logoText}>PUPPYMAP</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-100 rounded-full ml-1"><X size={24} className="text-gray-400" /></button>
            </div>
            
            <form onSubmit={handleSearch} className="relative group mb-4">
              <input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="산책하기 좋은 곳을 찾아보세요" className={S.searchInput} />
              <Search className={S.searchIcon} size={20} />
            </form>

            <div ref={scrollRef} onWheel={handleWheel} onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd} className="flex space-x-2 overflow-x-auto no-scrollbar pb-1 cursor-grab active:cursor-grabbing select-none">
              <button onClick={() => { if (!isLoggedIn) setIsLoginModalOpen(true); else setIsFavoriteMode(!isFavoriteMode); }} className={`${S.filterBadge} ${isFavoriteMode ? 'bg-red-50 border-red-200 text-red-500 shadow-sm' : S.filterBadgeInactive} flex items-center space-x-1`}><Heart size={14} fill={isFavoriteMode ? "white" : "transparent"} /><span>즐겨찾기</span></button>
              <button onClick={() => { setSelectedCategory('ALL'); setIsFavoriteMode(false); }} className={`${S.filterBadge} ${!isFavoriteMode && selectedCategory === 'ALL' ? S.filterBadgeActive : S.filterBadgeInactive}`}>전체</button>
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
                <button key={cat} onClick={() => { setSelectedCategory(cat); setIsFavoriteMode(false); }} className={`${S.filterBadge} ${!isFavoriteMode && selectedCategory === cat ? S.filterBadgeActive : S.filterBadgeInactive}`}>{CATEGORY_LABELS[cat]}</button>
              ))}
            </div>
          </div>
        )}

        <div className={`${S.contentArea} ${selectedPlace ? 'flex-none' : 'flex-1'}`}>
          {selectedPlace ? (
            <div className="animate-in slide-in-from-bottom lg:slide-in-from-left duration-300 pt-2 lg:pt-0 lg:pb-20 px-6">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setSelectedPlace(null)} className={`${S.backButton} hidden lg:flex`}><ArrowLeft size={16} className="mr-1" /> {isFavoriteMode ? '즐겨찾기' : '목록으로'}</button>
                <div className="flex-1 lg:hidden" />
                <div className="flex items-center space-x-2">
                  {user?.role === 'ADMIN' && <button onClick={() => handleDeletePlace(selectedPlace.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={22} /></button>}
                  <button onClick={handleCloseDetail} className="p-2 hover:bg-gray-100 rounded-full hidden lg:block"><X size={24} className="text-gray-400" /></button>
                </div>
              </div>
              <PlaceDetailCard place={selectedPlace} isLoggedIn={isLoggedIn} isFavorite={favorites.some(f => f.id === selectedPlace.id)} onLoginRequired={() => setIsLoginModalOpen(true)} onToggleLike={async (id) => { try { await toggleLike(id) } catch (err) { alert('좋아요 처리에 실패했습니다.') } }} onToggleFavorite={(id) => toggleFavorite(id)} />
            </div>
          ) : (
            <div className="pb-10 px-6">
              <div className={S.sectionTitleRow}>
                <div className="flex flex-col">
                  <h2 className={S.sectionTitle}>{isFavoriteMode ? <><Heart size={18} className="text-red-400 fill-red-400 mr-2" />나의 즐겨찾기</> : <><Star size={18} className="text-[#FFB800] fill-[#FFB800] mr-2" />인기 산책 장소 Top 20</>}</h2>
                  <span className="text-[10px] text-gray-400 ml-7 mt-0.5">{isFavoriteMode ? '저장한 장소 목록입니다.' : '(현재 지도 중심 기준입니다.)'}</span>
                </div>
                {isLoading && <div className={S.loadingSpinner} />}
              </div>
              <div className="space-y-4">
                {filteredPlaces.length > 0 ? filteredPlaces.map((place, index) => (
                  <PlaceListItemCard key={place.id} place={place} index={index} onClick={(p) => { setSelectedPlace(p); setIsSidebarOpen(true); panToPlace(p.latitude, p.longitude); }} />
                )) : <div className={S.emptyState}>해당 카테고리의 장소가 없습니다.</div>}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer: Auth Buttons Only */}
        {!selectedPlace && (
          <div className="p-4 border-t border-gray-100 bg-white shrink-0">
            {isLoggedIn ? (
              <div className="flex items-center space-x-2">
                {user?.role === 'ADMIN' && (
                  <button onClick={handleAdminButtonClick} className="flex-1 py-3.5 bg-red-50 text-red-500 rounded-xl font-bold flex items-center justify-center space-x-1.5 text-xs">
                    <ShieldCheck size={16} />
                    <span>관리자</span>
                  </button>
                )}
                <button onClick={logout} className="flex-[2] py-3.5 bg-gray-50 text-gray-500 rounded-xl font-bold flex items-center justify-center space-x-1.5 text-xs hover:bg-gray-100 transition-colors">
                  <LogOut size={16} />
                  <span>로그아웃</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsLoginModalOpen(true)} 
                className="w-full py-3.5 bg-gray-50 text-gray-700 rounded-xl font-bold flex items-center justify-center space-x-2 text-xs hover:bg-gray-100 transition-colors"
              >
                <User size={16} />
                <span>로그인 / 회원가입</span>
              </button>
            )}
          </div>
        )}
      </aside>

      <main className={S.mapMain}>
        <Map 
          center={currentPosition} 
          style={{ width: '100%', height: '100%' }} 
          level={3} 
          onCreate={setMap} 
          onIdle={handleMapIdle} 
          onClick={handleMapClick} 
          draggable={!isSelectingLocation}
          zoomable={!isSelectingLocation}
          onDragStart={() => { if (window.innerWidth < 1024 && selectedPlace) handleCloseDetail() }} 
          onZoomStart={() => { if (window.innerWidth < 1024 && selectedPlace) handleCloseDetail() }}
        >
          <MapMarker position={currentPosition} image={{ src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png", size: { width: 24, height: 35 } }} title="내 위치" />
          {isSelectingLocation && tempReportPosition && <MapMarker position={tempReportPosition} image={{ src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png", size: { width: 31, height: 35 } }} />}
          {places.map((place) => (
            <MapMarker key={place.id} position={{ lat: place.latitude, lng: place.longitude }} image={{ src: "/puppynote-icon.png", size: { width: 24, height: 24 }, options: { offset: { x: 12, y: 24 } } }} onClick={() => { if(!isSelectingLocation) { setSelectedPlace(place); setIsSidebarOpen(true); panToPlace(place.latitude, place.longitude); } }} />
          ))}
        </Map>
        
        <div className={S.floatingControls}>
          <button onClick={handleMoveToCurrentLocation} className={S.navButton}><Navigation size={24} className="fill-[#FFB800] text-[#FFB800]" /></button>
          <button onClick={() => {
            if (!isLoggedIn) return setIsLoginModalOpen(true)
            setIsSelectingLocation(true)
            setTempReportPosition(null)
          }} className={S.reportButton}>
            <Plus size={24} strokeWidth={3} />
            <span className={S.reportBtnText}>장소 제보</span>
          </button>
        </div>
      </main>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <ReportPlaceModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} position={tempReportPosition || currentPosition} onSuccess={() => map && handleMapIdle(map)} />
      <AdminModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} />
    </div>
  )
}

const S = {
  container: "flex h-[100dvh] w-full overflow-hidden bg-white font-sans text-gray-900 relative",
  sidebar: "fixed lg:static w-full lg:w-[380px] flex flex-col border-r border-gray-100 z-[150] shadow-2xl bg-white transition-all duration-300 ease-in-out",
  sidebarHeader: "p-6 pb-4",
  logoWrapper: "flex items-center justify-between mb-6",
  logoContainer: "flex items-center space-x-2",
  logoImage: "h-10 w-10 object-contain rounded-xl shadow-sm",
  logoText: "font-black text-2xl tracking-tighter text-[#FFB800]",
  iconButton: "p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors text-gray-600",
  searchInput: "w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#FFB800] focus:border-transparent transition-all outline-none shadow-sm",
  searchIcon: "absolute left-4 top-4 text-gray-400 group-focus-within:text-[#FFB800] transition-colors",
  contentArea: "flex-1 overflow-y-auto py-2 bg-gray-50/50 min-h-0 no-scrollbar",
  backButton: "text-sm font-medium text-gray-500 mb-4 flex items-center hover:text-gray-800",
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
