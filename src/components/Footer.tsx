import React from 'react'
import { ExternalLink } from 'lucide-react'

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-3 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs text-gray-300 mb-2">
            Desarrollado por CC 2025
          </p>
          
          <div className="text-xs">
            <p className="text-gray-400 mb-1">BIOWEB® Group:</p>
            <ul className="flex flex-wrap justify-center gap-3 text-gray-300">
              <li>
                <a
                  href="https://www.global.bioweb.co/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                  <span>BIOWEB Global</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.brasil.bioweb.co/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                  <span>BIOWEB Brasil</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </li>
              <li>
                <a
                  href="https://colombia.bioweb.co/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                  <span>BIOWEB Colombia</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
