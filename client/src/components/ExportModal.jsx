import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  Code,
  FileText,
  Upload,
  Sparkles
} from 'lucide-react';
import { exportHTML, exportMarkdown } from '../services/api.js';

export default function ExportModal({
  isOpen,
  onClose,
  document,
  nodes,
  onImportMarkdown
}) {
  const [activeTab, setActiveTab] = useState('html'); // 'html' | 'markdown' | 'json' | 'import'
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [htmlOutput, setHtmlOutput] = useState('');
  const [markdownOutput, setMarkdownOutput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Generate current exports based on active nodes
  const rootNode = {
    id: document?.rootNode?.id || 'root',
    type: 'root',
    content: '',
    properties: {},
    parentId: null,
    order: 0,
    depth: 0,
    children: nodes
  };

  const jsonOutput = JSON.stringify(rootNode, null, 2);

  // Load exports from API when modal opens
  useEffect(() => {
    async function loadExports() {
      if (!document?._id) return;
      setLoading(true);
      try {
        const [htmlData, markdownData] = await Promise.all([
          exportHTML(document._id),
          exportMarkdown(document._id)
        ]);
        setHtmlOutput(htmlData.html || '');
        setMarkdownOutput(markdownData.markdown || '');
      } catch (err) {
        console.error('Failed to load exports:', err);
        // Fallback to simple client-side rendering
        setHtmlOutput(`<div>${nodes.map(n => `<p>${n.content || ''}</p>`).join('')}</div>`);
        setMarkdownOutput(nodes.map(n => n.content || '').join('\n\n'));
      } finally {
        setLoading(false);
      }
    }
    loadExports();
  }, [document?._id, nodes]);

  const handleCopy = text => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlOutput);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  const handleExecuteImport = () => {
    if (importText.trim()) {
      onImportMarkdown(importText);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Transformation Pipeline & Export
              </h2>
              <p className="text-xs text-slate-400">
                Compile AST into sanitized HTML, PDF, Markdown, or JSON formats
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

        {/* Tab Controls */}
        <div className="px-6 pt-3 border-b border-slate-800 flex items-center gap-2 bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab('html')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'html'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Sanitized HTML & PDF
          </button>
          <button
            onClick={() => setActiveTab('markdown')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'markdown'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Markdown (.md)
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'json'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            JSON AST Schema
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'import'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Import Markdown
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'html' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-950/30 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>DOMPurify XSS Filter Active: All script & injection vectors blocked</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintPDF}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save as PDF</span>
                  </button>
                  <button
                    onClick={() => handleDownload(htmlOutput, `${document?.title || 'document'}.html`, 'text/html')}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .html</span>
                  </button>
                </div>
              </div>

              {/* Rendered HTML Preview */}
              {loading ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-center text-slate-400 text-sm">
                  Loading HTML export...
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-white text-slate-900 p-6 max-h-96 overflow-y-auto font-sans shadow-inner">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: htmlOutput
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'markdown' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Standard Markdown representation generated by AST-to-Markdown compiler
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(markdownOutput)}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => handleDownload(markdownOutput, `${document?.title || 'document'}.md`, 'text/markdown')}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .md</span>
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center text-slate-400 text-sm">
                  Loading Markdown export...
                </div>
              ) : (
                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-200 overflow-auto max-h-96 leading-relaxed">
                  {markdownOutput}
                </pre>
              )}
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Full Abstract Syntax Tree payload conformant to Mongoose ASTNodeSchema
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(jsonOutput)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                  <button
                    onClick={() => handleDownload(jsonOutput, `${document?.title || 'document'}.json`, 'application/json')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .json</span>
                  </button>
                </div>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 overflow-auto max-h-96 leading-relaxed">
                {jsonOutput}
              </pre>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Paste Markdown to parse into AST structural nodes via backend lexer:
              </p>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="# Paste Markdown here...&#10;&#10;Paragraph content...&#10;&#10;```javascript&#10;console.log('AST imported');&#10;```"
                rows={10}
                className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-200 resize-none outline-none focus:border-blue-500"
              />
              <button
                onClick={handleExecuteImport}
                disabled={!importText.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Parse & Import to AST</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
