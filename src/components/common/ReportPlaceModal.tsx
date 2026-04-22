import { Modal } from './Modal'
import { placeApi } from '../../services/endpoints/PlaceApi'
import { useState } from 'react'
import { Category } from '../../types'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await placeApi.reportPlace({
        title,
        content,
        category,
        latitude: position.lat,
        longitude: position.lng,
        largeDogAvailable: isLargeDog,
        parkingAvailable: isParking,
        offLeashAvailable: isOffLeash
      })
      alert('장소 제보가 완료되었습니다! 승인 후 지도에 표시됩니다.')
      onSuccess()
      onClose()
    } catch (err) {
      alert('장소 제보에 실패했습니다.')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="장소 제보하기">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl">
          현재 지도 중심 좌표: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">장소명</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="예: 올림픽공원 산책로"
            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FFB800] outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">카테고리</label>
          <select 
            value={category}
            onChange={e => setCategory(e.target.value as Category)}
            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FFB800] outline-none appearance-none"
          >
            <option value="PARK">공원</option>
            <option value="TRAIL">산책로</option>
            <option value="CAFE">카페</option>
            <option value="ETC">기타</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">설명</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="장소에 대한 설명을 입력해주세요"
            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FFB800] outline-none h-32 resize-none"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${isLargeDog ? 'border-[#FFB800] bg-orange-50' : 'border-gray-50 bg-gray-50'}`}>
            <input type="checkbox" checked={isLargeDog} onChange={e => setIsLargeDog(e.target.checked)} className="hidden" />
            <span className={`text-[10px] font-bold ${isLargeDog ? 'text-[#FFB800]' : 'text-gray-400'}`}>대형견</span>
          </label>
          <label className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${isParking ? 'border-[#FFB800] bg-orange-50' : 'border-gray-50 bg-gray-50'}`}>
            <input type="checkbox" checked={isParking} onChange={e => setIsParking(e.target.checked)} className="hidden" />
            <span className={`text-[10px] font-bold ${isParking ? 'text-[#FFB800]' : 'text-gray-400'}`}>주차가능</span>
          </label>
          <label className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${isOffLeash ? 'border-[#FFB800] bg-orange-50' : 'border-gray-50 bg-gray-50'}`}>
            <input type="checkbox" checked={isOffLeash} onChange={e => setIsOffLeash(e.target.checked)} className="hidden" />
            <span className={`text-[10px] font-bold ${isOffLeash ? 'text-[#FFB800]' : 'text-gray-400'}`}>오프리쉬</span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-[#FFB800] text-white rounded-2xl font-bold hover:shadow-lg transition-all"
        >
          제보 완료
        </button>
      </form>
    </Modal>
  )
}
