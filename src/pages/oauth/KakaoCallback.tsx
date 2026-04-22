import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { authApi } from '../../services/endpoints/AuthApi'
import { useAuthStore } from '../../store/useAuthStore'

const KakaoCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const login = useAuthStore(state => state.login)

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      handleKakaoLogin(code)
    }
  }, [searchParams])

  const handleKakaoLogin = async (code: string) => {
    try {
      // 1. 카카오 토큰 API를 통해 code를 access_token으로 교환
      const KAKAO_KEY = import.meta.env.VITE_KAKAO_MAP_API_KEY
      const REDIRECT_URI = `${window.location.origin}/oauth/kakao`
      
      const tokenResponse = await axios.post(
        'https://kauth.kakao.com/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: KAKAO_KEY,
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

      // 2. 발급받은 실제 access_token을 우리 서버로 전송
      const res = await authApi.oauthLogin({
        token: accessToken,
        snsType: 'KAKAO',
        deviceId: 'web-browser',
        pushKey: ''
      })

      if (res.statusCode === 200) {
        login(res.data.accessToken, res.data.refreshToken, {
          email: res.data.email,
          nickName: '카카오 사용자'
        })
        navigate('/')
      }
    } catch (err) {
      console.error('Kakao login failed:', err)
      alert('로그인에 실패했습니다.')
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
