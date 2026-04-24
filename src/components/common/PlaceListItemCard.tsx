import { Heart } from 'lucide-react'
import { useState } from 'react'
import type { Place } from '../../types'
import { CATEGORY_LABELS } from '../../types'
import { ImageGalleryModal } from './ImageGalleryModal'

interface PlaceListItemCardProps {
  place: Place
  index?: number
  onClick: (place: Place) => void
}

export const PlaceListItemCard = ({ place, index, onClick }: PlaceListItemCardProps) => {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation() // 부모의 onClick(상세보기) 방지
    setIsGalleryOpen(true)
  }

  return (
    <>
      <div 
        onClick={() => onClick(place)} 
        className={S.container}
      >
        <div className={S.contentWrapper}>
          <div className={S.infoSection}>
            <div className={S.headerRow}>
              {index !== undefined && (
                <span className={S.rankBadge}>
                  NO.{index + 1}
                </span>
              )}
              <span className={S.categoryBadge}>
                {CATEGORY_LABELS[place.category]}
              </span>
            </div>
            <h3 className={S.title}>
              {place.title}
            </h3>
            <p className={S.description}>
              {place.content}
            </p>
          </div>

          <div className={S.mediaSection}>
            {place.imageUrls && place.imageUrls.length > 0 && (
              <div className={S.imageWrapper} onClick={handleImageClick}>
                <img 
                  src={place.imageUrls[0]} 
                  className={S.thumbnail} 
                  alt="Thumbnail" 
                />
                {place.imageUrls.length > 1 && (
                  <div className={S.imageCountBadge}>
                    {place.imageUrls.length}
                  </div>
                )}
              </div>
            )}
            <div className={S.likeWrapper}>
              <Heart size={18} className={S.likeIcon} />
              <span className={S.likeCount}>{place.likeCount}</span>
            </div>
          </div>
        </div>
      </div>

      <ImageGalleryModal 
        images={place.imageUrls || []}
        initialIndex={0}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
      />
    </>
  )
}

const S = {
  container: "p-5 bg-white border border-gray-100 rounded-2xl hover:border-[#FFB800] cursor-pointer transition-all shadow-sm hover:shadow-md group",
  contentWrapper: "flex justify-between items-start",
  infoSection: "flex-1 min-w-0",
  headerRow: "flex items-center space-x-2 mb-1.5",
  rankBadge: "text-[10px] font-black px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md whitespace-nowrap",
  categoryBadge: "text-xs font-bold text-[#FFB800] uppercase tracking-wider",
  title: "font-bold text-gray-900 group-hover:text-[#FFB800] transition-colors truncate",
  description: "text-xs text-gray-400 mt-2 line-clamp-1",
  mediaSection: "flex items-center ml-4 space-x-3",
  imageWrapper: "relative w-16 h-16 shrink-0",
  thumbnail: "w-full h-full object-cover rounded-xl shadow-inner hover:opacity-90 transition-opacity",
  imageCountBadge: "absolute -top-1 -right-1 bg-black/70 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold",
  likeWrapper: "flex flex-col items-center space-y-1",
  likeIcon: "text-red-400 group-hover:fill-red-400 transition-all",
  likeCount: "text-[10px] font-bold text-gray-400"
}
