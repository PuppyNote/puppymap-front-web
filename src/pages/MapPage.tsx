import { Map, MapMarker } from 'react-kakao-maps-sdk'
import { Search, Heart, User, Navigation, Plus, Star, MapPin, Menu, X, LogOut, ShieldCheck, ArrowLeft, Trash2 } from 'lucide-react'
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

const MapPage = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL')
  const [isFavoriteMode, setIsFavoriteMode] = useState(false)
  const [map, setMap] = useState<kakao.maps.Map>()
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number }>({ lat: 37.5665, lng: 126.978 })
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const [isSelectingLocation, setIsSelectingLocation] = useState(false)
  const [tempReportPosition, setTempReportPosition] = useState<{ lat: number; lng: number } | null>(null)
// 중복 검색 방지용
const [lastSearchInfo, setLastSearchInfo] = useState<{
  lat: number;
  lng: number;
  keyword: string;
  category: Category | 'ALL';
  isFavoriteMode: boolean;
  level: number;
} | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const { topPlaces, places, favorites, selectedPlace, isLoading, fetchPlaces, fetchTopPlaces, fetchFavorites, setSelectedPlace, toggleLike, deletePlace } = usePlaceStore()
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

  // 지도를 마커 위치로 이동시키되, 모바일에서는 하단 시트 높이만큼 보정
  const panToPlace = (lat: number, lng: number) => {
    if (!map) return
    const latlng = new kakao.maps.LatLng(lat, lng)
    map.setCenter(latlng)
    map.setLevel(2) // 30m 수준으로 줌 확대
    
    if (window.innerWidth < 1024) {
      // 지도를 아래로 150px 밀면 마커가 상대적으로 위로 올라가 시트에 안 가려짐
      // 애니메이션 효과를 위해 약간의 지연 후 실행
      setTimeout(() => {
        map.panBy(0, 180)
      }, 100)
    }
  }

  // 두 좌표 사이의 거리 계산 (KM)
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371 // 지구 반지름
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLng = (lng2 - lng1) * (Math.PI / 180)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // 줌 레벨에 따른 유동적 반지름 계산 (KM)
  const getDynamicRadius = (level: number) => {
    if (level <= 3) return 0.5
    if (level === 4) return 1.0
    if (level === 5) return 2.0
    if (level === 6) return 4.0
    if (level >= 7) return 10.0
    return 5.0
  }

  const performSearch = (mapObj: kakao.maps.Map, keyword: string, category: Category | 'ALL', force: boolean = false) => {
    // 즐겨찾기 모드일 때는 검색 안함
    if (isFavoriteMode) return

    const center = mapObj.getCenter()
    const lat = center.getLat()
    const lng = center.getLng()
    const level = mapObj.getLevel()
    const radius = getDynamicRadius(level)

    // 강제 호출이 아니고, 이전 검색과 큰 차이가 없으면 중단
    if (!force && lastSearchInfo) {
      const distance = getDistance(lat, lng, lastSearchInfo.lat, lastSearchInfo.lng)
      const isSameKeyword = keyword === lastSearchInfo.keyword
      const isSameCategory = category === lastSearchInfo.category
      const isSameLevel = level === lastSearchInfo.level

      // 위치가 200m 이내로 변했고 키워드, 카테고리, 줌 레벨이 모두 같으면 검색 안함
      if (distance < 0.2 && isSameKeyword && isSameCategory && isSameLevel) {
        return
      }
    }

    fetchPlaces(keyword, lat, lng, radius, category)
    fetchTopPlaces(lat, lng, 5.0, category) // 인기 장소는 사용자 요청대로 5km 반경 고정
    setLastSearchInfo({ lat, lng, keyword, category, level })
  }

  useEffect(() => {
    if (isLoggedIn) fetchFavorites()
  }, [isLoggedIn])

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
    const defaultPos = { lat: 37.5665, lng: 126.978 }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = { lat: position.coords.latitude, lng: position.coords.longitude }
          setCurrentPosition(newPos)
          // 초기 위치 로드 시에는 performSearch 대신 직접 호출하거나 map 생성 기다림
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      )
    }
  }, [])

  // 맵 객체 생성 후 초기 데이터 로드
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
    const newTimer = setTimeout(() => {
      performSearch(mapObj, searchKeyword, selectedCategory)
    }, 1000)
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
    if (map) performSearch(map, searchKeyword, selectedCategory, true)
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

  const handleCloseDetail = () => {
    setIsSidebarOpen(false);
    setTimeout(() => {
      setSelectedPlace(null);
    }, 300);
  };

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
            <div className="flex items-center space-x-1">
              {user?.role === 'ADMIN' && (
                <button onClick={handleAdminButtonClick} className="p-2 text-red-500"><ShieldCheck size={20} /></button>
              )}
              <button onClick={() => !isLoggedIn ? setIsLoginModalOpen(true) : null} className={S.mobileUserBtn}><User size={20} className={isLoggedIn ? "text-[#FFB800]" : "text-gray-400"} /></button>
            </div>
          </div>
          {!selectedPlace && (
            <div ref={scrollRef} onWheel={handleWheel} onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd} className="flex space-x-2 overflow-x-auto no-scrollbar py-2 select-none">
              <button 
                onClick={() => {
                  if (!isLoggedIn) {
                    setIsLoginModalOpen(true);
                  } else {
                    setIsFavoriteMode(!isFavoriteMode);
                  }
                }} 
                className={`${S.filterBadge} ${isFavoriteMode ? 'bg-red-50 border-red-200 text-red-500 shadow-sm' : S.filterBadgeInactive} text-[10px] px-3 py-1.5 flex items-center space-x-1.5`}
              >
                <Heart size={14} fill={isFavoriteMode ? "currentColor" : "transparent"} className={isFavoriteMode ? "text-red-500" : "text-gray-400"} />
                <span className="font-black">즐겨찾기</span>
              </button>
              {['ALL', ...Object.keys(CATEGORY_LABELS)].map((cat) => (
                <button 
                  key={cat} 
                  onClick={() => {
                    setSelectedCategory(cat as any);
                    setIsFavoriteMode(false);
                  }} 
                  className={`${S.filterBadge} ${!isFavoriteMode && selectedCategory === cat ? S.filterBadgeActive : S.filterBadgeInactive} text-[10px] px-3 py-1.5`}
                >
                  {cat === 'ALL' ? '전체' : CATEGORY_LABELS[cat as Category]}
                </button>
              ))}
            </div>
          )}
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

      <aside className={`
        ${S.sidebar} 
        ${selectedPlace 
          ? 'h-[60vh] lg:h-full rounded-t-[32px] lg:rounded-none bottom-0 left-0 right-0 top-auto' 
          : 'h-full top-0 left-0 right-0'}
        ${isSidebarOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:-translate-x-full'}
      `}>
        {(!selectedPlace || window.innerWidth >= 1024) && (
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
              <button 
                onClick={() => setIsFavoriteMode(!isFavoriteMode)} 
                className={`${S.filterBadge} ${isFavoriteMode ? S.filterBadgeActive : S.filterBadgeInactive} flex items-center space-x-1`}
              >
                <Heart size={14} fill={isFavoriteMode ? "white" : "transparent"} />
                <span>즐겨찾기</span>
              </button>
              <button 
                onClick={() => {
                  setSelectedCategory('ALL');
                  setIsFavoriteMode(false);
                }} 
                className={`${S.filterBadge} ${!isFavoriteMode && selectedCategory === 'ALL' ? S.filterBadgeActive : S.filterBadgeInactive}`}
              >
                전체
              </button>
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
                <button 
                  key={cat} 
                  onClick={() => {
                    setSelectedCategory(cat);
                    setIsFavoriteMode(false);
                  }} 
                  className={`${S.filterBadge} ${!isFavoriteMode && selectedCategory === cat ? S.filterBadgeActive : S.filterBadgeInactive}`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={S.contentArea}>
          {selectedPlace ? (
            <div className="animate-in slide-in-from-bottom lg:slide-in-from-left duration-300 min-h-full pt-4 lg:pt-0 pb-20">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setSelectedPlace(null)} className={S.backButton}>
                  <ArrowLeft size={16} className="mr-1" /> {selectedCategory === 'FAVORITE' ? '즐겨찾기' : '목록으로'} 
                </button>
                <div className="flex items-center space-x-2">
                  {user?.role === 'ADMIN' && (
                    <button 
                      onClick={() => selectedPlace && handleDeletePlace(selectedPlace.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      title="장소 삭제"
                    >
                      <Trash2 size={22} />
                    </button>
                  )}
                  <button 
                    onClick={handleCloseDetail} 
                    className="p-2 hover:bg-gray-100 rounded-full lg:hidden"
                  >
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>
              </div>
              <PlaceDetailCard 
                place={selectedPlace}
                isLoggedIn={isLoggedIn}
                isFavorite={favorites.some(f => f.id === selectedPlace.id)}
                onLoginRequired={() => setIsLoginModalOpen(true)}
                onToggleLike={async (id) => {
                  try {
                    await toggleLike(id)
                  } catch (err) {
                    alert('좋아요 처리에 실패했습니다.')
                  }
                }}
                onToggleFavorite={(id) => toggleFavorite(id)}
              />
            </div>
          ) : (
            <div className="pb-10">
              <div className={S.sectionTitleRow}>
                <div className="flex flex-col">
                  <h2 className={S.sectionTitle}>
                    {isFavoriteMode ? (
                      <><Heart size={18} className="text-red-400 fill-red-400 mr-2" />나의 즐겨찾기</>
                    ) : (
                      <><Star size={18} className="text-[#FFB800] fill-[#FFB800] mr-2" />인기 산책 장소 Top 20</>
                    )}
                  </h2>
                  <span className="text-[10px] text-gray-400 ml-7 mt-0.5">
                    {isFavoriteMode ? '저장한 장소 목록입니다.' : '(현재 지도 중심 기준입니다.)'}
                  </span>
                </div>
                {isLoading && <div className={S.loadingSpinner} />}
              </div>
              <div className="space-y-4">
                {filteredPlaces.length > 0 ? filteredPlaces.map((place, index) => (
                  <PlaceListItemCard 
                    key={place.id}
                    place={place}
                    index={index}
                    onClick={(p) => {
                      setSelectedPlace(p);
                      setIsSidebarOpen(true);
                      panToPlace(p.latitude, p.longitude);
                    }}
                  />
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
            <MapMarker 
              key={place.id} 
              position={{ lat: place.latitude, lng: place.longitude }} 
              image={{
                src: "/puppynote-icon.png",
                size: { width: 24, height: 24 },
                options: {
                  offset: { x: 12, y: 24 } // 마커의 하단 중앙이 좌표를 가리키도록 설정
                }
              }}
              onClick={() => { 
                if(!isSelectingLocation) { 
                  setSelectedPlace(place); 
                  setIsSidebarOpen(true); 
                  panToPlace(place.latitude, place.longitude);
                } 
              }} 
            />
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
  sidebar: "fixed lg:static w-full lg:w-[380px] h-full flex flex-col border-r border-gray-100 z-[150] shadow-2xl bg-white transition-transform duration-300 ease-in-out",
  sidebarHeader: "p-6 pb-4",
  logoWrapper: "flex items-center justify-between mb-6",
  logoContainer: "flex items-center space-x-2",
  logoImage: "h-10 w-10 object-contain rounded-xl shadow-sm",
  logoText: "font-black text-2xl tracking-tighter text-[#FFB800]",
  iconButton: "p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors text-gray-600",
  searchInput: "w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#FFB800] focus:border-transparent transition-all outline-none shadow-sm",
  searchIcon: "absolute left-4 top-4 text-gray-400 group-focus-within:text-[#FFB800] transition-colors",
  contentArea: "flex-1 overflow-y-auto px-6 py-2 bg-gray-50/50 min-h-0",
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
