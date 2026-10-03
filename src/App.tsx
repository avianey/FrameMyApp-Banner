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
import { ExportPreviewModal } from './components/modal/ExportPreviewModal';
import { SaveModal } from './components/modal/SaveModal';
import { DiskPermissionModal } from './components/modal/DiskPermissionModal';

export const AppContent: React.FC = () => {
  const {
    isConfirmModalOpen,
    setIsConfirmModalOpen,
    clearAll,
    isPermissionModalOpen,
    permissionTargetName,
    permissionDetectedAssets,
    permissionTitle,
    permissionConfirmLabel,
    permissionCancelLabel,
    permissionErrorMessage,
    isSuggestedBlocked,
    authorizeDiskAccess,
    dismissDiskAccessAndStartNew,
    abortPendingImport
  } = useEditor();

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
      <ExportPreviewModal />
      <DiskPermissionModal
        isOpen={isPermissionModalOpen}
        targetName={permissionTargetName}
        detectedAssets={permissionDetectedAssets}
        title={permissionTitle}
        confirmLabel={permissionConfirmLabel}
        cancelLabel={permissionCancelLabel}
        errorMessage={permissionErrorMessage}
        onAuthorize={authorizeDiskAccess}
        onNewDocument={dismissDiskAccessAndStartNew}
        onAbortImport={abortPendingImport}
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
