import { Map, MapMarker } from 'react-kakao-maps-sdk'
import { Search, Heart, User, Navigation, Plus, Star, MapPin, Menu, X, LogOut, ShieldCheck, ArrowLeft, Trash2, ThumbsUp } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
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
  // 1. 상태 정의
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL')
  const [isFavoriteMode, setIsFavoriteMode] = useState(false)
  const [map, setMap] = useState<kakao.maps.Map>()
  
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

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const [isSelectingLocation, setIsSelectingLocation] = useState(false)
  const [tempReportPosition, setTempReportPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchOffset, setTouchOffset] = useState(0)

  // 2. 스토어 및 Refs
  const { 
    topPlaces, places, favorites, selectedPlace, isLoading, 
    placesPage, topPlacesPage,
    fetchPlaces, fetchMorePlaces, fetchTopPlaces, fetchMoreTopPlaces, 
    fetchFavorites, setSelectedPlace, toggleLike, toggleFavorite, deletePlace 
  } = usePlaceStore()

  const { isLoggedIn, logout, user } = useAuthStore()

  const lastSearchInfo = useRef<{
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
  const observerTarget = useRef<HTMLDivElement>(null)
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  // 3. 유틸리티 함수
  const getDynamicRadius = (level: number) => {
    if (level <= 3) return 0.5
    if (level === 4) return 1.0
    if (level === 5) return 2.0
    if (level === 6) return 4.0
    return 10.0
  }

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLng = (lng2 - lng1) * (Math.PI / 180)
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // 4. 로직 함수
  const updateCurrentLocation = useCallback((isAuto = false) => {
    if (!navigator.geolocation) {
      if (!isAuto) alert('이 브라우저에서는 위치 정보를 지원하지 않습니다.')
      return
    }

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords
      const newPos = { lat: latitude, lng: longitude }
      setCurrentPosition(newPos)
      localStorage.setItem('last-position', JSON.stringify(newPos))
      if (map) map.setCenter(new kakao.maps.LatLng(latitude, longitude))
    }

    const handleError = (error: GeolocationPositionError) => {
      console.error('Geolocation error:', error)
      if (error.code === error.PERMISSION_DENIED) {
        if (!isAuto) {
          alert('위치 권한이 거부되었습니다. 설정 > 개인정보 보호 > 위치 서비스에서 브라우저(Safari/Chrome)의 위치 권한을 "사용하는 동안"으로 허용해주세요.')
        }
      } else if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          () => {
            if (!isAuto) alert('위치 정보를 가져올 수 없습니다. GPS 신호가 약하거나 위치 서비스가 꺼져있을 수 있습니다.')
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        )
      } else if (!isAuto) {
        alert('위치 정보를 가져오는데 실패했습니다.')
      }
    }

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000
    })
  }, [map])

  const performSearch = useCallback((mapObj: kakao.maps.Map, keyword: string, category: Category | 'ALL', force: boolean = false) => {
    const center = mapObj.getCenter()
    const lat = center.getLat()
    const lng = center.getLng()
    const level = mapObj.getLevel()
    const radius = getDynamicRadius(level)
    
    if (!force && lastSearchInfo.current) {
      const distance = getDistance(lat, lng, lastSearchInfo.current.lat, lastSearchInfo.current.lng)
      if (distance < 0.2 && keyword === lastSearchInfo.current.keyword && category === lastSearchInfo.current.category && level === lastSearchInfo.current.level) return
    }

    fetchPlaces(keyword, lat, lng, radius, category)
    if (!keyword || selectedPlace) {
      fetchTopPlaces(lat, lng, 5.0, category) 
    }
    lastSearchInfo.current = { lat, lng, keyword, category, level }
  }, [fetchPlaces, fetchTopPlaces, selectedPlace])

  const handleMapCreate = useCallback((mapObj: kakao.maps.Map) => {
    setMap(mapObj)
  }, [])

  const handleMapIdle = useCallback((mapObj: kakao.maps.Map) => {
    if (timer) clearTimeout(timer)
    const newTimer = setTimeout(() => { performSearch(mapObj, searchKeyword, selectedCategory) }, 1000)
    setTimer(newTimer)
  }, [performSearch, searchKeyword, selectedCategory, timer])

  const handleMapClick = useCallback((_map: kakao.maps.Map, mouseEvent: kakao.maps.event.MouseEvent) => {
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
  }, [isSelectingLocation, setSelectedPlace])

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (map) performSearch(map, searchKeyword, selectedCategory, true)
    if (window.innerWidth < 1024) setIsSidebarOpen(true)
  }

  const clearSearch = () => {
    setSearchKeyword('')
    if (map) performSearch(map, '', selectedCategory, true)
  }

  const handleCloseDetail = () => {
    setIsSidebarOpen(false)
    setTouchOffset(0)
    setTimeout(() => { setSelectedPlace(null) }, 300)
  }

  const handleDeletePlace = async (placeId: number) => {
    if (!window.confirm('정말 이 장소를 삭제하시겠습니까?')) return
    try {
      await deletePlace(placeId)
      alert('장소가 삭제되었습니다.')
      setSelectedPlace(null)
    } catch (err) {}
  }

  const panToPlace = useCallback((lat: number, lng: number) => {
    if (!map) return
    const latlng = new kakao.maps.LatLng(lat, lng)
    map.setCenter(latlng)
    map.setLevel(2)
    if (window.innerWidth < 1024) {
      setTimeout(() => { map.panBy(0, 180) }, 100)
    }
  }, [map])

  // 5. Effects
  useEffect(() => {
    updateCurrentLocation(true)
  }, [])

  useEffect(() => {
    if (map) {
      map.setCenter(new kakao.maps.LatLng(currentPosition.lat, currentPosition.lng))
    }
  }, [map])

  useEffect(() => { if (isLoggedIn) fetchFavorites() }, [isLoggedIn, fetchFavorites])

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
  }, [map, selectedCategory, isFavoriteMode, isLoggedIn, performSearch])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsSidebarOpen(true)
      else if (!selectedPlace) setIsSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [selectedPlace])

  useEffect(() => {
    if (!observerTarget.current || selectedPlace) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          if (isFavoriteMode) return
          if (map) {
            const center = map.getCenter()
            fetchMorePlaces(searchKeyword, center.getLat(), center.getLng(), getDynamicRadius(map.getLevel()), selectedCategory)
            if (!searchKeyword) {
              fetchMoreTopPlaces(center.getLat(), center.getLng(), 5.0, selectedCategory)
            }
          }
        }
      },
      { threshold: 1.0 }
    )

    observer.observe(observerTarget.current)
    return () => observer.disconnect()
  }, [isLoading, isFavoriteMode, searchKeyword, selectedCategory, map, selectedPlace, fetchMorePlaces, fetchMoreTopPlaces])

  // 6. 렌더링 도우미
  const filteredPlaces = isFavoriteMode 
    ? favorites 
    : (searchKeyword ? places : topPlaces)

  const mapMarkers = [...places]
  topPlaces.forEach(tp => {
    if (!mapMarkers.some(m => m.id === tp.id)) mapMarkers.push(tp)
  })

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

  const handleDragStartInternal = (y: number) => {
    if (window.innerWidth >= 1024 || !selectedPlace) return
    setTouchStart(y)
  }
  const handleDragMoveInternal = (y: number) => {
    if (window.innerWidth >= 1024 || touchStart === null || !selectedPlace) return
    const offset = y - touchStart
    if (offset > 0) setTouchOffset(offset)
  }
  const handleDragEndInternal = () => {
    if (window.innerWidth >= 1024 || touchStart === null || !selectedPlace) return
    if (touchOffset > 120) handleCloseDetail()
    else setTouchOffset(0)
    setTouchStart(null)
  }

  return (
    <div className={S.container}>
      {/* 1. 사이드바 / 하단 시트 */}
      <aside 
        onTouchStart={(e) => handleDragStartInternal(e.touches[0].clientY)}
        onTouchMove={(e) => handleDragMoveInternal(e.touches[0].clientY)}
        onTouchEnd={handleDragEndInternal}
        onMouseDown={(e) => handleDragStartInternal(e.clientY)}
        onMouseMove={(e) => touchStart !== null && handleDragMoveInternal(e.clientY)}
        onMouseUp={handleDragEndInternal}
        onMouseLeave={handleDragEndInternal}
        style={window.innerWidth < 1024 && selectedPlace ? { transform: `translateY(${touchOffset}px)`, transition: touchStart === null ? 'transform 0.3s ease-out' : 'none' } : {}}
        className={S.sidebarWrapper(selectedPlace, isSidebarOpen)}
      >
        {selectedPlace && <div className={S.dragHandleWrapper}><div className={S.dragHandle} /></div>}
        
        {/* 사이드바 헤더 (데스크톱 상시, 모바일은 목록 열렸을 때만) */}
        {(window.innerWidth >= 1024 || !selectedPlace) && (
          <div className={S.sidebarHeader}>
            <div className={S.logoWrapper}>
              <div className={S.logoContainer}>
                <img src="/puppynote-icon.png" alt="Logo" className={S.logoImage} />
                <span className={S.logoText}>PUPPYMAP</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className={S.sidebarCloseBtn}><X size={24} className="text-gray-400" /></button>
            </div>
            
            <div className="relative group mb-4">
              <form onSubmit={handleSearch}>
                <input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="산책하기 좋은 곳을 찾아보세요" className={S.searchInput} />
              </form>
              <button onClick={() => handleSearch()} className={S.searchIconBtn}>
                <Search size={20} />
              </button>
              {searchKeyword && (
                <button onClick={clearSearch} className={S.searchClearBtn}>
                  <X size={18} />
                </button>
              )}
            </div>

            <div ref={scrollRef} onWheel={handleWheel} onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd} className={S.filterScrollRow}>
              <button onClick={() => { if (!isLoggedIn) setIsLoginModalOpen(true); else setIsFavoriteMode(!isFavoriteMode); }} className={`${S.filterBadge} ${isFavoriteMode ? 'bg-red-50 border-red-200 text-red-500 shadow-sm' : S.filterBadgeInactive} flex items-center space-x-1`}>
                <Heart size={14} fill={isFavoriteMode ? "white" : "transparent"} />
                <span>즐겨찾기</span>
              </button>
              <button onClick={() => { setSelectedCategory('ALL'); setIsFavoriteMode(false); }} className={`${S.filterBadge} ${!isFavoriteMode && selectedCategory === 'ALL' ? S.filterBadgeActive : S.filterBadgeInactive}`}>전체</button>
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
                <button key={cat} onClick={() => { setSelectedCategory(cat); setIsFavoriteMode(false); }} className={`${S.filterBadge} ${!isFavoriteMode && selectedCategory === cat ? S.filterBadgeActive : S.filterBadgeInactive}`}>{CATEGORY_LABELS[cat]}</button>
              ))}
            </div>
          </div>
        )}

        {/* 메인 리스트 / 상세 Swap */}
        <div className={`${S.contentArea} flex-1 relative ${selectedPlace ? 'bg-white' : 'bg-gray-50/50'}`}>
          {selectedPlace ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 min-h-full px-6 bg-white flex flex-col pt-2">
              <div className={S.detailHeader}>
                <button onClick={() => setSelectedPlace(null)} className={S.backButton}>
                  <ArrowLeft size={16} className="mr-1" /> 
                  {isFavoriteMode ? '즐겨찾기' : '목록으로'}
                </button>
                <div className="flex-1" />
                {user?.role === 'ADMIN' && (
                  <button onClick={() => handleDeletePlace(selectedPlace.id)} className={S.adminDeleteBtn}>
                    <Trash2 size={22} />
                  </button>
                )}
              </div>
              <div className="pb-10">
                <PlaceDetailCard 
                  place={selectedPlace} 
                  isLoggedIn={isLoggedIn} 
                  isFavorite={favorites.some(f => f.id === selectedPlace.id)} 
                  onLoginRequired={() => setIsLoginModalOpen(true)} 
                  onToggleLike={async (id) => { try { await toggleLike(id) } catch (err) {} }} 
                  onToggleFavorite={(id) => toggleFavorite(id)} 
                />
              </div>
            </div>
          ) : (
            <div className="pb-10 px-6 pt-2 animate-in fade-in duration-300">
              <div className={S.sectionTitleRow}>
                <div className="flex flex-col">
                  <h2 className={S.sectionTitle}>
                    {isFavoriteMode 
                      ? <><Heart size={18} className="text-red-400 fill-red-400 mr-2" />나의 즐겨찾기</> 
                      : (searchKeyword 
                          ? <><Search size={18} className="text-[#FFB800] mr-2" />'{searchKeyword}' 검색 결과</>
                          : <><Star size={18} className="text-[#FFB800] fill-[#FFB800] mr-2" />인기 산책 장소 Top 20</>
                        )
                    }
                  </h2>
                  <span className={S.sectionSubtitle}>
                    {isFavoriteMode 
                      ? '저장한 장소 목록입니다.' 
                      : (searchKeyword ? `총 ${placesPage.totalElement}개의 장소를 찾았습니다.` : '(현재 지도 중심 기준입니다.)')
                    }
                  </span>
                </div>
                {isLoading && <div className={S.loadingSpinner} />}
              </div>
              <div className="space-y-4">
                {filteredPlaces.length > 0 ? filteredPlaces.map((place, index) => (
                  <PlaceListItemCard key={place.id} place={place} index={searchKeyword ? undefined : index} onClick={(p) => { setSelectedPlace(p); setIsSidebarOpen(true); panToPlace(p.latitude, p.longitude); }} />
                )) : <div className={S.emptyState}>{searchKeyword ? '검색 결과가 없습니다.' : '해당 카테고리의 장소가 없습니다.'}</div>}
              </div>
              <div ref={observerTarget} className="h-10 w-full flex items-center justify-center">
                {isLoading && filteredPlaces.length > 0 && <div className={S.loadingSpinner} />}
              </div>
            </div>
          )}
        </div>

        {/* 사이드바 푸터 */}
        {(window.innerWidth >= 1024 || !selectedPlace) && (
          <div className={S.sidebarFooter}>
            {isLoggedIn ? (
              <div className="flex items-center space-x-2">
                {user?.role === 'ADMIN' && (
                  <button onClick={handleAdminButtonClick} className={S.adminMenuBtn}>
                    <ShieldCheck size={16} />
                    <span>관리자</span>
                  </button>
                )}
                <button onClick={logout} className={S.logoutBtn}>
                  <LogOut size={16} />
                  <span>로그아웃</span>
                </button>
              </div>
            ) : (
              <button onClick={() => setIsLoginModalOpen(true)} className={S.loginTriggerBtn}>
                <User size={16} />
                <span>로그인 / 회원가입</span>
              </button>
            )}
          </div>
        )}
      </aside>

      {/* 2. 지도 영역 */}
      <main className={S.mapMain}>
        <Map 
          center={currentPosition} 
          style={{ width: '100%', height: '100%' }} 
          level={3} 
          onCreate={handleMapCreate} 
          onIdle={handleMapIdle} 
          onClick={handleMapClick} 
          draggable={!isSelectingLocation}
          zoomable={!isSelectingLocation}
          onDragStart={() => { if (window.innerWidth < 1024 && selectedPlace) handleCloseDetail() }} 
          onZoomStart={() => { if (window.innerWidth < 1024 && selectedPlace) handleCloseDetail() }}
        >
          <MapMarker position={currentPosition} image={{ src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png", size: { width: 24, height: 35 } }} title="내 위치" />
          {isSelectingLocation && tempReportPosition && <MapMarker position={tempReportPosition} image={{ src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png", size: { width: 31, height: 35 } }} />}
          {mapMarkers.map((place) => (
            <MapMarker key={place.id} position={{ lat: place.latitude, lng: place.longitude }} image={{ src: "/puppynote-icon.png", size: { width: 24, height: 24 }, options: { offset: { x: 12, y: 24 } } }} onClick={() => { if(!isSelectingLocation) { setSelectedPlace(place); setIsSidebarOpen(true); panToPlace(place.latitude, place.longitude); } }} />
          ))}
        </Map>
        
        <div className={S.floatingControls}>
          <button onClick={() => updateCurrentLocation()} className={S.navButton}><Navigation size={24} className="fill-[#FFB800] text-[#FFB800]" /></button>
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

      {/* 3. 모바일 전용 상단 검색창 (사이드바가 닫혔을 때만 표시) */}
      {!isSelectingLocation && (!isSidebarOpen || window.innerWidth >= 1024) && (
        <div className={S.mobileSearchContainer}>
          <div className={S.mobileSearchBar}>
            <button onClick={() => { setSelectedPlace(null); setIsSidebarOpen(true); }} className={S.mobileMenuBtn}><Menu size={20} className="text-[#FFB800]" /></button>
            <form onSubmit={handleSearch} className="flex-1 relative">
              <input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="장소 검색" className={S.mobileInput} />
              {searchKeyword && <button type="button" onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-300"><X size={16} /></button>}
            </form>
          </div>
          {!selectedPlace && (
            <div className={S.mobileFilterRow}>
              {['ALL', ...Object.keys(CATEGORY_LABELS)].map((cat) => (
                <button key={cat} onClick={() => { setSelectedCategory(cat as any); setIsFavoriteMode(false); }} className={`${S.filterBadge} ${!isFavoriteMode && selectedCategory === cat ? S.filterBadgeActive : S.filterBadgeInactive} text-[10px] px-3 py-1.5`}>
                  {cat === 'ALL' ? '전체' : CATEGORY_LABELS[cat as Category]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. 장소 선택 오버레이 */}
      {isSelectingLocation && (
        <div className={S.selectionOverlay}>
          <div className={S.selectionTooltip}>제보할 장소를 지도에서 클릭해주세요!</div>
          <div className="flex space-x-2">
            <button onClick={() => setIsSelectingLocation(false)} className={S.selectionCancelBtn}>취소</button>
            {tempReportPosition && <button onClick={() => { setIsReportModalOpen(true); setIsSelectingLocation(false); }} className={S.selectionConfirmBtn}>이 위치로 제보하기</button>}
          </div>
        </div>
      )}

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <ReportPlaceModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} position={tempReportPosition || currentPosition} onSuccess={() => map && handleMapIdle(map)} />
      <AdminModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} />
    </div>
  )
}

const S = {
  container: `
    flex h-[100dvh] w-full 
    overflow-hidden 
    bg-gray-50 font-sans text-gray-900 
    relative
  `,

  sidebarWrapper: (selected: any, isOpen: boolean) => `
    fixed lg:static w-full lg:w-[380px] 
    flex flex-col border-r border-gray-100 
    z-[250] shadow-2xl bg-white 
    transition-all duration-300 ease-in-out
    relative overflow-hidden
    ${selected ? 'h-fit max-h-[90dvh] lg:h-full rounded-t-[32px] lg:rounded-none bottom-0 left-0 right-0 top-auto' : 'h-full top-0 left-0 right-0'}
    ${isOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:-translate-x-full'}
  `,

  dragHandleWrapper: `
    w-full flex justify-center py-3 
    lg:hidden shrink-0
  `,

  dragHandle: `
    w-12 h-1.5 
    bg-gray-200 rounded-full
  `,

  sidebarHeader: `
    p-6 pb-4 bg-white shrink-0
  `,

  logoWrapper: `
    flex items-center justify-between 
    mb-6
  `,

  logoContainer: `
    flex items-center space-x-2
  `,

  logoImage: `
    h-10 w-10 
    object-contain rounded-xl shadow-sm
  `,

  logoText: `
    font-black text-2xl 
    tracking-tighter text-[#FFB800]
  `,

  sidebarCloseBtn: `
    lg:hidden p-2 
    hover:bg-gray-100 rounded-full ml-1
  `,

  searchInput: `
    w-full pl-12 pr-12 py-3.5 
    bg-gray-50 border border-transparent rounded-2xl 
    focus:bg-white focus:ring-2 focus:ring-[#FFB800] 
    focus:border-transparent transition-all 
    outline-none shadow-sm
  `,

  searchIconBtn: `
    absolute left-4 top-1/2 -translate-y-1/2 
    text-gray-400 hover:text-[#FFB800] 
    transition-colors cursor-pointer z-10
  `,

  searchClearBtn: `
    absolute right-4 top-1/2 -translate-y-1/2 
    text-gray-300 hover:text-gray-600 
    transition-colors cursor-pointer z-10
  `,

  filterScrollRow: `
    flex space-x-2 overflow-x-auto 
    no-scrollbar pb-1 
    cursor-grab active:cursor-grabbing select-none
  `,

  contentArea: `
    flex-1 overflow-y-auto 
    min-h-0 no-scrollbar
  `,

  detailHeader: `
    flex justify-between items-center mb-6
  `,

  backButton: `
    text-sm font-bold text-[#FFB800] 
    flex items-center hover:text-[#E6A600] 
    transition-colors
  `,

  adminDeleteBtn: `
    p-2 text-red-500 
    hover:bg-red-50 rounded-full transition-colors
  `,

  sectionTitleRow: `
    flex items-center justify-between mb-4
  `,

  sectionTitle: `
    font-bold text-lg text-gray-800 
    flex items-center
  `,

  sectionSubtitle: `
    text-[10px] text-gray-400 
    ml-7 mt-0.5
  `,

  loadingSpinner: `
    animate-spin rounded-full 
    h-4 w-4 border-2 border-[#FFB800] 
    border-t-transparent
  `,

  emptyState: `
    text-center py-20 
    text-gray-400 text-sm
  `,

  sidebarFooter: `
    p-4 border-t border-gray-100 
    bg-white shrink-0
  `,

  adminMenuBtn: `
    flex-1 py-3.5 
    bg-red-50 text-red-500 rounded-xl font-bold 
    flex items-center justify-center space-x-1.5 text-xs
  `,

  logoutBtn: `
    flex-[2] py-3.5 
    bg-gray-50 text-gray-500 rounded-xl font-bold 
    flex items-center justify-center space-x-1.5 text-xs 
    hover:bg-gray-100 transition-colors
  `,

  loginTriggerBtn: `
    w-full py-3.5 
    bg-gray-50 text-gray-700 rounded-xl font-bold 
    flex items-center justify-center space-x-2 text-xs 
    hover:bg-gray-100 transition-colors
  `,

  mapMain: `
    fixed inset-0 lg:static flex-1 bg-gray-100 z-0 h-full w-full
  `,

  floatingControls: `
    absolute bottom-10 right-6 lg:right-10 
    z-[100] flex flex-col space-y-4 items-end
  `,

  navButton: `
    bg-white p-4 rounded-2xl shadow-xl 
    hover:bg-gray-50 transition-all 
    transform hover:scale-110 border border-gray-100
  `,

  reportButton: `
    bg-[#FFB800] text-white 
    px-6 lg:px-8 py-4 rounded-3xl shadow-xl 
    hover:shadow-[#FFB800]/20 transition-all 
    transform hover:scale-105 font-bold 
    flex flex-row items-center space-x-2
  `,

  reportBtnText: `
    text-base lg:text-lg whitespace-nowrap
  `,

  filterBadge: `
    px-4 py-2 rounded-xl text-xs font-bold 
    transition-all whitespace-nowrap border-2
  `,

  filterBadgeActive: `
    bg-[#FFB800] border-[#FFB800] 
    text-white shadow-md
  `,

  filterBadgeInactive: `
    bg-white border-gray-50 
    text-gray-400 hover:border-gray-200
  `,

  mobileSearchContainer: `
    absolute top-4 left-0 right-0 
    z-[160] px-4 flex flex-col space-y-2 
    lg:hidden
  `,

  mobileSearchBar: `
    w-full bg-white rounded-2xl shadow-2xl 
    p-2 flex items-center space-x-2 
    border border-gray-100
  `,

  mobileMenuBtn: `
    p-2 hover:bg-gray-50 
    rounded-xl transition-colors
  `,

  mobileInput: `
    w-full py-2 px-1 text-sm 
    outline-none bg-transparent
  `,

  mobileFilterRow: `
    flex space-x-2 overflow-x-auto 
    no-scrollbar py-2 select-none
  `,

  selectionOverlay: `
    absolute top-6 left-1/2 -translate-x-1/2 
    z-[200] flex flex-col items-center space-y-3 
    w-[90%] max-w-md
  `,

  selectionTooltip: `
    bg-black/80 text-white 
    px-6 py-3 rounded-full shadow-2xl backdrop-blur-md 
    animate-bounce text-sm text-center font-bold
  `,

  selectionCancelBtn: `
    bg-white text-gray-500 
    px-5 py-2.5 rounded-2xl font-bold shadow-xl
  `,

  selectionConfirmBtn: `
    bg-[#FFB800] text-white 
    px-5 py-2.5 rounded-2xl font-bold shadow-xl
  `,
}

export default MapPage
