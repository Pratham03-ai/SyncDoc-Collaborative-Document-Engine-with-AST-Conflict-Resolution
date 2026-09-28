import React, { useState } from 'react';
import {
  FileText,
  Users,
  Save,
  Download,
  GitBranch,
  PlayCircle,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye
} from 'lucide-react';

export default function Navbar({
  document,
  connectionStatus,
  presenceList,
  activeLocks,
  currentUser,
  onUserChange,
  onOpenBrowser,
  onOpenSimulator,
  onOpenDiagram,
  onOpenExport,
  onSaveDoc,
  onTitleChange,
  saving
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(document?.title || '');

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && titleInput !== document?.title) {
      onTitleChange(titleInput.trim());
    }
  };

  const usersPreset = [
    { id: 'user_a', name: 'User A (Tech Lead)', color: '#3b82f6', role: 'Lead Architect' },
    { id: 'user_b', name: 'User B (Systems Eng)', color: '#10b981', role: 'Systems Engineer' },
    { id: 'user_c', name: 'User C (Security Eng)', color: '#ef4444', role: 'Security' },
    { id: 'user_d', name: 'User D (Frontend Dev)', color: '#8b5cf6', role: 'Frontend' }
  ];

  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-40 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand & Document Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenBrowser}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-colors text-sm font-medium"
            title="Browse Documents"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Docs</span>
          </button>

          <div className="h-4 w-px bg-slate-800"></div>

          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-blue-500 shrink-0" />
            {isEditingTitle ? (
              <input
                type="text"
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={e => e.key === 'Enter' && handleTitleSubmit()}
                autoFocus
                className="bg-slate-800 text-white font-semibold text-base px-2 py-0.5 rounded border border-blue-500 outline-none w-64"
              />
            ) : (
              <h1
                onClick={() => {
                  setTitleInput(document?.title || '');
                  setIsEditingTitle(true);
                }}
                className="text-base font-semibold text-slate-100 hover:text-blue-400 cursor-pointer truncate max-w-xs md:max-w-md"
                title="Click to rename"
              >
                {document?.title || 'Loading...'}
              </h1>
            )}

            {document?.version && (
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700/60 font-mono">
                v{document.version}
              </span>
            )}
          </div>
        </div>

        {/* Center: Status & Presence Indicators */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700">
            {connectionStatus === 'connected' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-emerald-400 font-medium">CRDT Synced</span>
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-amber-400 font-medium">Connecting...</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-rose-400" />
                <span className="text-rose-400 font-medium">Offline</span>
              </>
            )}
          </div>

          {/* Active Collaborators Presence */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <div className="flex -space-x-1.5 overflow-hidden">
              {presenceList.map((user, idx) => (
                <div
                  key={idx}
                  className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: user.userColor || '#3b82f6' }}
                  title={`${user.userName} (${user.userId})`}
                >
                  {user.userName ? user.userName.charAt(0).toUpperCase() : 'U'}
                </div>
              ))}
            </div>
            <span className="text-xs text-slate-400 font-medium ml-1">
              {presenceList.length} active
            </span>
          </div>

          {/* Active Operational Locks Counter */}
          {activeLocks.size > 0 && (
            <div className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>{activeLocks.size} block{activeLocks.size > 1 ? 's' : ''} locked</span>
            </div>
          )}
        </div>

        {/* Right: User Switcher & Tools */}
        <div className="flex items-center gap-2">
          {/* User Identity Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: currentUser.color }}
            ></span>
            <select
              value={currentUser.id}
              onChange={e => {
                const found = usersPreset.find(u => u.id === e.target.value);
                if (found) onUserChange(found);
              }}
              className="bg-transparent text-slate-200 outline-none cursor-pointer font-medium"
            >
              {usersPreset.map(u => (
                <option key={u.id} value={u.id} className="bg-slate-800 text-slate-200">
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Conflict Simulator Button */}
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm hover:shadow-emerald-950"
            title="Simulate Concurrent User A & User B Edits"
          >
            <PlayCircle className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">AST Conflict Simulator</span>
          </button>

          {/* Layout Diagram Button (Markdown to JSON AST) */}
          <button
            onClick={onOpenDiagram}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition-colors"
            title="View Markdown to AST JSON Layout Diagram"
          >
            <GitBranch className="w-4 h-4" />
            <span className="hidden md:inline">Layout Diagram</span>
          </button>

          {/* Export Button */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
            title="Export HTML, PDF or Markdown"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Save Button */}
          <button
            onClick={onSaveDoc}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </div>
    </header>
  );
}
