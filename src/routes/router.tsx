import { createBrowserRouter } from 'react-router-dom'
import MapPage from '../pages/MapPage'
import NotFound from '../pages/NotFound'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MapPage />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
])
