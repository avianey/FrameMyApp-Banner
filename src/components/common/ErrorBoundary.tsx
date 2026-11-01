import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled UI error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleDownloadDraftBackup = () => {
    try {
      const draft = localStorage.getItem('framemyapp_draft_project');
      if (!draft) return;
      const blob = new Blob([draft], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `framemyapp_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Could not download backup draft:', e);
    }
  };

  private handleResetAndReload = () => {
    try {
      localStorage.removeItem('framemyapp_draft_project');
    } catch {}
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const hasDraft = Boolean(
      typeof window !== 'undefined' && localStorage.getItem('framemyapp_draft_project')
    );

    return (
      <div className="min-h-screen w-full bg-m3-sys-background text-m3-sys-onBackground flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-m3-sys-surfaceContainerHigh border border-m3-sys-outlineVariant/40 rounded-3xl p-6 shadow-m3-3 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-m3-sys-errorContainer text-m3-sys-onErrorContainer flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-rounded text-2xl">error</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-m3-sys-onSurface">
                Une erreur inattendue est survenue
              </h1>
              <p className="text-xs text-m3-sys-onSurfaceVariant">
                L'interface a rencontré un problème lors du rendu.
              </p>
            </div>
          </div>

          {this.state.error && (
            <pre className="p-3 rounded-xl bg-m3-sys-surfaceContainerHighest text-[11px] font-mono text-rose-400 overflow-x-auto max-h-32">
              {this.state.error.message}
            </pre>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="w-full py-2.5 px-4 rounded-xl bg-m3-sys-primary text-m3-sys-onPrimary text-xs font-bold hover:brightness-110 transition-all cursor-pointer"
            >
              Réessayer le rendu
            </button>

            {hasDraft && (
              <button
                onClick={this.handleDownloadDraftBackup}
                className="w-full py-2.5 px-4 rounded-xl bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurface text-xs font-semibold hover:bg-m3-sys-primaryContainer/30 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <span className="material-symbols-rounded text-sm">download</span>
                <span>Télécharger une copie de secours du brouillon</span>
              </button>
            )}

            <button
              onClick={this.handleResetAndReload}
              className="w-full py-2 px-4 rounded-xl border border-m3-sys-outlineVariant/40 text-m3-sys-onSurfaceVariant hover:text-rose-400 text-xs font-medium transition-all cursor-pointer"
            >
              Réinitialiser le brouillon local et recharger
            </button>
          </div>
        </div>
      </div>
    );
  }
}
