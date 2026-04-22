import { createBrowserRouter } from 'react-router-dom'
import MapPage from '../pages/MapPage'
import KakaoCallback from '../pages/oauth/KakaoCallback'
import NotFound from '../pages/NotFound'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MapPage />,
  },
  {
    path: '/oauth/kakao',
    element: <KakaoCallback />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
])
