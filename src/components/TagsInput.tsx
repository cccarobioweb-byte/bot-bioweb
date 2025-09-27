import React, { useState, useRef, useEffect } from 'react'
import { X, Plus } from 'lucide-react'

interface TagsInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  availableTags: string[]
  placeholder?: string
  label?: string
  className?: string
}

const TagsInput: React.FC<TagsInputProps> = ({
  value,
  onChange,
  availableTags,
  placeholder = '',
  label,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [filteredTags, setFilteredTags] = useState<string[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filtrar tags disponibles basado en el input actual
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = availableTags.filter(tag =>
        tag.toLowerCase().includes(inputValue.toLowerCase()) &&
        !value.includes(tag) // No mostrar tags ya seleccionados
      )
      setFilteredTags(filtered)
    } else {
      setFilteredTags(availableTags.filter(tag => !value.includes(tag)))
    }
    setHighlightedIndex(-1)
  }, [inputValue, availableTags, value])

  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setIsOpen(true)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true)
      return
    }

    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && filteredTags[highlightedIndex]) {
          addTag(filteredTags[highlightedIndex])
        } else if (inputValue.trim() && !value.includes(inputValue.trim())) {
          addTag(inputValue.trim())
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredTags.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredTags.length - 1
        )
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
      case 'Backspace':
        if (!inputValue && value.length > 0) {
          removeTag(value[value.length - 1])
        }
        break
    }
  }

  const addTag = (tag: string) => {
    if (tag.trim() && !value.includes(tag.trim())) {
      onChange([...value, tag.trim()])
    }
    setInputValue('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove))
  }

  const handleTagClick = (tag: string) => {
    addTag(tag)
  }

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        {/* Tags existentes */}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {value.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input para agregar nuevos tags */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder={placeholder}
            autoComplete="off"
          />
          
          {inputValue.trim() && !value.includes(inputValue.trim()) && (
            <button
              type="button"
              onClick={() => addTag(inputValue.trim())}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Agregar tag"
            >
              <Plus className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Dropdown con sugerencias */}
        {isOpen && filteredTags.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {filteredTags.map((tag, index) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${
                  index === highlightedIndex ? 'bg-blue-100' : ''
                } ${
                  index === 0 ? 'rounded-t-lg' : ''
                } ${
                  index === filteredTags.length - 1 ? 'rounded-b-lg' : ''
                }`}
              >
                <span className="text-sm text-gray-900">{tag}</span>
              </button>
            ))}
          </div>
        )}

        {isOpen && filteredTags.length === 0 && inputValue.trim() && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
            <p className="text-sm text-gray-500 text-center">
              Presiona Enter para agregar "{inputValue}"
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TagsInput





