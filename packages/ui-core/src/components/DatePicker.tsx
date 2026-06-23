import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react'
import './DatePicker.css'

export interface DatePickerProps {
  value?: string
  onChange: (value: string) => void
  showTime?: boolean
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  error?: string
  className?: string
  id?: string
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const DAYS_OF_WEEK = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

// Helpers para parseo y formateo local
const parseLocalValue = (valStr?: string): Date | null => {
  if (!valStr) return null
  const parts = valStr.split('T')
  const dateParts = parts[0].split('-')
  if (dateParts.length !== 3) return null
  
  const year = parseInt(dateParts[0], 10)
  const month = parseInt(dateParts[1], 10) - 1
  const day = parseInt(dateParts[2], 10)
  
  let hours = 0
  let minutes = 0
  
  if (parts[1]) {
    const timeParts = parts[1].split(':')
    hours = parseInt(timeParts[0], 10) || 0
    minutes = parseInt(timeParts[1], 10) || 0
  }
  
  return new Date(year, month, day, hours, minutes)
}

const toLocalISOString = (date: Date, showTime: boolean): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  if (showTime) {
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d}T${hh}:${mm}`
  }
  return `${y}-${m}-${d}`
}

const formatFriendly = (date: Date, showTime: boolean): string => {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  if (showTime) {
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hh}:${mm}`
  }
  return `${day}/${month}/${year}`
}

