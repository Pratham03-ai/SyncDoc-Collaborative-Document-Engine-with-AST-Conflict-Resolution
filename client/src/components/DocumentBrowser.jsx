import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  FolderOpen,
  Trash2,
  Clock,
  Code,
  Layers,
  Search,
  Sparkles,
  X
} from 'lucide-react';
import { fetchDocuments, createDocument, deleteDocument } from '../services/api';

export default function DocumentBrowser({
  isOpen,
  onClose,
  currentDocId,
  onSelectDoc
}) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await fetchDocuments();
      setDocs(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async (template = 'blank') => {
    setCreating(true);
    try {
      const title = template === 'technical_spec'
        ? 'Technical Spec: SyncDoc Distributed Engine'
        : 'Untitled Document';
      const created = await createDocument({
        title,
        description: template === 'technical_spec' ? 'Collaborative AST conflict resolution document' : '',
        template
      });
      await loadDocuments();
      onSelectDoc(created._id);
      onClose();
    } catch (err) {
      console.error('Failed to create doc:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await deleteDocument(id);
        setDocs(prev => prev.filter(d => d._id !== id));
      } catch (err) {
        console.error('Failed to delete doc:', err);
      }
    }
  };

  if (!isOpen) return null;

  const filtered = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">SyncDoc Document Browser</h2>
              <p className="text-xs text-slate-400">
                Browse, create, and manage collaborative AST documents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleCreateNew('technical_spec')}
              disabled={creating}
              className="flex-1 sm:flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>New Technical Spec</span>
            </button>
            <button
              onClick={() => handleCreateNew('blank')}
              disabled={creating}
              className="flex-1 sm:flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Blank Doc</span>
            </button>
          </div>
        </div>

        {/* Documents Grid */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              Loading document catalog...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              No documents found. Create one using the buttons above!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(doc => {
                const isCurrent = doc._id === currentDocId;
                return (
                  <div
                    key={doc._id}
                    onClick={() => {
                      onSelectDoc(doc._id);
                      onClose();
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-blue-950/30 border-blue-500/70 ring-1 ring-blue-500/30'
                        : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 ${isCurrent ? 'text-blue-400' : 'text-slate-400'}`} />
                        <h3 className="font-semibold text-slate-200 text-sm truncate max-w-xs">
                          {doc.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded">
                          v{doc.version || 1}
                        </span>
                        <button
                          onClick={e => handleDelete(e, doc._id)}
                          className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {doc.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                        {doc.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {doc.stats?.totalBlocks || 0} blocks
                        </span>
                        <span className="flex items-center gap-1">
                          <Code className="w-3 h-3 text-slate-400" />
                          {doc.stats?.codeBlocks || 0} code
                        </span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
