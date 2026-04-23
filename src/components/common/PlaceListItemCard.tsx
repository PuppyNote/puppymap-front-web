import { Heart } from 'lucide-react'
import type { Place } from '../../types'
import { CATEGORY_LABELS } from '../../types'

interface PlaceListItemCardProps {
  place: Place
  index?: number
  onClick: (place: Place) => void
}

export const PlaceListItemCard = ({ place, index, onClick }: PlaceListItemCardProps) => {
  return (
    <div 
      onClick={() => onClick(place)} 
      className="p-5 bg-white border border-gray-100 rounded-2xl hover:border-[#FFB800] cursor-pointer transition-all shadow-sm hover:shadow-md group"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1.5">
            {index !== undefined && (
              <span className="text-[10px] font-black px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">
                NO.{index + 1}
              </span>
            )}
            <span className="text-xs font-bold text-[#FFB800] uppercase tracking-wider">
              {CATEGORY_LABELS[place.category]}
            </span>
          </div>
          <h3 className="font-bold text-gray-900 group-hover:text-[#FFB800] transition-colors">
            {place.title}
          </h3>
          <p className="text-xs text-gray-400 mt-2 line-clamp-1">
            {place.content}
          </p>
        </div>
        <div className="flex flex-col items-center ml-4 space-y-1">
          <Heart size={18} className="text-red-400 group-hover:fill-red-400 transition-all" />
          <span className="text-[10px] font-bold text-gray-400">{place.likeCount}</span>
        </div>
      </div>
    </div>
  )
}
