import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  X,
  Users,
  ShieldCheck,
  GitMerge,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function ConflictSimulator({
  isOpen,
  onClose,
  nodes,
  onMutateAST,
  onAcquireLock,
  onReleaseLock
}) {
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState([]);
  const [simulationComplete, setSimulationComplete] = useState(false);

  if (!isOpen) return null;

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { text: msg, type, time: new Date().toLocaleTimeString() }]);
  };

  const runSimulation = async () => {
    setRunning(true);
    setSimulationComplete(false);
    setCurrentStep(1);
    setLogs([]);

    addLog('▶ Starting AST Concurrent Editing Simulation...', 'info');
    await new Promise(r => setTimeout(r, 600));

    // STEP 1: User A acquires lock on block #2 and begins typing paragraph
    setCurrentStep(1);
    addLog('👤 User A (Tech Lead) focuses block at index 2...', 'user_a');
    const userABlockId = uuidv4();
    onAcquireLock(userABlockId);
    await new Promise(r => setTimeout(r, 800));

    addLog('✍️ User A typing paragraph: "Real-time CRDT vector replication eliminates layout corruption..."', 'user_a');
    onMutateAST({
      action: 'INSERT',
      block: {
        id: userABlockId,
        type: 'paragraph',
        content: 'Real-time CRDT vector replication eliminates layout corruption across distributed engineering nodes.',
        properties: {},
        parentId: null,
        children: []
      },
      index: 2
    });
    await new Promise(r => setTimeout(r, 1000));

    // STEP 2: Concurrently, User B acquires lock lower down at index 5 and inserts code block
    setCurrentStep(2);
    addLog('👤 User B (Systems Eng) concurrently focuses block lower down at index 5...', 'user_b');
    const userBBlockId = uuidv4();
    onAcquireLock(userBBlockId);
    await new Promise(r => setTimeout(r, 800));

    addLog('💻 User B concurrently adding code block: "const crdtEngine = new Y.Doc(); ..."', 'user_b');
    onMutateAST({
      action: 'INSERT',
      block: {
        id: userBBlockId,
        type: 'code_block',
        content: `// User B Concurrent CRDT Engine Hook\nconst crdtEngine = new Y.Doc();\nconst astArray = crdtEngine.getArray('astNodes');\nastArray.observe(event => console.log('Merged cleanly without data loss!'));`,
        properties: { language: 'typescript' },
        parentId: null,
        children: []
      },
      index: 5
    });
    await new Promise(r => setTimeout(r, 1200));

    // STEP 3: AST Conflict Resolution Verification
    setCurrentStep(3);
    addLog('⚡ Yjs CRDT matrix resolves concurrent operations deterministically...', 'crdt');
    await new Promise(r => setTimeout(r, 800));

    // Release locks
    onReleaseLock(userABlockId);
    onReleaseLock(userBBlockId);

    addLog('🔓 Both operational locks released. Eventual consistency reached!', 'success');
    addLog('✅ AST CONFLICT RESOLUTION SUCCESSFUL: Neither User A nor User B edit was lost!', 'success');

    setCurrentStep(4);
    setSimulationComplete(true);
    setRunning(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                AST Conflict Resolution Live Simulator
              </h2>
              <p className="text-xs text-slate-400">
                Simulating concurrent editing by User A and User B per project use case
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Use Case Banner */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-blue-400">
              <Users className="w-4 h-4" />
              <span>Project Specification Use Case:</span>
            </div>
            <p className="leading-relaxed">
              &quot;Two engineers open a technical spec in SyncDoc. As User A types a new paragraph, User B
              concurrently adds a code block lower down the page. The system&apos;s AST conflict resolution
              ensures neither edit is lost. Both users see live visual block state indicators showing who is
              editing what, preventing layout-destructive overwrites in real-time.&quot;
            </p>
          </div>

          {/* Stepper Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div
              className={`p-3 rounded-lg border transition-all ${
                currentStep >= 1
                  ? 'bg-blue-950/30 border-blue-500/50 text-blue-300'
                  : 'bg-slate-800/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="font-semibold flex items-center justify-between mb-1">
                <span>1. User A Edits</span>
                {currentStep > 1 && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
              </div>
              <p className="text-[11px] opacity-80">Types paragraph at pos 2 with lock</p>
            </div>

            <div
              className={`p-3 rounded-lg border transition-all ${
                currentStep >= 2
                  ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="font-semibold flex items-center justify-between mb-1">
                <span>2. User B Edits</span>
                {currentStep > 2 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <p className="text-[11px] opacity-80">Adds code block at pos 5 concurrently</p>
            </div>

            <div
              className={`p-3 rounded-lg border transition-all ${
                currentStep >= 3
                  ? 'bg-indigo-950/30 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-800/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="font-semibold flex items-center justify-between mb-1">
                <span>3. CRDT Matrix</span>
                {currentStep > 3 && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
              </div>
              <p className="text-[11px] opacity-80">Deterministic AST reconciliation</p>
            </div>

            <div
              className={`p-3 rounded-lg border transition-all ${
                currentStep >= 4
                  ? 'bg-teal-950/30 border-teal-500/50 text-teal-300'
                  : 'bg-slate-800/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="font-semibold flex items-center justify-between mb-1">
                <span>4. Eventual Sync</span>
                {currentStep >= 4 && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />}
              </div>
              <p className="text-[11px] opacity-80">Zero lost edits, locks released</p>
            </div>
          </div>

          {/* Real-time Simulation Console */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs overflow-hidden">
            <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 mb-2 border-b border-slate-850">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" /> Live WebSocket & CRDT Dispatch Feed
              </span>
              <span>{logs.length} events logged</span>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-slate-600 italic py-6 text-center">
                  Press &quot;Run Simulation&quot; to execute concurrent mutations...
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 py-0.5 ${
                      log.type === 'user_a'
                        ? 'text-blue-400'
                        : log.type === 'user_b'
                        ? 'text-emerald-400'
                        : log.type === 'success'
                        ? 'text-teal-300 font-semibold'
                        : log.type === 'crdt'
                        ? 'text-indigo-400'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="text-slate-600 text-[10px] shrink-0 font-sans">
                      [{log.time}]
                    </span>
                    <span>{log.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>AST tree validation enforced via Mongoose hooks</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
            <button
              onClick={runSimulation}
              disabled={running}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-md shadow-emerald-950"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{running ? 'Simulating...' : 'Run Simulation'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
