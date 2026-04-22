import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
      // 주의: 현재 API 명세에는 'token'을 보내라고 되어 있습니다.
      // 보통은 프론트에서 받은 'code'를 보내거나, 프론트에서 토큰으로 교환해서 보냅니다.
      // 여기서는 서버가 code를 처리한다고 가정하거나, 필요 시 토큰 교환 로직이 추가되어야 합니다.
      const res = await authApi.oauthLogin({
        token: code, // 서버에서 code를 받아 토큰으로 교환하는 로직이 구현되어 있다면 code를 그대로 전달
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
      <p className="text-gray-500 font-bold">카카오 로그인 중입니다...</p>
    </div>
  )
}

export default KakaoCallback
