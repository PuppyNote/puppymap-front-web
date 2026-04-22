import { Modal } from './Modal'
import { adminApi } from '../../services/endpoints/AdminApi'
import { useState, useEffect } from 'react'
import type { Place } from '../../types'
import { CATEGORY_LABELS } from '../../types'
import { Check, X, MapPin, Calendar, User, ChevronLeft, Loader2 } from 'lucide-react'
import { Map, MapMarker } from 'react-kakao-maps-sdk'

interface AdminModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AdminModal = ({ isOpen, onClose }: AdminModalProps) => {
  const [pendingPlaces, setPendingPlaces] = useState<Place[]>([])
  const [selectedReport, setSelectedReport] = useState<Place | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

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

  const handleSelectReport = async (id: number) => {
    setIsDetailLoading(true)
    try {
      const res = await adminApi.getPlaceDetail(id)
      setSelectedReport(res.data)
    } catch (err) {
      alert('상세 정보를 불러오는 데 실패했습니다.')
    } finally {
      setIsDetailLoading(false)
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
      <div className="min-h-[450px] max-h-[70vh] overflow-hidden flex flex-col relative">
        
        {isDetailLoading && (
          <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <Loader2 className="animate-spin text-[#FFB800]" size={32} />
          </div>
        )}

        {selectedReport ? (
          <div className="flex-1 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200 pr-2 custom-scrollbar">
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

              {selectedReport.imageUrls && selectedReport.imageUrls.length > 0 && (
                <div className="flex space-x-2 overflow-x-auto no-scrollbar py-1">
                  {selectedReport.imageUrls.map((url, idx) => (
                    <img 
                      key={idx} 
                      src={url} 
                      className="w-40 h-40 object-cover rounded-2xl border border-gray-100 flex-shrink-0" 
                      alt={`Report ${idx}`} 
                      onError={(e) => e.currentTarget.src = 'https://via.placeholder.com/160?text=No+Image'}
                    />
                  ))}
                </div>
              )}

              <div className="bg-gray-50 p-5 rounded-3xl text-sm text-gray-600 leading-relaxed">
                {selectedReport.content}
              </div>

              {/* 제보 위치 미니 지도 - key를 부여하여 장소 변경 시마다 새로 렌더링 강제 */}
              <div className="w-full h-44 rounded-3xl overflow-hidden border border-gray-100 shadow-inner bg-gray-100">
                <Map 
                  key={`admin-map-${selectedReport.id}`}
                  center={{ lat: Number(selectedReport.latitude), lng: Number(selectedReport.longitude) }}
                  style={{ width: '100%', height: '100%' }}
                  level={4}
                  draggable={false}
                  zoomable={false}
                >
                  <MapMarker position={{ lat: Number(selectedReport.latitude), lng: Number(selectedReport.longitude) }} />
                </Map>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <StatusBadge label="대형견" active={selectedReport.largeDogAvailable} />
                <StatusBadge label="주차" active={selectedReport.parkingAvailable} />
                <StatusBadge label="오프리쉬" active={selectedReport.offLeashAvailable} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs border-t border-gray-50 pt-4">
                <div className="flex items-center space-x-2 text-gray-400">
                  <MapPin size={14} /> 
                  <span>{selectedReport.latitude.toFixed(4)}, {selectedReport.longitude.toFixed(4)}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-400">
                  <Calendar size={14} />
                  <span>{new Date(selectedReport.createdDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex space-x-3 sticky bottom-0 bg-white pb-2">
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
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#FFB800]" size={32} /></div>
            ) : pendingPlaces.length > 0 ? (
              pendingPlaces.map((report) => (
                <div 
                  key={report.id}
                  onClick={() => handleSelectReport(report.id)}
                  className="p-5 bg-gray-50 rounded-[24px] hover:bg-orange-50/50 cursor-pointer border border-transparent hover:border-[#FFB800]/20 transition-all group"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[10px] font-bold text-[#FFB800] mb-1">{CATEGORY_LABELS[report.category]}</div>
                      <h4 className="font-bold text-gray-900 group-hover:text-[#FFB800] transition-colors">{report.title}</h4>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1 w-full max-w-[200px]">{report.content}</p>
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

const StatusBadge = ({ label, active }: { label: string, active: boolean }) => (
  <div className={`py-2 rounded-xl text-center text-[10px] font-bold ${active ? 'bg-orange-100 text-[#FFB800]' : 'bg-gray-100 text-gray-400'}`}>
    {label}
  </div>
)
