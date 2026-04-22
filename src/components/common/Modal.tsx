import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null

  return (
    <div className={S.overlay}>
      <div className={S.contentWrapper}>
        <div className={S.header}>
          <h2 className={S.title}>{title}</h2>
          <button onClick={onClose} className={S.closeButton}>
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className={S.body}>
          {children}
        </div>
      </div>
    </div>
  )
}

const S = {
  overlay: "fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200",
  contentWrapper: "bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200",
  header: "flex items-center justify-between p-6 border-b border-gray-100",
  title: "text-xl font-bold text-gray-900",
  closeButton: "p-2 hover:bg-gray-100 rounded-full transition-colors",
  body: "p-6",
}
