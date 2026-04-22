import { Modal } from './Modal'
import { placeApi } from '../../services/endpoints/PlaceApi'
import { storageApi } from '../../services/endpoints/StorageApi'
import { useState, useRef } from 'react'
import type { Category } from '../../types'
import { Camera, X, Loader2 } from 'lucide-react'

interface ReportPlaceModalProps {
  isOpen: boolean
  onClose: () => void
  position: { lat: number; lng: number }
  onSuccess: () => void
}

export const ReportPlaceModal = ({ isOpen, onClose, position, onSuccess }: ReportPlaceModalProps) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<Category>('PARK')
  const [isLargeDog, setIsLargeDog] = useState(false)
  const [isParking, setIsParking] = useState(false)
  const [isOffLeash, setIsOffLeash] = useState(false)
  
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setSelectedImages(prev => [...prev, ...files])
      
      const newPreviews = files.map(file => URL.createObjectURL(file))
      setPreviews(prev => [...prev, ...newPreviews])
    }
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      // 1. 이미지 업로드 순차 진행
      const imageUrls: string[] = []
      for (const file of selectedImages) {
        const res = await storageApi.uploadFile(file)
        if (res.statusCode === 200) {
          imageUrls.push(res.data)
        }
      }

      // 2. 장소 제보 API 호출 (이미지 URL 포함)
      await placeApi.reportPlace({
        title, 
        content, 
        category, 
        latitude: position.lat, 
        longitude: position.lng,
        largeDogAvailable: isLargeDog, 
        parkingAvailable: isParking, 
        offLeashAvailable: isOffLeash,
        imageUrls, // 업로드된 이미지 리스트 추가
      }) 

      alert('장소 제보가 완료되었습니다!')
      onSuccess()
      onClose()
      resetForm()
    } catch (err) {
      console.error(err)
      alert('제보 처리 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setContent('')
    setSelectedImages([])
    setPreviews([])
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="장소 제보하기">
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
        <div className={S.coordInfo}>중심 좌표: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}</div>
        
        {/* Image Upload UI */}
        <div>
          <label className={S.label}>사진 등록</label>
          <div className="flex flex-wrap gap-2">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-[#FFB800] hover:text-[#FFB800] transition-all"
            >
              <Camera size={24} />
              <span className="text-[10px] mt-1 font-bold">{selectedImages.length}/5</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              multiple 
              accept="image/*" 
              className="hidden" 
            />
            {previews.map((src, idx) => (
              <div key={idx} className="relative w-20 h-20">
                <img src={src} className="w-full h-full object-cover rounded-2xl" alt="Preview" />
                <button 
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1 -right-1 bg-white shadow-md rounded-full p-1 text-gray-400 hover:text-red-500"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className={S.label}>장소명</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 올림픽공원 산책로" className={S.input} required />
        </div>

        <div>
          <label className={S.label}>카테고리</label>
          <select value={category} onChange={e => setCategory(e.target.value as Category)} className={S.select}>
            <option value="PARK">공원</option>
            <option value="TRAIL">산책로</option>
            <option value="CAFE">카페</option>
            <option value="ETC">기타</option>
          </select>
        </div>

        <div>
          <label className={S.label}>설명</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="설명을 입력해주세요" className={S.textarea} required />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <OptionToggle active={isLargeDog} label="대형견" onChange={setIsLargeDog} />
          <OptionToggle active={isParking} label="주차가능" onChange={setIsParking} />
          <OptionToggle active={isOffLeash} label="오프리쉬" onChange={setIsOffLeash} />
        </div>

        <button type="submit" disabled={isSubmitting} className={S.submitButton}>
          {isSubmitting ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
          {isSubmitting ? '업로드 중...' : '제보 완료'}
        </button>
      </form>
    </Modal>
  )
}

const OptionToggle = ({ active, label, onChange }: { active: boolean, label: string, onChange: (v: boolean) => void }) => (
  <label className={`${S.toggleBase} ${active ? 'border-[#FFB800] bg-orange-50' : 'border-gray-50 bg-gray-50'}`}>
    <input type="checkbox" checked={active} onChange={e => onChange(e.target.checked)} className="hidden" />
    <span className={`${S.toggleText} ${active ? 'text-[#FFB800]' : 'text-gray-400'}`}>{label}</span>
  </label>
)

const S = {
  coordInfo: "text-[10px] text-gray-400 bg-gray-50 p-3 rounded-xl font-mono mb-4",
  label: "block text-sm font-bold text-gray-700 mb-2 ml-1",
  input: "w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FFB800] outline-none transition-all",
  select: "w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FFB800] outline-none appearance-none",
  textarea: "w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FFB800] outline-none h-32 resize-none transition-all",
  submitButton: "w-full py-4 bg-[#FFB800] text-white rounded-2xl font-bold hover:shadow-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed",
  toggleBase: "flex flex-col items-center p-3 rounded-2xl border-2 transition-all cursor-pointer",
  toggleText: "text-[10px] font-bold"
}
