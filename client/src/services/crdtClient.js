import * as Y from 'yjs';

export class CRDTClient {
  constructor({ docId, user, onNodesChange, onLocksChange, onPresenceChange, onStatusChange }) {
    this.docId = docId;
    this.user = user;
    this.onNodesChange = onNodesChange || (() => {});
    this.onLocksChange = onLocksChange || (() => {});
    this.onPresenceChange = onPresenceChange || (() => {});
    this.onStatusChange = onStatusChange || (() => {});

    this.ydoc = new Y.Doc();
    this.yNodes = this.ydoc.getArray('astNodes');
    this.ws = null;
    this.activeLocks = new Map(); // blockId -> lock info
    this.presenceList = [];
    this.nodes = [];
    this.reconnectTimer = null;
    this.isDestroyed = false;

    // Observe local Yjs changes and sync to UI
    this.yNodes.observeDeep(() => {
      this.nodes = this.yNodes.toArray();
      this.onNodesChange([...this.nodes]);
    });

    this.connect();
  }

  connect() {
    if (this.isDestroyed) return;

    this.onStatusChange('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws?docId=${this.docId}&userId=${this.user.id}&userName=${encodeURIComponent(this.user.name)}&userColor=${encodeURIComponent(this.user.color)}`;

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      console.error('[CRDT Client] WebSocket creation failed:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[CRDT Client] Connected to SyncDoc CRDT engine');
      this.onStatusChange('connected');
    };

    this.ws.onmessage = event => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (err) {
        console.error('[CRDT Client] Error parsing WS message:', err);
      }
    };

    this.ws.onclose = () => {
      console.warn('[CRDT Client] Disconnected from server');
      this.onStatusChange('disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = err => {
      console.error('[CRDT Client] WebSocket error:', err);
      this.onStatusChange('error');
    };
  }

  scheduleReconnect() {
    if (this.isDestroyed || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2500);
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'SYNC_INIT': {
        this.nodes = msg.nodes || [];
        this.activeLocks.clear();
        if (Array.isArray(msg.activeLocks)) {
          msg.activeLocks.forEach(lock => this.activeLocks.set(lock.blockId, lock));
        }
        this.presenceList = msg.presence || [];
        
        // Apply initial CRDT state if provided
        if (Array.isArray(msg.crdtState) && msg.crdtState.length > 0) {
          try {
            const uint8Update = new Uint8Array(msg.crdtState);
            Y.applyUpdate(this.ydoc, uint8Update);
          } catch (err) {
            console.error('[CRDT Client] Failed to apply initial CRDT state:', err);
          }
        }
        
        // Initialize local Yjs array with server nodes
        this.ydoc.transact(() => {
          this.yNodes.delete(0, this.yNodes.length);
          this.yNodes.insert(0, this.nodes);
        });
        
        this.onNodesChange([...this.nodes]);
        this.onLocksChange(new Map(this.activeLocks));
        this.onPresenceChange([...this.presenceList]);
        break;
      }

      case 'CRDT_REMOTE_UPDATE': {
        // Apply binary Yjs update from remote clients
        if (Array.isArray(msg.update) && msg.senderId !== this.user.id) {
          try {
            const uint8Update = new Uint8Array(msg.update);
            Y.applyUpdate(this.ydoc, uint8Update);
          } catch (err) {
            console.error('[CRDT Client] Failed to apply remote CRDT update:', err);
          }
        }
        break;
      }

      case 'AST_STATE_UPDATED': {
        this.nodes = msg.nodes || [];
        this.onNodesChange([...this.nodes]);
        break;
      }

      case 'BLOCK_LOCKED': {
        this.activeLocks.set(msg.blockId, {
          blockId: msg.blockId,
          ...msg.user
        });
        this.onLocksChange(new Map(this.activeLocks));
        break;
      }

      case 'BLOCK_UNLOCKED': {
        this.activeLocks.delete(msg.blockId);
        this.onLocksChange(new Map(this.activeLocks));
        break;
      }

      case 'USER_JOINED':
      case 'USER_LEFT':
      case 'PRESENCE_UPDATE': {
        if (Array.isArray(msg.presence)) {
          this.presenceList = msg.presence;
          this.onPresenceChange([...this.presenceList]);
        }
        break;
      }
    }
  }

  sendMutation({ action, block, blockId, index, newIndex }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'AST_MUTATION',
          action,
          block,
          blockId,
          index,
          newIndex
        })
      );
    }
  }

  sendCRDTUpdate() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Encode current Yjs state and send to server
      const update = Y.encodeStateAsUpdate(this.ydoc);
      this.ws.send(
        JSON.stringify({
          type: 'CRDT_APPLY_UPDATE',
          update: Array.from(update)
        })
      );
    }
  }

  acquireLock(blockId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'ACQUIRE_BLOCK_LOCK',
          blockId
        })
      );
    }
  }

  releaseLock(blockId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'RELEASE_BLOCK_LOCK',
          blockId
        })
      );
    }
  }

  sendPresence(activeBlockId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'USER_PRESENCE',
          activeBlockId
        })
      );
    }
  }

  forceSave() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'FORCE_SAVE'
        })
      );
    }
  }

  destroy() {
    this.isDestroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
    }
  }
}
