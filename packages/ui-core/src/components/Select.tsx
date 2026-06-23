import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const optionsListRef = useRef<HTMLDivElement>(null)

  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })

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

  // Cerrar al hacer clic fuera del componente (tanto gatillo como portal)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const clickedTrigger = containerRef.current?.contains(target)
      const clickedDropdown = dropdownRef.current?.contains(target)
      
      if (!clickedTrigger && !clickedDropdown) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Posicionar dinámicamente el dropdown usando position: fixed con detección de colisiones
  useEffect(() => {
    if (!isOpen) return

    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const dropdownEl = dropdownRef.current
        const dropdownHeight = dropdownEl ? dropdownEl.offsetHeight : 250

        // Margen de seguridad para evitar desbordes
        const spaceBelow = viewportHeight - rect.bottom - 12
        const spaceAbove = rect.top - 12

        let top = rect.bottom + 4 // Por defecto abajo con 4px de separación

        // Si no hay suficiente espacio abajo y hay más espacio arriba, abrir hacia arriba
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          top = rect.top - dropdownHeight - 4
        }

        setCoords({
          top,
          left: rect.left,
          width: rect.width,
        })
      }
    }

    updatePosition()
    
    // Escuchar scroll global en fase de captura (true) para captar scroll dentro de modales o tablas
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    
    // Observar cambios de tamaño en el dropdown para ajustar posición dinámicamente
    let resizeObserver: ResizeObserver | null = null
    if (dropdownRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updatePosition()
      })
      resizeObserver.observe(dropdownRef.current)
    }

    // Intervalo de seguridad por si hay cambios asíncronos en el DOM
    const timer = setTimeout(updatePosition, 0)
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      clearTimeout(timer)
    }
  }, [isOpen, filteredOptions])

  // Mostrar el buscador solo si searchable está activo Y la lista tiene más de 5 opciones
  const showSearch = useMemo(() => {
    return searchable && options.length > 5
  }, [searchable, options])

  // Auto-enfocar el input de búsqueda cuando se abre
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      // Pequeño timeout para asegurar que el portal ya esté en el DOM
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 30)
      return () => clearTimeout(timer)
    }
    if (!isOpen) {
      setSearchQuery('')
      setActiveIndex(-1)
    }
  }, [isOpen, showSearch])

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
      const isSelected = selectedValues.some((v) => String(v) === String(option.value))
      const nextValues = isSelected
        ? selectedValues.filter((v) => String(v) !== String(option.value))
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
    const nextValues = selectedValues.filter((v) => String(v) !== String(valToRemove))
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
        setIsOpen(false)
        break
      default:
        break
    }
  }

  // Encontrar las opciones seleccionadas para renderizar en el gatillo
  const selectedOptions = useMemo(() => {
    return options.filter((opt) => selectedValues.some((v) => String(v) === String(opt.value)))
  }, [options, selectedValues])

  const dropdownMenu = isOpen ? (
    <div
      ref={dropdownRef}
      className="select-dropdown"
      role="listbox"
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: `${Math.max(coords.width, 300)}px`,
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      {showSearch && (
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
            const isSelected = selectedValues.some((v) => String(v) === String(option.value))
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
  ) : null

  return (
    <div className={`select-container ${className}`} ref={containerRef} id={id}>
      <button
        ref={triggerRef}
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

      {dropdownMenu && createPortal(dropdownMenu, document.body)}
      {error && <span className="text-xs text-error mt-1 block">{error}</span>}
    </div>
  )
}
