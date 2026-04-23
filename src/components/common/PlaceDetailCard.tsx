import { MapPin, Heart } from 'lucide-react'
import type { Place } from '../../types'
import { CATEGORY_LABELS } from '../../types'

interface PlaceDetailCardProps {
  place: Place
  isLoggedIn: boolean
  onLoginRequired: () => void
  onToggleLike: (placeId: number) => void
}

export const PlaceDetailCard = ({ 
  place, 
  isLoggedIn, 
  onLoginRequired, 
  onToggleLike 
}: PlaceDetailCardProps) => {
  return (
    <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 mb-20 lg:mb-0">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-[10px] font-bold px-2 py-1 bg-orange-100 text-[#FFB800] rounded-lg">
          {CATEGORY_LABELS[place.category]}
        </span>
      </div>
      
      {place.imageUrls && place.imageUrls.length > 0 && (
        <img 
          src={place.imageUrls[0]} 
          className="w-full h-48 lg:h-64 object-cover rounded-2xl mb-4" 
          alt={place.title} 
        />
      )}
      
      <h2 className="text-2xl font-bold mb-2">{place.title}</h2>
      
      <div className="flex items-center text-sm text-gray-500 mb-4">
        <MapPin size={14} className="mr-1" />
        <span className="truncate">{place.content}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {place.largeDogAvailable && <Tag label="대형견 가능" color="orange" />}
        {place.parkingAvailable && <Tag label="주차 가능" color="blue" />}
        {place.offLeashAvailable && <Tag label="오프리쉬" color="green" />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => !isLoggedIn ? onLoginRequired() : onToggleLike(place.id)} 
          className="flex-1 py-4 bg-[#FFB800] text-white rounded-2xl font-bold hover:shadow-lg transition-all flex items-center justify-center space-x-2"
        >
          <Heart size={20} fill={place.likeCount > 0 ? "white" : "transparent"} />
          <span>좋아요 {place.likeCount}</span>
        </button>

        <a 
          href={`https://map.kakao.com/link/map/${place.title},${place.latitude},${place.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-4 bg-yellow-50 text-[#3A1D1D] border border-yellow-200 rounded-2xl font-bold hover:shadow-md transition-all flex items-center justify-center space-x-2"
        >
          <img src="/loginButton/kakao.png" alt="Kakao" className="h-4 object-contain" />
          <span className="text-sm">카카오맵</span>
        </a>
      </div>
    </div>
  )
}

const Tag = ({ label, color }: { label: string, color: 'orange' | 'blue' | 'green' }) => {
  const colors = {
    orange: 'bg-orange-50 text-orange-600 border border-orange-100',
    blue: 'bg-blue-50 text-blue-600 border border-blue-100',
    green: 'bg-green-50 text-green-600 border border-green-100'
  }
  return <div className={`px-3 py-1.5 rounded-xl text-center text-[10px] font-bold ${colors[color]}`}>{label}</div>
}
