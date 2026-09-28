import React, { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ASTBlock from './ASTBlock';
import {
  Plus,
  Heading,
  AlignLeft,
  Code,
  AlertCircle,
  Quote,
  CheckSquare,
  Minus,
  Sparkles
} from 'lucide-react';

export default function Editor({
  document,
  nodes,
  activeLocks,
  currentUser,
  onMutateAST,
  onAcquireLock,
  onReleaseLock
}) {
  const handleUpdateBlock = useCallback(
    (blockId, partialUpdate) => {
      onMutateAST({
        action: 'UPDATE',
        blockId,
        block: partialUpdate
      });
    },
    [onMutateAST]
  );

  const handleDeleteBlock = useCallback(
    blockId => {
      onMutateAST({
        action: 'DELETE',
        blockId
      });
    },
    [onMutateAST]
  );

  const handleInsertBelow = useCallback(
    (index, type = 'paragraph', properties = {}) => {
      const newBlock = {
        id: uuidv4(),
        type,
        content: '',
        properties,
        parentId: document?.rootNode?.id || null,
        children: []
      };

      onMutateAST({
        action: 'INSERT',
        block: newBlock,
        index: index + 1
      });
    },
    [onMutateAST, document]
  );

  const handleMoveUp = useCallback(
    index => {
      if (index > 0) {
        onMutateAST({
          action: 'REORDER',
          index,
          newIndex: index - 1
        });
      }
    },
    [onMutateAST]
  );

  const handleMoveDown = useCallback(
    index => {
      if (index < nodes.length - 1) {
        onMutateAST({
          action: 'REORDER',
          index,
          newIndex: index + 1
        });
      }
    },
    [onMutateAST, nodes.length]
  );

  const handleFocus = useCallback(
    blockId => {
      onAcquireLock(blockId);
    },
    [onAcquireLock]
  );

  const handleBlur = useCallback(
    blockId => {
      onReleaseLock(blockId);
    },
    [onReleaseLock]
  );

  // Compute live metrics
  const totalBlocks = nodes.length;
  const wordCount = nodes.reduce((acc, n) => {
    if (typeof n.content === 'string' && n.content.trim()) {
      return acc + n.content.trim().split(/\s+/).length;
    }
    return acc;
  }, 0);
  const codeBlocksCount = nodes.filter(n => n.type === 'code_block').length;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 pb-32">
      {/* Document Subtitle / Description */}
      {document?.description && (
        <div className="mb-6 pb-4 border-b border-slate-800 text-sm text-slate-400">
          <p>{document.description}</p>
        </div>
      )}

      {/* AST Block List */}
      <div className="space-y-1">
        {nodes.map((node, index) => {
          const lock = activeLocks.get(node.id);
          const isLockedByOther = Boolean(lock && lock.userId !== currentUser.id);
          const isFocusedByMe = Boolean(lock && lock.userId === currentUser.id);

          return (
            <ASTBlock
              key={node.id}
              node={node}
              index={index}
              totalCount={nodes.length}
              isLockedByOther={isLockedByOther}
              lockHolder={lock}
              isFocusedByMe={isFocusedByMe}
              onUpdate={handleUpdateBlock}
              onDelete={handleDeleteBlock}
              onInsertBelow={idx => handleInsertBelow(idx, 'paragraph')}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              currentUser={currentUser}
            />
          );
        })}

        {nodes.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-xl">
            <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-2 opacity-60" />
            <h3 className="text-base font-semibold text-slate-300">Document is empty</h3>
            <p className="text-xs text-slate-500 mt-1">Add your first block to start collaborating</p>
          </div>
        )}
      </div>

      {/* Bottom Block Insertion Toolbar */}
      <div className="mt-8 pt-6 border-t border-slate-800/80">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Add AST Node to Document:
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleInsertBelow(nodes.length - 1, 'paragraph')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            <AlignLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>Paragraph</span>
          </button>
          <button
            onClick={() => handleInsertBelow(nodes.length - 1, 'heading', { level: 2 })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            <Heading className="w-3.5 h-3.5 text-indigo-400" />
            <span>Heading 2</span>
          </button>
          <button
            onClick={() => handleInsertBelow(nodes.length - 1, 'code_block', { language: 'typescript' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            <Code className="w-3.5 h-3.5 text-amber-400" />
            <span>Code Block</span>
          </button>
          <button
            onClick={() => handleInsertBelow(nodes.length - 1, 'callout', { calloutType: 'info' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Callout</span>
          </button>
          <button
            onClick={() => handleInsertBelow(nodes.length - 1, 'blockquote')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            <Quote className="w-3.5 h-3.5 text-purple-400" />
            <span>Blockquote</span>
          </button>
          <button
            onClick={() => handleInsertBelow(nodes.length - 1, 'list')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5 text-teal-400" />
            <span>Checklist</span>
          </button>
          <button
            onClick={() => handleInsertBelow(nodes.length - 1, 'divider')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            <Minus className="w-3.5 h-3.5 text-slate-400" />
            <span>Divider</span>
          </button>
        </div>
      </div>

      {/* Floating Status Bar / Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur border-t border-slate-800 py-2 px-4 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span>
              Blocks: <strong className="text-slate-200">{totalBlocks}</strong>
            </span>
            <span>
              Words: <strong className="text-slate-200">{wordCount}</strong>
            </span>
            <span>
              Code Blocks: <strong className="text-slate-200">{codeBlocksCount}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
              Sync Engine: Yjs CRDT + Mongoose Hooks
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          </div>
        </div>
      </footer>
    </main>
  );
}
