import { Map, MapMarker } from 'react-kakao-maps-sdk'
import { Search, List, Heart, User, Dog } from 'lucide-react'
import { useState } from 'react'

const MapPage = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  
  // 임시 데이터 (나중에 API 연동)
  const mockPlaces = [
    { id: 1, title: '강아지 공원', lat: 37.5665, lng: 126.978, likes: 25 },
    { id: 2, title: '숲속 산책로', lat: 37.5675, lng: 126.979, likes: 18 },
  ]

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      {/* Sidebar */}
      <aside className="w-[360px] h-full flex flex-col border-r border-gray-200 z-10 shadow-lg bg-white">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-100 space-y-4">
          <div className="flex items-center space-x-2 text-blue-600 mb-2">
            <Dog size={24} />
            <span className="font-bold text-xl tracking-tight">PuppyMap</span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="산책로, 공원, 카페 검색..."
              className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
            <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Top 20 Likes List (Default State) */}
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Heart size={18} className="text-red-500 fill-red-500" />
              <h2 className="font-bold text-lg text-gray-800">인기 산책 장소 Top 20</h2>
            </div>
            
            <div className="space-y-3">
              {mockPlaces.map((place, index) => (
                <div 
                  key={place.id}
                  className="p-4 border border-gray-100 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-blue-500 mb-1 block">RANK {index + 1}</span>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {place.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 truncate w-full">서울 중구 을지로 123-4</p>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-400">
                      <Heart size={14} />
                      <span className="text-xs">{place.likes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <nav className="border-t border-gray-100 p-2 flex justify-around items-center bg-gray-50">
          <button className="flex flex-col items-center p-2 text-blue-600">
            <List size={20} />
            <span className="text-[10px] mt-1 font-medium">탐색</span>
          </button>
          <button className="flex flex-col items-center p-2 text-gray-400 hover:text-blue-500 transition-colors">
            <Heart size={20} />
            <span className="text-[10px] mt-1 font-medium">즐겨찾기</span>
          </button>
          <button className="flex flex-col items-center p-2 text-gray-400 hover:text-blue-500 transition-colors">
            <User size={20} />
            <span className="text-[10px] mt-1 font-medium">마이페이지</span>
          </button>
        </nav>
      </aside>

      {/* Map Container */}
      <main className="flex-1 relative">
        <Map
          center={{ lat: 37.5665, lng: 126.978 }}
          style={{ width: '100%', height: '100%' }}
          level={3}
        >
          {mockPlaces.map((place) => (
            <MapMarker
              key={place.id}
              position={{ lat: place.lat, lng: place.lng }}
              title={place.title}
            />
          ))}
        </Map>
        
        {/* Floating Action Button (Optional) */}
        <button className="absolute bottom-8 right-8 z-20 bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl hover:bg-blue-700 transition-all transform hover:scale-105 font-bold flex items-center space-x-2">
          <PlusCircle size={20} />
          <span>장소 제보하기</span>
        </button>
      </main>
    </div>
  )
}

// PlusCircle 아이콘이 필요하여 추가 임포트 대신 lucide-react에서 직접 사용할 수 있도록 아래에 컴포넌트 추가 정의하거나 임포트 수정 필요
import { PlusCircle } from 'lucide-react'

export default MapPage
