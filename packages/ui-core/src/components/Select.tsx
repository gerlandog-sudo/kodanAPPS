import React, { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Search, Check, X } from 'lucide-react'
import './Select.css'

export interface SelectOption {
  value: string | number
  label: string
  description?: string
  icon?: React.ReactNode
}

export interface SelectProps {
  options: SelectOption[]
  value?: string | number | (string | number)[]
  onChange: (value: any) => void
  placeholder?: string
  searchable?: boolean
  disabled?: boolean
  multiple?: boolean
  className?: string
  id?: string
  error?: string
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchable = false,
  disabled = false,
  multiple = false,
  className = '',
  id,
  error,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const optionsListRef = useRef<HTMLDivElement>(null)

  // Normalizar valor para evitar errores de tipo en las comparaciones
  const selectedValues = useMemo<(string | number)[]>(() => {
    if (value === undefined || value === null) return []
    if (Array.isArray(value)) return value
    return [value]
  }, [value])

  // Filtrar las opciones según el término de búsqueda
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options
    const query = searchQuery.toLowerCase()
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.description && opt.description.toLowerCase().includes(query))
    )
  }, [options, searchQuery])

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-enfocar el input de búsqueda cuando se abre
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
    }
    if (!isOpen) {
      setSearchQuery('')
      setActiveIndex(-1)
    }
  }, [isOpen, searchable])

  // Asegurar que la opción activa sea visible mediante scroll automático
  useEffect(() => {
    if (activeIndex >= 0 && optionsListRef.current) {
      const activeElement = optionsListRef.current.children[activeIndex] as HTMLElement
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [activeIndex])

  const toggleDropdown = () => {
    if (disabled) return
    setIsOpen(!isOpen)
  }

  const handleSelectOption = (option: SelectOption) => {
    if (multiple) {
      const isSelected = selectedValues.includes(option.value)
      const nextValues = isSelected
        ? selectedValues.filter((v) => v !== option.value)
        : [...selectedValues, option.value]
      onChange(nextValues)
    } else {
      onChange(option.value)
      setIsOpen(false)
    }
  }

  const handleRemoveValue = (e: React.MouseEvent, valToRemove: string | number) => {
    e.stopPropagation()
    if (disabled) return
    const nextValues = selectedValues.filter((v) => v !== valToRemove)
    onChange(nextValues)
  }

  // Manejo de eventos de teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1 < filteredOptions.length ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredOptions.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          handleSelectOption(filteredOptions[activeIndex])
        }
        break
      case 'Tab':
        // Permitir tabulación normal y cerrar
        setIsOpen(false)
        break
      default:
        break
    }
  }

  // Encontrar las opciones seleccionadas para renderizar en el gatillo
  const selectedOptions = useMemo(() => {
    return options.filter((opt) => selectedValues.includes(opt.value))
  }, [options, selectedValues])

  return (
    <div className={`select-container ${className}`} ref={containerRef} id={id}>
      <button
        type="button"
        className={`select-trigger ${isOpen ? 'open' : ''} ${error ? 'border-error' : ''}`}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="select-value-container">
          {selectedOptions.length === 0 ? (
            <span className="text-text-muted/60">{placeholder}</span>
          ) : multiple ? (
            selectedOptions.map((opt) => (
              <span key={opt.value} className="select-chip">
                {opt.icon && <span className="select-chip-icon">{opt.icon}</span>}
                <span>{opt.label}</span>
                <button
                  type="button"
                  className="select-chip-remove"
                  onClick={(event) => handleRemoveValue(event, opt.value)}
                  aria-label={`Eliminar ${opt.label}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))
          ) : (
            <span className="select-value-text flex items-center gap-2">
              {selectedOptions[0].icon && <span>{selectedOptions[0].icon}</span>}
              <span>{selectedOptions[0].label}</span>
            </span>
          )}
        </div>
        <span className="select-arrow">
          <ChevronDown size={16} />
        </span>
      </button>

      {isOpen && (
        <div className="select-dropdown" role="listbox">
          {searchable && (
            <div className="select-search-container">
              <Search size={14} className="select-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="select-search-input"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="select-options-list" ref={optionsListRef}>
            {filteredOptions.length === 0 ? (
              <div className="select-empty">Sin resultados</div>
            ) : (
              filteredOptions.map((option, idx) => {
                const isSelected = selectedValues.includes(option.value)
                const isActive = idx === activeIndex
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`select-option ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectOption(option)}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    {option.icon && <span className="select-option-icon">{option.icon}</span>}
                    <div className="select-option-content">
                      <span className="select-option-label">{option.label}</span>
                      {option.description && (
                        <span className="select-option-description">{option.description}</span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="select-option-check">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
      {error && <span className="text-xs text-error mt-1 block">{error}</span>}
    </div>
  )
}
