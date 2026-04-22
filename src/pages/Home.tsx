import { useCounterStore } from '../store/useCounterStore'
import { Dog, Plus, Minus, RotateCcw } from 'lucide-react'

const Home = () => {
  const { count, increment, decrement, reset } = useCounterStore()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="flex items-center space-x-4">
        <Dog size={48} className="text-blue-500" />
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
          PuppyMap Front Web
        </h1>
      </div>
      
      <p className="text-xl text-gray-600 dark:text-gray-300">
        React + Vite + TypeScript + Tailwind + Zustand + React Router
      </p>

      <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl space-y-6 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center dark:text-white">Counter Store (Zustand)</h2>
        <div className="text-6xl font-bold text-center text-blue-600">
          {count}
        </div>
        
        <div className="flex justify-center space-x-4">
          <button
            onClick={decrement}
            className="p-3 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
          >
            <Minus size={24} />
          </button>
          <button
            onClick={reset}
            className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
          >
            <RotateCcw size={24} />
          </button>
          <button
            onClick={increment}
            className="p-3 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Home
