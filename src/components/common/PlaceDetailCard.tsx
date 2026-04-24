import { MapPin, ThumbsUp, Heart, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { Place } from '../../types'
import { CATEGORY_LABELS } from '../../types'
import { ImageGalleryModal } from './ImageGalleryModal'

interface PlaceDetailCardProps {
  place: Place
  isLoggedIn: boolean
  isFavorite: boolean
  onLoginRequired: () => void
  onToggleLike: (placeId: number) => void
  onToggleFavorite: (placeId: number) => void
}

export const PlaceDetailCard = ({ 
  place, 
  isLoggedIn, 
  isFavorite,
  onLoginRequired, 
  onToggleLike,
  onToggleFavorite
}: PlaceDetailCardProps) => {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const openGallery = (index: number) => {
    setSelectedImageIndex(index)
    setIsGalleryOpen(true)
  }

  return (
    <div className={S.cardContainer}>
      <div className={S.categoryWrapper}>
        <span className={S.categoryBadge}>
          {CATEGORY_LABELS[place.category]}
        </span>
      </div>
      
      {place.imageUrls && place.imageUrls.length > 0 && (
        <div className={S.imageWrapper}>
          <img 
            src={place.imageUrls[0]} 
            className={S.mainImage} 
            alt={place.title} 
            onClick={() => openGallery(0)}
          />
          {place.imageUrls.length > 1 && (
            <div className={S.imageCountBadge}>
              +{place.imageUrls.length - 1}장 더보기
            </div>
          )}
        </div>
      )}
      
      <h2 className={S.title}>{place.title}</h2>
      
      <div className={S.addressWrapper}>
        <MapPin size={14} className="mr-1" />
        <span className="truncate">{place.content}</span>
      </div>

      <div className={S.tagList}>
        {place.largeDogAvailable && <Tag label="대형견 가능" color="orange" />}
        {place.parkingAvailable && <Tag label="주차 가능" color="blue" />}
        {place.offLeashAvailable && <Tag label="오프리쉬" color="green" />}
      </div>

      <div className={S.actionArea}>
        <div className={S.buttonGrid}>
          <button 
            onClick={() => !isLoggedIn ? onLoginRequired() : onToggleLike(place.id)} 
            className={S.likeButton}
          >
            <ThumbsUp size={20} fill={place.likeCount > 0 ? "currentColor" : "transparent"} />
            <span>좋아요 {place.likeCount}</span>
          </button>

          <button 
            onClick={() => !isLoggedIn ? onLoginRequired() : onToggleFavorite(place.id)} 
            className={`${S.favoriteButton} ${isFavorite ? S.favoriteActive : S.favoriteInactive}`}
          >
            <Heart size={20} fill={isFavorite ? "currentColor" : "transparent"} />
            <span>{isFavorite ? '저장됨' : '즐겨찾기'}</span>
          </button>
        </div>

        <a 
          href={`https://map.kakao.com/link/map/${place.title},${place.latitude},${place.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className={S.kakaoMapLink}
        >
          <img src="/loginButton/kakao.png" alt="Kakao" className="h-4 object-contain" />
          <span className="text-sm">카카오맵에서 보기</span>
        </a>
      </div>

      <ImageGalleryModal 
        images={place.imageUrls || []}
        initialIndex={selectedImageIndex}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
      />
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

const S = {
  cardContainer: "bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 lg:mb-0",
  categoryWrapper: "flex items-center space-x-2 mb-4",
  categoryBadge: "text-[10px] font-bold px-2 py-1 bg-orange-100 text-[#FFB800] rounded-lg",
  imageWrapper: "relative group mb-4",
  mainImage: "w-full h-48 lg:h-64 object-cover rounded-2xl cursor-pointer hover:opacity-95 transition-opacity",
  imageCountBadge: "absolute bottom-3 right-3 bg-black/60 text-white text-[10px] px-2 py-1 rounded-lg backdrop-blur-sm",
  title: "text-2xl font-bold mb-2",
  addressWrapper: "flex items-center text-sm text-gray-500 mb-4",
  tagList: "flex flex-wrap gap-2 mb-6",
  actionArea: "flex flex-col space-y-3",
  buttonGrid: "grid grid-cols-2 gap-3",
  likeButton: "py-4 bg-orange-50 text-[#FFB800] border border-orange-100 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-orange-100 transition-colors",
  favoriteButton: "py-4 rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 border-2",
  favoriteActive: "bg-red-50 border-red-100 text-red-500",
  favoriteInactive: "bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100",
  kakaoMapLink: "w-full py-4 bg-[#FEE500] text-[#3A1D1D] rounded-2xl font-bold flex items-center justify-center space-x-2 hover:shadow-md transition-all",
}
