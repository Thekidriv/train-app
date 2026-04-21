import React, { useState } from 'react'
import Header from './components/layout/Header'
import BottomNav from './components/layout/BottomNav'
import CalendarHome from './components/calendar/CalendarHome'
import SplitList from './components/splits/SplitList'
import SplitBuilder from './components/splits/SplitBuilder'
import WorkoutSession from './components/logging/WorkoutSession'
import HistoryView from './components/progress/HistoryView'
import ProgressView from './components/progress/ProgressView'
import useAppStore from './store/useAppStore'

export default function App() {
  const { view } = useAppStore()
  const [selectedSplit, setSelectedSplit] = useState(null)

  return (
    <div className="flex flex-col h-screen max-h-screen bg-bg overflow-hidden">
      <Header />
      <main className="flex-1 overflow-hidden flex flex-col">
        {view === 'calendar' && <CalendarHome />}
        {view === 'splits' && (
          selectedSplit
            ? <SplitBuilder split={selectedSplit} onBack={() => setSelectedSplit(null)} />
            : <SplitList onSelect={setSelectedSplit} />
        )}
        {view === 'workout' && <WorkoutSession />}
        {view === 'history' && <HistoryView />}
        {view === 'progress' && <ProgressView />}
      </main>
      <BottomNav />
    </div>
  )
}
