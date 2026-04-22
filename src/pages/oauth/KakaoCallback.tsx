import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { authApi } from '../../services/endpoints/AuthApi'
import { useAuthStore } from '../../store/useAuthStore'

const KakaoCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const login = useAuthStore(state => state.login)
  const hasCalled = useRef(false) // 중복 호출 방지용

  useEffect(() => {
    const code = searchParams.get('code')
    if (code && !hasCalled.current) {
      hasCalled.current = true
      handleKakaoLogin(code)
    }
  }, [searchParams])

  const handleKakaoLogin = async (code: string) => {
    try {
      const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY
      const KAKAO_SECRET = import.meta.env.VITE_KAKAO_CLIENT_SECRET
      const REDIRECT_URI = `${window.location.origin}/oauth/kakao`
      
      console.log('Exchanging code for token...', { REDIRECT_URI })

      const tokenResponse = await axios.post(
        'https://kauth.kakao.com/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: KAKAO_REST_KEY,
          client_secret: KAKAO_SECRET, // 이 부분 추가
          redirect_uri: REDIRECT_URI,
          code: code,
        }),
        {
          headers: {
            'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
        }
      )

      const accessToken = tokenResponse.data.access_token
      console.log('Token exchange success, sending to server...')

      // 2. 발급받은 실제 access_token을 우리 서버로 전송
      const res = await authApi.oauthLogin({
        token: accessToken,
        snsType: 'KAKAO',
        deviceId: 'web-browser',
        pushKey: ''
      })

      if (res.statusCode === 200) {
        const { accessToken, refreshToken, email: userEmail, role } = res.data as any
        login(accessToken, refreshToken, {
          email: userEmail,
          nickName: '카카오 사용자',
          role: role || 'USER'
        })
        navigate('/')
      }
    } catch (err: any) {
      if (err.response) {
        console.error('Kakao API Error Details:', err.response.data)
        alert(`로그인 오류: ${err.response.data.error_description || '알 수 없는 오류'}`)
      } else {
        console.error('Kakao login failed:', err)
        alert('네트워크 오류가 발생했습니다.')
      }
      navigate('/')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFB800]"></div>
      <p className="text-gray-500 font-bold">로그인 정보를 확인 중입니다...</p>
    </div>
  )
}

export default KakaoCallback
