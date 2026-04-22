import { RouterProvider } from 'react-router-dom'
import { router } from './routes/router'

function App() {
  return (
    <div className="w-full h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <RouterProvider router={router} />
    </div>
  )
}

export default App
