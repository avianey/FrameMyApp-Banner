import React from 'react';
import { EditorProvider } from './context/EditorContext';
import { Header } from './components/Header';
import { CanvasViewport } from './components/canvas/CanvasViewport';
import { SideDrawer } from './components/drawer/SideDrawer';
import { BottomBar } from './components/BottomBar';
import { Snackbar } from './components/Snackbar';

export const AppContent: React.FC = () => {
  return (
    <div className="h-full w-full bg-m3-sys-surface text-m3-sys-onSurface flex flex-col overflow-hidden font-sans">
      <Header />
      <div className="flex-1 relative flex overflow-hidden">
        <CanvasViewport />
        <SideDrawer />
      </div>
      <BottomBar />
      <Snackbar />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <EditorProvider>
      <AppContent />
    </EditorProvider>
  );
};

export default App;
