import { Modal } from './Modal'
import { adminApi } from '../../services/endpoints/AdminApi'
import { useState, useEffect } from 'react'
import type { Place } from '../../types'
import { CATEGORY_LABELS } from '../../types'
import { Check, X, MapPin, Calendar, User } from 'lucide-react'

interface AdminModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AdminModal = ({ isOpen, onClose }: AdminModalProps) => {
  const [pendingPlaces, setPendingPlaces] = useState<Place[]>([])
  const [selectedReport, setSelectedReport] = useState<Place | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchReports = async () => {
    setIsLoading(true)
    try {
      const res = await adminApi.getPendingPlaces()
      setPendingPlaces(res.data)
    } catch (err) {
      console.error('Failed to fetch reports')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchReports()
      setSelectedReport(null)
    }
  }, [isOpen])

  const handleApprove = async (id: number) => {
    if (!confirm('이 장소를 승인하시겠습니까?')) return
    try {
      await adminApi.approvePlace(id)
      alert('승인되었습니다.')
      fetchReports()
      setSelectedReport(null)
    } catch (err) {
      alert('승인 처리 중 오류가 발생했습니다.')
    }
  }

  const handleReject = async (id: number) => {
    const reason = prompt('거절 사유를 입력해주세요.')
    if (reason === null) return
    if (!reason.trim()) return alert('사유를 입력해야 합니다.')
    
    try {
      await adminApi.rejectPlace(id, reason)
      alert('거절되었습니다.')
      fetchReports()
      setSelectedReport(null)
    } catch (err) {
      alert('거절 처리 중 오류가 발생했습니다.')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="관리자 - 제보 관리">
      <div className="min-h-[400px] max-h-[600px] overflow-hidden flex flex-col">
        {selectedReport ? (
          /* 상세 조회 뷰 */
          <div className="flex-1 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            <button 
              onClick={() => setSelectedReport(null)}
              className="text-sm font-bold text-gray-400 hover:text-gray-800 flex items-center mb-4"
            >
              ← 목록으로 돌아가기
            </button>
            
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-gray-900">{selectedReport.title}</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-orange-50 text-[#FFB800] text-xs font-bold rounded-lg">
                  {CATEGORY_LABELS[selectedReport.category]}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-lg flex items-center">
                  <User size={12} className="mr-1" /> {selectedReport.userNickName}
                </span>
              </div>

              <div className="bg-gray-50 p-5 rounded-3xl text-sm text-gray-600 leading-relaxed min-h-[100px]">
                {selectedReport.content}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center space-x-2 text-gray-400">
                  <MapPin size={14} /> 
                  <span>{selectedReport.latitude.toFixed(4)}, {selectedReport.longitude.toFixed(4)}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-400">
                  <Calendar size={14} />
                  <span>{new Date(selectedReport.createdDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex space-x-3">
                <button 
                  onClick={() => handleReject(selectedReport.id)}
                  className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center space-x-2"
                >
                  <X size={20} />
                  <span>거절</span>
                </button>
                <button 
                  onClick={() => handleApprove(selectedReport.id)}
                  className="flex-1 py-4 bg-[#FFB800] text-white rounded-2xl font-bold hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <Check size={20} />
                  <span>승인하기</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 목록 뷰 */
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFB800]" /></div>
            ) : pendingPlaces.length > 0 ? (
              pendingPlaces.map((report) => (
                <div 
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="p-5 bg-gray-50 rounded-[24px] hover:bg-orange-50/50 cursor-pointer border border-transparent hover:border-[#FFB800]/20 transition-all group"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[10px] font-bold text-[#FFB800] mb-1">{CATEGORY_LABELS[report.category]}</div>
                      <h4 className="font-bold text-gray-900 group-hover:text-[#FFB800] transition-colors">{report.title}</h4>
                      <p className="text-xs text-gray-400 mt-1">제보자: {report.userNickName}</p>
                    </div>
                    <ChevronLeft className="text-gray-300 group-hover:text-[#FFB800] rotate-180 transition-all" size={20} />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 text-gray-400 text-sm">새로운 제보가 없습니다.</div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
