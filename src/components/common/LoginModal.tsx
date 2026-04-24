import { Modal } from './Modal'
import { authApi } from '../../services/endpoints/AuthApi'
import { useAuthStore } from '../../store/useAuthStore'
import { useState } from 'react'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickName, setNickName] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationId, setVerificationId] = useState<number | null>(null)
  
  const [isEmailChecked, setIsEmailChecked] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const login = useAuthStore(state => state.login)

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await authApi.login({ email, password, deviceId: 'web-browser', pushKey: '' })
      if (res.statusCode === 200) {
        const { accessToken, refreshToken, email: userEmail, role } = res.data as any
        login(accessToken, refreshToken, { email: userEmail, nickName: '사용자', role: role || 'USER' })
        onClose()
      }
    } catch (err) {
      // alert 제거 (ApiService에서 처리)
    } finally {
      setIsLoading(false)
    }
  }

  const checkEmailAndSendCode = async () => {
    if (!email) return alert('이메일을 입력해주세요.')
    setIsLoading(true)
    try {
      // 인증번호 전송 (제공해주신 명세에 따라 즉시 호출)
      const res = await authApi.sendEmailVerification(email)
      if (res.data) {
        setVerificationId(res.data)
        setIsCodeSent(true)
        setIsEmailChecked(true)
        alert('인증번호가 전송되었습니다. 이메일을 확인해주세요.')
      }
    } catch (err: any) {
      // alert 제거
    } finally {
      setIsLoading(false)
    }
  }

  const verifyCode = async () => {
    if (!verificationCode) return alert('인증번호를 입력해주세요.')
    if (verificationId === null) return alert('인증 요청 정보가 없습니다. 다시 인증받기를 눌러주세요.')
    
    setIsLoading(true)
    try {
      const res = await authApi.verifyEmailCode(verificationId, verificationCode)
      if (res.data === true) {
        setIsEmailVerified(true)
        alert('이메일 인증이 완료되었습니다.')
      } else {
        alert('인증번호가 일치하지 않습니다.')
      }
    } catch (err: any) {
      // alert 제거
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEmailVerified) return alert('이메일 인증을 완료해주세요.')
    if (password.length < 8) return alert('비밀번호는 최소 8자 이상이어야 합니다.')
    
    setIsLoading(true)
    try {
      const res = await authApi.signup({ email, password, nickName })
      if (res.statusCode === 201 || res.statusCode === 200) {
        alert('회원가입이 완료되었습니다! 이제 로그인할 수 있습니다.')
        setMode('LOGIN')
      }
    } catch (err: any) {
      // alert 제거
    } finally {
      setIsLoading(false)
    }
  }

  const handleKakaoLogin = () => {
    const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY
    const REDIRECT_URI = `${window.location.origin}/oauth/kakao`
    window.location.href = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_KEY}&redirect_uri=${REDIRECT_URI}&response_type=code`
  }

  const toggleMode = () => {
    setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')
    resetForm()
  }

  const resetForm = () => {
    setEmail(''); setPassword(''); setNickName(''); setVerificationCode('')
    setVerificationId(null)
    setIsEmailChecked(false); setIsEmailVerified(false); setIsCodeSent(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'LOGIN' ? '로그인' : '회원가입'}>
      <form onSubmit={mode === 'LOGIN' ? handleStandardLogin : handleSignup} className="space-y-4">
        {/* 이메일 입력 섹션 */}
        <div className="space-y-2">
          <div className="flex space-x-2">
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="이메일" 
              className={S.input} 
              disabled={isEmailVerified || (mode === 'SIGNUP' && isCodeSent)}
              required 
            />
            {mode === 'SIGNUP' && !isEmailVerified && (
              <button 
                type="button" 
                onClick={checkEmailAndSendCode} 
                disabled={isLoading}
                className="px-4 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold whitespace-nowrap"
              >
                {isCodeSent ? '재전송' : '인증받기'}
              </button>
            )}
          </div>
        </div>

        {/* 인증번호 입력 섹션 (회원가입 시에만) */}
        {mode === 'SIGNUP' && isCodeSent && !isEmailVerified && (
          <div className="flex space-x-2 animate-in fade-in slide-in-from-top-1">
            <input 
              type="text" 
              value={verificationCode} 
              onChange={e => setVerificationCode(e.target.value)} 
              placeholder="인증번호 6자리" 
              className={S.input} 
              required 
            />
            <button 
              type="button" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                verifyCode();
              }} 
              disabled={isLoading}
              className="px-4 bg-[#FFB800] text-white rounded-2xl text-xs font-bold whitespace-nowrap"
            >
              확인
            </button>
          </div>
        )}

        <input 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          placeholder="비밀번호 (8자 이상)" 
          className={S.input} 
          required 
        />
        
        {mode === 'SIGNUP' && (
          <input 
            type="text" 
            value={nickName} 
            onChange={e => setNickName(e.target.value)} 
            placeholder="닉네임" 
            className={S.input} 
            required 
          />
        )}
        
        <button type="submit" disabled={isLoading || (mode === 'SIGNUP' && !isEmailVerified)} className={S.loginButton}>
          {isLoading ? '처리 중...' : (mode === 'LOGIN' ? '로그인' : '회원가입 완료')}
        </button>

        <div className="text-center">
          <button type="button" onClick={toggleMode} className="text-sm text-gray-500 hover:text-[#FFB800] font-medium transition-colors">
            {mode === 'LOGIN' ? '아직 회원이 아니신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
        
        {mode === 'LOGIN' && (
          <>
            <div className={S.dividerWrapper}>
              <div className={S.dividerLine} />
              <div className={S.dividerTextWrapper}><span className={S.dividerText}>또는</span></div>
            </div>

            <button type="button" onClick={handleKakaoLogin} className={S.kakaoButton}>
              <img src="/loginButton/kakao.png" alt="Kakao" className="h-5 object-contain" />
              <span>카카오로 시작하기</span>
            </button>
          </>
        )}
      </form>
    </Modal>
  )
}

const S = {
  input: `
    w-full px-5 py-4 
    bg-gray-50 border-none rounded-2xl 
    focus:ring-2 focus:ring-[#FFB800] 
    outline-none transition-all 
    disabled:opacity-60
  `,

  loginButton: `
    w-full py-4 
    bg-[#FFB800] text-white 
    rounded-2xl font-bold 
    hover:shadow-lg transition-all 
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  dividerWrapper: `
    relative py-2
  `,

  dividerLine: `
    absolute inset-0 flex items-center 
    border-t border-gray-100
  `,

  dividerTextWrapper: `
    relative flex justify-center 
    text-xs uppercase
  `,

  dividerText: `
    bg-white px-2 
    text-gray-400
  `,

  kakaoButton: `
    w-full flex items-center justify-center space-x-2 
    py-3.5 bg-[#FEE500] text-[#191919] 
    rounded-2xl font-bold 
    hover:shadow-md transition-all
  `,
}
