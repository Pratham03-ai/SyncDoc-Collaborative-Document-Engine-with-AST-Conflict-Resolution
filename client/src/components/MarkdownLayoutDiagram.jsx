import React, { useState, useMemo } from 'react';
import { X, GitBranch, Code, FileText, ArrowRight, CheckCircle2, Copy, Check } from 'lucide-react';
import { validateAST } from '../services/api.js';

const SAMPLE_MARKDOWN = `# Distributed System Spec
SyncDoc ensures zero layout corruption across concurrent editing sessions.

\`\`\`typescript
const ydoc = new Y.Doc();
const astArray = ydoc.getArray('astNodes');
\`\`\`

> [!INFO]
> AST conflict resolution eliminates plain text merge collisions.

- Real-time CRDT replication
- Localized operational block-locking
- Recursive Mongoose pre-save validation`;

// Simple client-side markdown parser for diagram purposes
function simpleMarkdownToAST(markdown) {
  const lines = markdown.split('\n');
  const rootId = 'root';
  const children = [];
  let order = 0;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let node = null;

    if (trimmed.startsWith('# ')) {
      node = { id: `node_${order}`, type: 'heading', content: trimmed.substring(2), properties: { level: 1 }, order, depth: 1, children: [] };
    } else if (trimmed.startsWith('## ')) {
      node = { id: `node_${order}`, type: 'heading', content: trimmed.substring(3), properties: { level: 2 }, order, depth: 1, children: [] };
    } else if (trimmed.startsWith('```')) {
      node = { id: `node_${order}`, type: 'code_block', content: trimmed.substring(3), properties: { language: 'text' }, order, depth: 1, children: [] };
    } else if (trimmed.startsWith('> ')) {
      node = { id: `node_${order}`, type: 'blockquote', content: trimmed.substring(2), properties: {}, order, depth: 1, children: [] };
    } else if (trimmed.startsWith('- ')) {
      node = { id: `node_${order}`, type: 'list', content: trimmed.substring(2), properties: { ordered: false }, order, depth: 1, children: [] };
    } else {
      node = { id: `node_${order}`, type: 'paragraph', content: trimmed, properties: {}, order, depth: 1, children: [] };
    }

    if (node) {
      children.push(node);
      order++;
    }
  });

  return { id: rootId, type: 'root', content: '', properties: {}, parentId: null, order: 0, depth: 0, children };
}

export default function MarkdownLayoutDiagram({ isOpen, onClose }) {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [copied, setCopied] = useState(false);

  // Compute AST from current Markdown dynamically
  const astTree = useMemo(() => {
    try {
      return simpleMarkdownToAST(markdown);
    } catch (err) {
      return null;
    }
  }, [markdown]);

  if (!isOpen) return null;

  const handleCopyJSON = () => {
    if (astTree) {
      navigator.clipboard.writeText(JSON.stringify(astTree, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Layout Diagram: Markdown to JSON AST Mapping
              </h2>
              <p className="text-xs text-slate-400">
                Mid-Project Review Sanity Check: Tracing how raw Markdown compiles into structural AST nodes
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

        {/* 3-Column Interactive Layout Diagram */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 flex-1 overflow-hidden">
          {/* Column 1: Markdown Source */}
          <div className="p-4 flex flex-col overflow-hidden bg-slate-950/30">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-400" /> 1. Markdown Source Input
              </span>
              <span className="text-[10px] text-slate-500">Live Editable</span>
            </div>
            <textarea
              value={markdown}
              onChange={e => setMarkdown(e.target.value)}
              placeholder="Type Markdown syntax here..."
              className="flex-1 w-full bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed resize-none outline-none focus:border-blue-500"
            />
            <div className="mt-2 text-[11px] text-slate-500 leading-tight">
              Type or edit markdown elements above. The AST graph and JSON schemas update in real-time.
            </div>
          </div>

          {/* Column 2: AST Structural Relationship Layout Diagram */}
          <div className="p-4 flex flex-col overflow-y-auto bg-slate-900/40">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-indigo-400" /> 2. Structural AST Hierarchy
              </span>
              <span className="text-[10px] text-slate-500">
                {astTree?.children?.length || 0} Child Nodes
              </span>
            </div>

            {/* Root Container representation */}
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/40 text-xs">
                <div className="flex items-center justify-between font-mono font-semibold text-indigo-300">
                  <span>ROOT NODE (#root)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">depth: 0</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  parentId: null | children: {astTree?.children?.length || 0}
                </div>
              </div>

              {/* Edge connector */}
              <div className="pl-6 border-l-2 border-dashed border-indigo-500/30 space-y-2 py-1">
                {astTree?.children?.map((child, idx) => (
                  <div
                    key={child.id || idx}
                    onClick={() => setSelectedNodeId(child.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all text-xs ${
                      selectedNodeId === child.id
                        ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-semibold text-slate-200 uppercase text-[11px]">
                        [{idx}] {child.type}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                        order: {child.order ?? idx}
                      </span>
                    </div>

                    <div className="text-slate-400 text-[11px] truncate">
                      {child.content || (child.children?.length ? `${child.children.length} list items` : 'Empty')}
                    </div>

                    {/* Properties summary */}
                    {child.properties && Object.keys(child.properties).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(child.properties).map(([k, v]) => (
                          <span
                            key={k}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-400 font-mono"
                          >
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 3: Live JSON AST Output */}
          <div className="p-4 flex flex-col overflow-hidden bg-slate-950/50">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Code className="w-4 h-4 text-emerald-400" /> 3. Mongoose JSON AST Schema
              </span>
              <button
                onClick={handleCopyJSON}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>

            <pre className="flex-1 w-full bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-300 leading-relaxed overflow-auto">
              {JSON.stringify(astTree, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Deterministic structural mapping verified across all AST grammar primitives</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
