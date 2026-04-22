import { Modal } from './Modal'
import { authApi } from '../../services/endpoints/AuthApi'
import { useAuthStore } from '../../store/useAuthStore'
import { useState } from 'react'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useAuthStore(state => state.login)

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await authApi.login({
        email,
        password,
        deviceId: 'web-browser',
        pushKey: ''
      })
      if (res.statusCode === 200) {
        login(res.data.accessToken, res.data.refreshToken, {
          email: res.data.email,
          nickName: '사용자', // 실제로는 프로필 정보 필요
        })
        onClose()
      }
    } catch (err) {
      alert('로그인에 실패했습니다.')
    }
  }

  const handleKakaoLogin = () => {
    const KAKAO_KEY = import.meta.env.VITE_KAKAO_MAP_API_KEY
    const REDIRECT_URI = `${window.location.origin}/oauth/kakao`
    const kakaoUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_KEY}&redirect_uri=${REDIRECT_URI}&response_type=code`
    window.location.href = kakaoUrl
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="로그인">
      <form onSubmit={handleStandardLogin} className="space-y-4">
        <div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="이메일"
            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FFB800] outline-none"
            required
          />
        </div>
        <div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FFB800] outline-none"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full py-4 bg-[#FFB800] text-white rounded-2xl font-bold hover:shadow-lg transition-all"
        >
          로그인
        </button>
        
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">또는</span></div>
        </div>

        <button
          type="button"
          onClick={handleKakaoLogin}
          className="w-full flex items-center justify-center space-x-2 py-3.5 bg-[#FEE500] text-[#191919] rounded-2xl font-bold hover:shadow-md transition-all"
        >
          <img src="/loginButton/kakao.png" alt="Kakao" className="h-5 object-contain" />
          <span>카카오로 시작하기</span>
        </button>
      </form>
    </Modal>
  )
}
