import React, { memo, useRef, useEffect, useState } from 'react';
import {
  Code,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlertTriangle,
  Info,
  CheckSquare,
  Square,
  Quote,
  Minus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Lock,
  MoreVertical,
  Check
} from 'lucide-react';

const ASTBlock = memo(function ASTBlock({
  node,
  index,
  totalCount,
  isLockedByOther,
  lockHolder,
  isFocusedByMe,
  onUpdate,
  onDelete,
  onInsertBelow,
  onMoveUp,
  onMoveDown,
  onFocus,
  onBlur,
  currentUser
}) {
  const textareaRef = useRef(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [localContent, setLocalContent] = useState(node.content || '');

  // Keep local content in sync when incoming remote CRDT changes arrive
  useEffect(() => {
    setLocalContent(node.content || '');
  }, [node.content]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 38)}px`;
    }
  }, [localContent, node.type]);

  const handleContentChange = e => {
    const val = e.target.value;
    setLocalContent(val);
    onUpdate(node.id, { content: val });
  };

  const handleTypeChange = newType => {
    setShowTypeMenu(false);
    let properties = { ...node.properties };

    if (newType.startsWith('heading-')) {
      const level = parseInt(newType.split('-')[1], 10);
      onUpdate(node.id, {
        type: 'heading',
        properties: { ...properties, level }
      });
      return;
    }

    if (newType === 'code_block' && !properties.language) {
      properties.language = 'javascript';
    }
    if (newType === 'callout' && !properties.calloutType) {
      properties.calloutType = 'info';
    }

    onUpdate(node.id, {
      type: newType,
      properties
    });
  };

  const handleLanguageChange = lang => {
    onUpdate(node.id, {
      properties: { ...node.properties, language: lang }
    });
  };

  const handleCalloutTypeChange = calloutType => {
    onUpdate(node.id, {
      properties: { ...node.properties, calloutType }
    });
  };

  const handleCheckboxToggle = () => {
    onUpdate(node.id, {
      properties: { ...node.properties, checked: !node.properties?.checked }
    });
  };

  // Determine border and lock styling
  const lockBorderColor = isLockedByOther ? lockHolder?.userColor || '#ef4444' : null;

  return (
    <div
      className={`group relative rounded-xl transition-all duration-200 p-2 sm:p-3 my-2 border ${
        isLockedByOther
          ? 'bg-slate-900/60 shadow-lg ring-1'
          : isFocusedByMe
          ? 'bg-slate-800/80 border-blue-500/70 shadow-md ring-1 ring-blue-500/30'
          : 'bg-slate-900/40 hover:bg-slate-800/40 border-slate-800/80 hover:border-slate-700/80'
      }`}
      style={{
        borderColor: lockBorderColor || undefined,
        ringColor: lockBorderColor || undefined
      }}
    >
      {/* Visual Block State Indicator (Collaborator Lock Banner) */}
      {isLockedByOther && lockHolder && (
        <div
          className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-md z-20 border animate-lock-pulse"
          style={{
            backgroundColor: `${lockHolder.userColor}20`,
            color: lockHolder.userColor,
            borderColor: `${lockHolder.userColor}60`
          }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: lockHolder.userColor }}
          ></span>
          <span>{lockHolder.userName} is editing...</span>
          <Lock className="w-3 h-3 ml-0.5 opacity-80" />
        </div>
      )}

      {/* Block Header Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-1.5 text-xs text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1.5">
          {/* Block Type Badge & Selector */}
          <div className="relative">
            <button
              onClick={() => setShowTypeMenu(!showTypeMenu)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700/60 transition-colors"
              title="Change Block Type"
            >
              {node.type === 'heading' && (
                <>
                  <span className="font-bold text-blue-400">H{node.properties?.level || 1}</span>
                  <span>Heading</span>
                </>
              )}
              {node.type === 'paragraph' && (
                <>
                  <AlignLeft className="w-3 h-3 text-slate-400" />
                  <span>Paragraph</span>
                </>
              )}
              {node.type === 'code_block' && (
                <>
                  <Code className="w-3 h-3 text-amber-400" />
                  <span>Code Block</span>
                </>
              )}
              {node.type === 'callout' && (
                <>
                  <AlertTriangle className="w-3 h-3 text-yellow-400" />
                  <span>Callout</span>
                </>
              )}
              {node.type === 'blockquote' && (
                <>
                  <Quote className="w-3 h-3 text-indigo-400" />
                  <span>Blockquote</span>
                </>
              )}
              {node.type === 'list' && (
                <>
                  <CheckSquare className="w-3 h-3 text-emerald-400" />
                  <span>List / Tasks</span>
                </>
              )}
              {node.type === 'divider' && (
                <>
                  <Minus className="w-3 h-3 text-slate-400" />
                  <span>Divider</span>
                </>
              )}
              <MoreVertical className="w-2.5 h-2.5 ml-0.5 opacity-60" />
            </button>

            {/* Type Switcher Dropdown */}
            {showTypeMenu && (
              <div className="absolute left-0 top-full mt-1 w-44 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-30 text-xs">
                <button
                  onClick={() => handleTypeChange('paragraph')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-700/70 flex items-center gap-2 text-slate-200"
                >
                  <AlignLeft className="w-3.5 h-3.5 text-slate-400" /> Paragraph
                </button>
                <button
                  onClick={() => handleTypeChange('heading-1')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-700/70 flex items-center gap-2 text-slate-200"
                >
                  <Heading1 className="w-3.5 h-3.5 text-blue-400" /> Heading 1
                </button>
                <button
                  onClick={() => handleTypeChange('heading-2')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-700/70 flex items-center gap-2 text-slate-200"
                >
                  <Heading2 className="w-3.5 h-3.5 text-blue-400" /> Heading 2
                </button>
                <button
                  onClick={() => handleTypeChange('heading-3')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-700/70 flex items-center gap-2 text-slate-200"
                >
                  <Heading3 className="w-3.5 h-3.5 text-blue-400" /> Heading 3
                </button>
                <button
                  onClick={() => handleTypeChange('code_block')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-700/70 flex items-center gap-2 text-slate-200"
                >
                  <Code className="w-3.5 h-3.5 text-amber-400" /> Code Block
                </button>
                <button
                  onClick={() => handleTypeChange('callout')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-700/70 flex items-center gap-2 text-slate-200"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" /> Callout Banner
                </button>
                <button
                  onClick={() => handleTypeChange('blockquote')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-700/70 flex items-center gap-2 text-slate-200"
                >
                  <Quote className="w-3.5 h-3.5 text-indigo-400" /> Blockquote
                </button>
                <button
                  onClick={() => handleTypeChange('divider')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-700/70 flex items-center gap-2 text-slate-200"
                >
                  <Minus className="w-3.5 h-3.5 text-slate-400" /> Divider
                </button>
              </div>
            )}
          </div>

          {/* Code Block Language Selector */}
          {node.type === 'code_block' && (
            <select
              value={node.properties?.language || 'javascript'}
              onChange={e => handleLanguageChange(e.target.value)}
              className="bg-slate-800 text-amber-300 font-mono text-[11px] px-2 py-0.5 rounded border border-slate-700 outline-none cursor-pointer"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="json">JSON</option>
              <option value="rust">Rust</option>
              <option value="go">Go</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="sql">SQL</option>
            </select>
          )}

          {/* Callout Type Selector */}
          {node.type === 'callout' && (
            <select
              value={node.properties?.calloutType || 'info'}
              onChange={e => handleCalloutTypeChange(e.target.value)}
              className="bg-slate-800 text-slate-300 text-[11px] px-2 py-0.5 rounded border border-slate-700 outline-none cursor-pointer uppercase font-semibold"
            >
              <option value="info">INFO</option>
              <option value="warning">WARNING</option>
              <option value="tip">TIP</option>
              <option value="danger">DANGER</option>
            </select>
          )}

          {/* AST Node ID Tag */}
          <span className="font-mono text-[10px] text-slate-500 hidden sm:inline">
            #{node.id?.slice(0, 6)}
          </span>
        </div>

        {/* Right Action Icons (Reorder, Insert, Delete) */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Move Up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === totalCount - 1}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Move Down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onInsertBelow(index)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-blue-400"
            title="Insert Block Below"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(node.id)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
            title="Delete Block"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Block Body Content Rendering */}
      <div className="mt-1">
        {node.type === 'heading' && (
          <textarea
            ref={textareaRef}
            value={localContent}
            onChange={handleContentChange}
            onFocus={() => onFocus(node.id)}
            onBlur={() => onBlur(node.id)}
            placeholder={`Heading ${node.properties?.level || 1}...`}
            rows={1}
            className={`w-full bg-transparent resize-none outline-none font-bold text-slate-100 ${
              node.properties?.level === 1
                ? 'text-2xl sm:text-3xl text-blue-400'
                : node.properties?.level === 2
                ? 'text-xl sm:text-2xl text-slate-100'
                : 'text-lg sm:text-xl text-slate-200'
            }`}
          />
        )}

        {node.type === 'paragraph' && (
          <textarea
            ref={textareaRef}
            value={localContent}
            onChange={handleContentChange}
            onFocus={() => onFocus(node.id)}
            onBlur={() => onBlur(node.id)}
            placeholder="Type your paragraph here..."
            rows={1}
            className="w-full bg-transparent resize-none outline-none text-slate-200 leading-relaxed text-sm sm:text-base font-normal placeholder:text-slate-600"
          />
        )}

        {node.type === 'code_block' && (
          <div className="rounded-lg bg-slate-950 border border-slate-800 overflow-hidden mt-1 shadow-inner">
            <div className="bg-slate-900/90 px-3 py-1 text-[11px] font-mono text-slate-400 flex items-center justify-between border-b border-slate-800">
              <span>{node.properties?.language || 'javascript'}</span>
              <span className="text-[10px] text-slate-500">CRDT Synced</span>
            </div>
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={handleContentChange}
              onFocus={() => onFocus(node.id)}
              onBlur={() => onBlur(node.id)}
              placeholder="// Write code snippet here..."
              rows={3}
              spellCheck={false}
              className="w-full bg-slate-950 p-3 text-slate-200 font-mono text-xs sm:text-sm leading-relaxed resize-none outline-none selection:bg-blue-600/40"
            />
          </div>
        )}

        {node.type === 'callout' && (
          <div
            className={`rounded-lg p-3 border mt-1 ${
              node.properties?.calloutType === 'warning'
                ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                : node.properties?.calloutType === 'tip'
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                : node.properties?.calloutType === 'danger'
                ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                : 'bg-blue-950/20 border-blue-500/40 text-blue-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-1 text-xs font-bold uppercase tracking-wider">
              {node.properties?.calloutType === 'warning' ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <Info className="w-3.5 h-3.5" />
              )}
              <span>{node.properties?.calloutType || 'INFO'}</span>
            </div>
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={handleContentChange}
              onFocus={() => onFocus(node.id)}
              onBlur={() => onBlur(node.id)}
              placeholder="Enter callout text..."
              rows={1}
              className="w-full bg-transparent resize-none outline-none text-xs sm:text-sm leading-relaxed text-inherit"
            />
          </div>
        )}

        {node.type === 'blockquote' && (
          <div className="border-l-4 border-indigo-500 pl-3 py-1 italic bg-indigo-950/10 rounded-r-lg">
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={handleContentChange}
              onFocus={() => onFocus(node.id)}
              onBlur={() => onBlur(node.id)}
              placeholder="Enter quotation..."
              rows={1}
              className="w-full bg-transparent resize-none outline-none text-slate-300 text-sm sm:text-base font-normal italic"
            />
          </div>
        )}

        {node.type === 'list' && (
          <div className="space-y-1.5 my-1">
            {/* If node has children list items */}
            {Array.isArray(node.children) && node.children.length > 0 ? (
              node.children.map((item, itemIdx) => (
                <div key={item.id || itemIdx} className="flex items-center gap-2 text-sm text-slate-200 pl-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                  <span>{item.content}</span>
                </div>
              ))
            ) : (
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={handleCheckboxToggle}
                  className="mt-0.5 text-blue-400 hover:text-blue-300 shrink-0"
                >
                  {node.properties?.checked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500" />
                  )}
                </button>
                <textarea
                  ref={textareaRef}
                  value={localContent}
                  onChange={handleContentChange}
                  onFocus={() => onFocus(node.id)}
                  onBlur={() => onBlur(node.id)}
                  placeholder="Task description or list item..."
                  rows={1}
                  className={`w-full bg-transparent resize-none outline-none text-sm text-slate-200 ${
                    node.properties?.checked ? 'line-through text-slate-500' : ''
                  }`}
                />
              </div>
            )}
          </div>
        )}

        {node.type === 'divider' && (
          <div className="py-2">
            <hr className="border-t border-slate-700/80" />
          </div>
        )}
      </div>
    </div>
  );
});

export default ASTBlock;
