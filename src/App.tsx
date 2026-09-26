import React from 'react';
import { EditorProvider, useEditor } from './context/EditorContext';
import { Header } from './components/Header';
import { CanvasViewport } from './components/canvas/CanvasViewport';
import { SideDrawer } from './components/drawer/SideDrawer';
import { LeftSidebar } from './components/leftDrawer/LeftSidebar';
import { BottomBar } from './components/BottomBar';
import { Snackbar } from './components/Snackbar';
import { ConfirmModal } from './components/ConfirmModal';
import { BatchExportModal } from './components/modal/BatchExportModal';
import { DocumentationModal } from './components/modal/DocumentationModal';
import { SaveModal } from './components/modal/SaveModal';

export const AppContent: React.FC = () => {
  const { isConfirmModalOpen, setIsConfirmModalOpen, clearAll, isDocOpen, setIsDocOpen } = useEditor();

  return (
    <div className="h-full w-full bg-m3-sys-surface text-m3-sys-onSurface flex flex-col overflow-hidden font-sans">
      <Header />
      <div className="flex-1 relative flex overflow-hidden">
        <LeftSidebar />
        <CanvasViewport />
        <SideDrawer />
      </div>
      <BottomBar />
      <Snackbar />
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={clearAll}
      />
      <SaveModal />
      <BatchExportModal />
      <DocumentationModal
        isOpen={isDocOpen}
        onClose={() => setIsDocOpen(false)}
      />
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
