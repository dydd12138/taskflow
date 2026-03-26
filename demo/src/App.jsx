import { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import ProjectView from './views/ProjectView';
import TodayView from './views/TodayView';
import WeekView from './views/WeekView';
import AllTasksView from './views/AllTasksView';
import CalendarView from './views/CalendarView';
import DeletedView from './views/DeletedView';
import SettingsView from './views/SettingsView';

function AppContent() {
  const { state } = useApp();
  const { currentView, settings } = state;

  // Apply theme class to html element
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Apply font size
  useEffect(() => {
    const sizes = { small: '13px', medium: '14px', large: '16px' };
    document.body.style.fontSize = sizes[settings.fontSize] ?? '14px';
  }, [settings.fontSize]);

  const renderView = () => {
    if (currentView === 'today') return <TodayView />;
    if (currentView === 'week') return <WeekView />;
    if (currentView === 'all') return <AllTasksView />;
    if (currentView === 'calendar') return <CalendarView />;
    if (currentView === 'deleted') return <DeletedView />;
    if (currentView === 'settings') return <SettingsView />;
    if (currentView.startsWith('project:')) {
      return <ProjectView projectId={currentView.replace('project:', '')} />;
    }
    return <TodayView />;
  };

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
