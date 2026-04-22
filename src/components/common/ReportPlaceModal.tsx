import { Modal } from './Modal'
import { placeApi } from '../../services/endpoints/PlaceApi'
import { useState } from 'react'
import type { Category } from '../../types'

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
        title, content, category, latitude: position.lat, longitude: position.lng,
        largeDogAvailable: isLargeDog, parkingAvailable: isParking, offLeashAvailable: isOffLeash
      })
      alert('장소 제보가 완료되었습니다!')
      onSuccess()
      onClose()
    } catch (err) {
      alert('장소 제보에 실패했습니다.')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="장소 제보하기">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className={S.coordInfo}>중심 좌표: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}</div>
        
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

        <button type="submit" className={S.submitButton}>제보 완료</button>
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
  coordInfo: "text-[10px] text-gray-400 bg-gray-50 p-3 rounded-xl font-mono",
  label: "block text-sm font-bold text-gray-700 mb-2 ml-1",
  input: "w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FFB800] outline-none transition-all",
  select: "w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FFB800] outline-none appearance-none",
  textarea: "w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FFB800] outline-none h-32 resize-none transition-all",
  submitButton: "w-full py-4 bg-[#FFB800] text-white rounded-2xl font-bold hover:shadow-lg transition-all",
  toggleBase: "flex flex-col items-center p-3 rounded-2xl border-2 transition-all cursor-pointer",
  toggleText: "text-[10px] font-bold"
}
