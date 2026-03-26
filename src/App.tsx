import { useEffect, useRef, useState, useCallback } from 'react'
import { useApp, useAppStore } from './store'
import Sidebar from './components/Sidebar'
import ProjectView from './views/ProjectView'
import TodayView from './views/TodayView'
import WeekView from './views/WeekView'
import AllTasksView from './views/AllTasksView'
import CalendarView from './views/CalendarView'
import DeletedView from './views/DeletedView'
import SettingsView from './views/SettingsView'

function AppContent() {
  const { state } = useApp()
  const { currentView, settings } = state
  const _init = useAppStore(s => s._init)
  const initError = useAppStore(s => s.initError)

  // Load data from the API layer on mount
  useEffect(() => { _init() }, [_init])

  // Apply theme class to html element
  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [settings.theme])

  // Apply font size
  useEffect(() => {
    const sizes: Record<string, string> = { small: '13px', medium: '14px', large: '16px' }
    document.body.style.fontSize = sizes[settings.fontSize] ?? '14px'
  }, [settings.fontSize])

  const renderView = () => {
    if (currentView === 'today')    return <TodayView />
    if (currentView === 'week')     return <WeekView />
    if (currentView === 'all')      return <AllTasksView />
    if (currentView === 'calendar') return <CalendarView />
    if (currentView === 'deleted')  return <DeletedView />
    if (currentView === 'settings') return <SettingsView />
    if (currentView.startsWith('project:')) {
      return <ProjectView projectId={Number(currentView.replace('project:', ''))} />
    }
    return <TodayView />
  }

  const SIDEBAR_MIN = 180
  const SIDEBAR_MAX = 480
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar-width')
    return saved ? Number(saved) : 336
  })
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - startX.current
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth.current + delta))
      setSidebarWidth(next)
    }
    const onUp = (e: MouseEvent) => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      const delta = e.clientX - startX.current
      const final = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth.current + delta))
      localStorage.setItem('sidebar-width', String(final))
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  if (initError) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center p-8 max-w-md">
          <p className="text-red-500 font-medium mb-2">无法连接到后端服务</p>
          <p className="text-slate-500 text-sm">{initError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900 overflow-hidden">
      <Sidebar width={sidebarWidth} />
      {/* Resize handle */}
      <div
        className="w-1 flex-shrink-0 cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors"
        onMouseDown={onDragStart}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {renderView()}
      </main>
    </div>
  )
}

export default function App() {
  return <AppContent />
}