export function DatePicker({
  value,
  onChange,
  showTime = false,
  placeholder,
  disabled = false,
  clearable = true,
  error,
  className = '',
  id,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedDate = useMemo(() => parseLocalValue(value), [value])

  // Fecha de referencia para la vista del calendario
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date())

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hoursScrollRef = useRef<HTMLDivElement>(null)
  const minutesScrollRef = useRef<HTMLDivElement>(null)

  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })

  // Actualizar viewDate al cambiar el valor externo
  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate)
    }
  }, [selectedDate])

  // Cerrar al hacer clic fuera del componente
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

  // Posicionar dinámicamente el dropdown usando fixed
  useEffect(() => {
    if (!isOpen) return

    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setCoords({
          top: rect.bottom,
          left: rect.left,
          width: rect.width,
        })
      }
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  // Scroll automático para horas y minutos seleccionados
  useEffect(() => {
    if (isOpen && showTime && selectedDate) {
      const timer = setTimeout(() => {
        if (hoursScrollRef.current) {
          const activeHour = hoursScrollRef.current.querySelector('.datepicker-time-item.active')
          if (activeHour) {
            activeHour.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }
        }
        if (minutesScrollRef.current) {
          const activeMinute = minutesScrollRef.current.querySelector('.datepicker-time-item.active')
          if (activeMinute) {
            activeMinute.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen, showTime, selectedDate])

  const toggleDropdown = () => {
    if (disabled) return
    setIsOpen(!isOpen)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  }

  const handleSelectDay = (day: number, isCurrentMonth: boolean) => {
    let targetYear = viewDate.getFullYear()
    let targetMonth = viewDate.getMonth()

    if (!isCurrentMonth) {
      // Si hizo clic en un día del mes anterior o siguiente
      const tempDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
      targetYear = tempDate.getFullYear()
      targetMonth = tempDate.getMonth()
    }

    const currentHours = selectedDate ? selectedDate.getHours() : 12
    const currentMinutes = selectedDate ? selectedDate.getMinutes() : 0

    const newDate = new Date(targetYear, targetMonth, day, currentHours, currentMinutes)
    onChange(toLocalISOString(newDate, showTime))
    
    if (!showTime) {
      setIsOpen(false)
    }
  }

  const handleSelectHour = (hour: number) => {
    const baseDate = selectedDate || new Date()
    const newDate = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      hour,
      baseDate.getMinutes()
    )
    onChange(toLocalISOString(newDate, showTime))
  }

  const handleSelectMinute = (minute: number) => {
    const baseDate = selectedDate || new Date()
    const newDate = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      baseDate.getHours(),
      minute
    )
    onChange(toLocalISOString(newDate, showTime))
  }

  const handleSelectToday = () => {
    const now = new Date()
    onChange(toLocalISOString(now, showTime))
    setViewDate(now)
    if (!showTime) {
      setIsOpen(false)
    }
  }

  // Generar celdas del calendario
  const calendarCells = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)
    const dayOfWeek = firstDayOfMonth.getDay()
    // Lunes es primer día
    const startPadding = dayOfWeek === 0 ? 6 : dayOfWeek - 1

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()

    const cells = []

    // Relleno mes anterior
    for (let i = startPadding - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      })
    }

    // Días mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      })
    }

    // Relleno mes siguiente
    const nextPaddingCount = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7)
    for (let i = 1; i <= nextPaddingCount; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      })
    }

    return cells
  }, [viewDate])

  const hoursArray = useMemo(() => Array.from({ length: 24 }, (_, i) => i), [])
  const minutesArray = useMemo(() => Array.from({ length: 60 }, (_, i) => i), [])

  const dropdownMenu = isOpen ? (
    <div
      ref={dropdownRef}
      className={`datepicker-dropdown ${showTime ? 'with-time' : ''}`}
      style={{
        position: 'fixed',
        top: `${coords.top + 4}px`,
        left: `${coords.left}px`,
        zIndex: 99999,
      }}
    >
      <div className="datepicker-layout">
        {/* Sección del Calendario */}
        <div className="datepicker-calendar-section">
          {/* Header */}
          <div className="datepicker-header">
            <button
              type="button"
              className="datepicker-nav-btn"
              onClick={handlePrevMonth}
              aria-label="Mes anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="datepicker-month-year">
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              className="datepicker-nav-btn"
              onClick={handleNextMonth}
              aria-label="Mes siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="datepicker-weekdays">
            {DAYS_OF_WEEK.map((day) => (
              <span key={day} className="datepicker-weekday">
                {day}
              </span>
            ))}
          </div>

          {/* Celdas del calendario */}
          <div className="datepicker-days">
            {calendarCells.map((cell, idx) => {
              const isSelected =
                selectedDate &&
                selectedDate.getDate() === cell.day &&
                selectedDate.getMonth() === cell.date.getMonth() &&
                selectedDate.getFullYear() === cell.date.getFullYear()

              const isToday =
                new Date().getDate() === cell.day &&
                new Date().getMonth() === cell.date.getMonth() &&
                new Date().getFullYear() === cell.date.getFullYear()

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(cell.day, cell.isCurrentMonth)}
                  className={`datepicker-day-btn ${
                    cell.isCurrentMonth ? '' : 'outside-month'
                  } ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          {/* Footer del calendario */}
          <div className="datepicker-footer">
            <button
              type="button"
              className="datepicker-today-btn"
              onClick={handleSelectToday}
            >
              {showTime ? 'Ahora' : 'Hoy'}
            </button>
          </div>
        </div>

        {/* Sección de Selección de Hora */}
        {showTime && (
          <div className="datepicker-time-section">
            <div className="datepicker-time-header">
              <Clock size={12} className="datepicker-time-icon" />
              <span>Hora</span>
            </div>
            
            <div className="datepicker-time-scroll-container">
              {/* Columna Horas */}
              <div
                className="datepicker-time-column scrollbar-none"
                ref={hoursScrollRef}
              >
                <div className="datepicker-time-column-label">H</div>
                {hoursArray.map((hour) => {
                  const isActive = selectedDate && selectedDate.getHours() === hour
                  return (
                    <button
                      key={hour}
                      type="button"
                      className={`datepicker-time-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectHour(hour)}
                    >
                      {String(hour).padStart(2, '0')}
                    </button>
                  )
                })}
              </div>

              {/* Columna Minutos */}
              <div
                className="datepicker-time-column scrollbar-none"
                ref={minutesScrollRef}
              >
                <div className="datepicker-time-column-label">M</div>
                {minutesArray.map((minute) => {
                  const isActive = selectedDate && selectedDate.getMinutes() === minute
                  return (
                    <button
                      key={minute}
                      type="button"
                      className={`datepicker-time-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectMinute(minute)}
                    >
                      {String(minute).padStart(2, '0')}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null

  const displayLabel = selectedDate
    ? formatFriendly(selectedDate, showTime)
    : placeholder || (showTime ? 'Seleccionar fecha y hora...' : 'Seleccionar fecha...')

  return (
    <div className={`datepicker-container ${className}`} ref={containerRef} id={id}>
      <button
        ref={triggerRef}
        type="button"
        className={`datepicker-trigger ${isOpen ? 'open' : ''} ${error ? 'border-error' : ''}`}
        onClick={toggleDropdown}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="datepicker-value-container">
          <Calendar size={14} className="datepicker-trigger-icon" />
          <span className={`datepicker-value-text ${!selectedDate ? 'text-text-muted/60' : ''}`}>
            {displayLabel}
          </span>
        </div>
        
        <div className="datepicker-actions-container">
          {clearable && selectedDate && !disabled && (
            <button
              type="button"
              className="datepicker-clear-btn"
              onClick={handleClear}
              aria-label="Limpiar fecha"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </button>

      {dropdownMenu && createPortal(dropdownMenu, document.body)}
      {error && <span className="text-xs text-error mt-1 block">{error}</span>}
    </div>
  )
}
