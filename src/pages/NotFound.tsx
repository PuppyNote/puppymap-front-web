import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <h1 className="text-9xl font-extrabold text-blue-500 opacity-20">404</h1>
      <h2 className="text-3xl font-bold dark:text-white">Page Not Found</h2>
      <p className="text-gray-500 dark:text-gray-400">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        <Home size={20} />
        <span>Go back home</span>
      </Link>
    </div>
  )
}

export default NotFound
