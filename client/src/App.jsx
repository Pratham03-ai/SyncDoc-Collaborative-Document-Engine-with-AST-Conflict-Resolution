import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import Editor from './components/Editor';
import DocumentBrowser from './components/DocumentBrowser';
import ConflictSimulator from './components/ConflictSimulator';
import MarkdownLayoutDiagram from './components/MarkdownLayoutDiagram';
import ExportModal from './components/ExportModal';
import { fetchDocuments, fetchDocument, updateDocument, importMarkdown } from './services/api';
import { CRDTClient } from './services/crdtClient';

const INITIAL_USER = {
  id: 'user_a',
  name: 'User A (Tech Lead)',
  color: '#3b82f6',
  role: 'Lead Architect'
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(INITIAL_USER);
  const [document, setDocument] = useState(null);
  const [activeDocId, setActiveDocId] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [activeLocks, setActiveLocks] = useState(new Map());
  const [presenceList, setPresenceList] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [saving, setSaving] = useState(false);

  // Modals state
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isDiagramOpen, setIsDiagramOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const crdtClientRef = useRef(null);

  // 1. Initial Load: Fetch or seed initial document
  useEffect(() => {
    async function init() {
      try {
        const docs = await fetchDocuments();
        if (docs && docs.length > 0) {
          setActiveDocId(docs[0]._id);
        }
      } catch (err) {
        console.error('Failed to initialize documents:', err);
      }
    }
    init();
  }, []);

  // 2. Connect CRDT WebSocket client when activeDocId or currentUser changes
  useEffect(() => {
    if (!activeDocId) return;

    // Load full document details from DB
    fetchDocument(activeDocId)
      .then(doc => {
        setDocument(doc);
      })
      .catch(err => console.error('Failed to load document metadata:', err));

    // Destroy existing client if any
    if (crdtClientRef.current) {
      crdtClientRef.current.destroy();
    }

    // Initialize new CRDT Client
    const client = new CRDTClient({
      docId: activeDocId,
      user: currentUser,
      onNodesChange: updatedNodes => {
        setNodes(updatedNodes);
      },
      onLocksChange: updatedLocks => {
        setActiveLocks(updatedLocks);
      },
      onPresenceChange: updatedPresence => {
        setPresenceList(updatedPresence);
      },
      onStatusChange: status => {
        setConnectionStatus(status);
      }
    });

    crdtClientRef.current = client;

    return () => {
      client.destroy();
    };
  }, [activeDocId, currentUser]);

  // Actions
  const handleMutateAST = useCallback(mutation => {
    if (crdtClientRef.current) {
      crdtClientRef.current.sendMutation(mutation);
    }
  }, []);

  const handleAcquireLock = useCallback(blockId => {
    if (crdtClientRef.current) {
      crdtClientRef.current.acquireLock(blockId);
    }
  }, []);

  const handleReleaseLock = useCallback(blockId => {
    if (crdtClientRef.current) {
      crdtClientRef.current.releaseLock(blockId);
    }
  }, []);

  const handleSaveDoc = async () => {
    if (!activeDocId) return;
    setSaving(true);
    try {
      if (crdtClientRef.current) {
        crdtClientRef.current.forceSave();
      }
      // Also update metadata
      const updated = await updateDocument(activeDocId, {
        title: document.title,
        description: document.description
      });
      setDocument(updated);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTitleChange = async newTitle => {
    if (!document) return;
    try {
      const updated = await updateDocument(activeDocId, { title: newTitle });
      setDocument(updated);
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  };

  const handleImportMarkdownContent = async markdownText => {
    if (!activeDocId) return;
    try {
      const updated = await importMarkdown(activeDocId, markdownText);
      setDocument(updated);
      if (updated.rootNode?.children) {
        setNodes(updated.rootNode.children);
      }
    } catch (err) {
      console.error('Import failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navbar
        document={document}
        connectionStatus={connectionStatus}
        presenceList={presenceList}
        activeLocks={activeLocks}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        onOpenBrowser={() => setIsBrowserOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenDiagram={() => setIsDiagramOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onSaveDoc={handleSaveDoc}
        onTitleChange={handleTitleChange}
        saving={saving}
      />

      <div className="flex-1">
        <Editor
          document={document}
          nodes={nodes}
          activeLocks={activeLocks}
          currentUser={currentUser}
          onMutateAST={handleMutateAST}
          onAcquireLock={handleAcquireLock}
          onReleaseLock={handleReleaseLock}
        />
      </div>

      {/* Modals */}
      <DocumentBrowser
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        currentDocId={activeDocId}
        onSelectDoc={id => setActiveDocId(id)}
      />

      <ConflictSimulator
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        nodes={nodes}
        onMutateAST={handleMutateAST}
        onAcquireLock={handleAcquireLock}
        onReleaseLock={handleReleaseLock}
      />

      <MarkdownLayoutDiagram
        isOpen={isDiagramOpen}
        onClose={() => setIsDiagramOpen(false)}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        document={document}
        nodes={nodes}
        onImportMarkdown={handleImportMarkdownContent}
      />
    </div>
  );
}
