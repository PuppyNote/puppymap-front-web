import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface ImageGalleryModalProps {
  images: string[]
  initialIndex: number
  isOpen: boolean
  onClose: () => void
}

export const ImageGalleryModal = ({ images, initialIndex, isOpen, onClose }: ImageGalleryModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  if (!isOpen) return null

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }

  return (
    <div 
      className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-colors z-[310]"
      >
        <X size={32} />
      </button>

      {images.length > 1 && (
        <>
          <button 
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-4 hover:bg-white/10 rounded-full transition-colors z-[310]"
          >
            <ChevronLeft size={48} />
          </button>
          <button 
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-4 hover:bg-white/10 rounded-full transition-colors z-[310]"
          >
            <ChevronRight size={48} />
          </button>
        </>
      )}

      <div className="relative w-full h-full flex items-center justify-center p-4">
        <img 
          src={images[currentIndex]} 
          alt={`Gallery ${currentIndex}`}
          className="max-w-full max-h-full object-contain select-none shadow-2xl animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        />
        
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  )
}
