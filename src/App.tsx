import React, { useState } from 'react'
import { Bot, Settings, MessageSquare } from 'lucide-react'
import ChatPage from './components/ChatPage'
import AdminPage from './components/AdminPage'
import './index.css'

type Page = 'chat' | 'admin'

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('chat')

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3">
              <Bot className="w-8 h-8 text-blue-500" />
              <h1 className="text-xl font-bold text-gray-900">
                ChatBot Productos
              </h1>
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage('chat')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'chat'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat</span>
              </button>
              
              <button
                onClick={() => setCurrentPage('admin')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'admin'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Admin</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="h-[calc(100vh-4rem)]">
        {currentPage === 'chat' ? <ChatPage /> : <AdminPage />}
      </main>
    </div>
  )
}

export default App