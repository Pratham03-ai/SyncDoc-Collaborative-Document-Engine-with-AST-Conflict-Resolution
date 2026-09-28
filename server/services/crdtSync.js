import * as Y from 'yjs';
import { WebSocketServer, WebSocket } from 'ws';
import { Document } from '../models/Document.js';

/**
 * Room state manager for active collaborative documents.
 */
class DocumentRoom {
  constructor(docId) {
    this.docId = docId;
    this.ydoc = new Y.Doc();
    this.clients = new Map(); // ws -> { userId, userName, userColor, activeBlockId }
    this.blockLocks = new Map(); // blockId -> { userId, userName, userColor, lockedAt, timeoutTimer }
    this.dirty = false;
    this.saveTimeout = null;

    // Root Y.Array for AST nodes
    this.yNodes = this.ydoc.getArray('astNodes');

    // Observe changes to mark dirty for database sync
    this.yNodes.observeDeep(() => {
      this.markDirty();
    });
  }

  markDirty() {
    this.dirty = true;
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    // Debounce save to MongoDB every 3 seconds
    this.saveTimeout = setTimeout(() => {
      this.persistToDatabase();
    }, 3000);
  }

  async persistToDatabase() {
    if (!this.dirty) return;
    this.dirty = false;

    try {
      const doc = await Document.findById(this.docId);
      if (!doc) return;

      const currentNodes = this.yNodes.toArray();
      // Reconstruct root AST node children from CRDT nodes
      if (Array.isArray(currentNodes) && currentNodes.length > 0) {
        doc.rootNode.children = currentNodes.map((n, idx) => ({
          id: n.id,
          type: n.type,
          content: n.content,
          properties: n.properties || {},
          parentId: doc.rootNode.id,
          order: idx,
          depth: 1,
          children: n.children || [],
          lastModifiedBy: n.lastModifiedBy || 'Collaborator'
        }));
      }

      await doc.save();
      console.log(`[CRDT Sync] Persisted document ${this.docId} to MongoDB. Version: ${doc.version}`);
    } catch (err) {
      console.error(`[CRDT Sync] Error persisting document ${this.docId}:`, err.message);
    }
  }

  // Localized Operational Block-Locking
  acquireLock(blockId, userInfo) {
    // Clear any existing timeout for this block
    const existing = this.blockLocks.get(blockId);
    if (existing && existing.timeoutTimer) {
      clearTimeout(existing.timeoutTimer);
    }

    const timer = setTimeout(() => {
      this.releaseLock(blockId, userInfo.userId);
    }, 15000); // 15-second soft lock auto-expiry heartbeat

    this.blockLocks.set(blockId, {
      blockId,
      userId: userInfo.userId,
      userName: userInfo.userName,
      userColor: userInfo.userColor,
      lockedAt: Date.now(),
      timeoutTimer: timer
    });

    this.broadcast({
      type: 'BLOCK_LOCKED',
      blockId,
      user: {
        userId: userInfo.userId,
        userName: userInfo.userName,
        userColor: userInfo.userColor
      }
    });
  }

  releaseLock(blockId, userId) {
    const existing = this.blockLocks.get(blockId);
    if (existing && (existing.userId === userId || !userId)) {
      if (existing.timeoutTimer) {
        clearTimeout(existing.timeoutTimer);
      }
      this.blockLocks.delete(blockId);

      this.broadcast({
        type: 'BLOCK_UNLOCKED',
        blockId,
        userId
      });
    }
  }

  broadcast(message, senderWs = null) {
    const data = JSON.stringify(message);
    for (const [clientWs] of this.clients) {
      if (clientWs !== senderWs && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data);
      }
    }
  }

  getPresenceList() {
    const list = [];
    for (const [, user] of this.clients) {
      list.push(user);
    }
    return list;
  }

  getActiveLocks() {
    const locks = [];
    for (const [blockId, lock] of this.blockLocks) {
      locks.push({
        blockId,
        userId: lock.userId,
        userName: lock.userName,
        userColor: lock.userColor
      });
    }
    return locks;
  }
}

export class CRDTSyncServer {
  constructor(server) {
    this.wss = new WebSocketServer({ noServer: true });
    this.rooms = new Map(); // docId -> DocumentRoom

    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', async (ws, req) => {
      const url = new URL(req.url, 'http://localhost');
      const docId = url.searchParams.get('docId');
      const userId = url.searchParams.get('userId') || `user_${Math.random().toString(36).slice(2, 7)}`;
      const userName = url.searchParams.get('userName') || 'Anonymous Engineer';
      const userColor = url.searchParams.get('userColor') || '#3b82f6';

      if (!docId) {
        ws.close(1008, 'Missing docId query parameter');
        return;
      }

      console.log(`[WS] Client joined room ${docId}: ${userName} (${userId})`);

      let room = this.rooms.get(docId);
      if (!room) {
        room = new DocumentRoom(docId);
        this.rooms.set(docId, room);
        await this.initializeRoomFromDB(room, docId);
      }

      const clientInfo = { userId, userName, userColor, activeBlockId: null };
      room.clients.set(ws, clientInfo);

      // Send initial state to newly connected client
      const plainNodes = room.yNodes.toArray().map(node => {
        const plain = {};
        Object.keys(node).forEach(key => {
          plain[key] = node[key];
        });
        return plain;
      });

      ws.send(
        JSON.stringify({
          type: 'SYNC_INIT',
          docId,
          nodes: plainNodes,
          crdtState: Array.from(Y.encodeStateAsUpdate(room.ydoc)),
          activeLocks: room.getActiveLocks(),
          presence: room.getPresenceList()
        })
      );

      // Notify others of new user presence
      room.broadcast(
        {
          type: 'USER_JOINED',
          user: clientInfo,
          presence: room.getPresenceList()
        },
        ws
      );

      // Message listener
      ws.on('message', async rawData => {
        try {
          const msg = JSON.parse(rawData.toString());

          switch (msg.type) {
            case 'CRDT_APPLY_UPDATE': {
              // Yjs binary update propagation
              if (Array.isArray(msg.update)) {
                const uint8Update = new Uint8Array(msg.update);
                Y.applyUpdate(room.ydoc, uint8Update);

                // Broadcast update to all other room participants
                room.broadcast(
                  {
                    type: 'CRDT_REMOTE_UPDATE',
                    update: msg.update,
                    senderId: userId
                  },
                  ws
                );
              }
              break;
            }

            case 'AST_MUTATION': {
              // Direct AST block operations: insert, update, remove, reorder
              const { action, block, blockId, index, newIndex } = msg;

              room.ydoc.transact(() => {
                if (action === 'INSERT') {
                  const insertIdx = typeof index === 'number' ? index : room.yNodes.length;
                  room.yNodes.insert(insertIdx, [block]);
                } else if (action === 'UPDATE') {
                  const arr = room.yNodes.toArray();
                  const targetIdx = arr.findIndex(n => n.id === blockId);
                  if (targetIdx !== -1) {
                    const existing = arr[targetIdx];
                    const merged = { ...existing, ...block, lastModifiedBy: userName };
                    room.yNodes.delete(targetIdx, 1);
                    room.yNodes.insert(targetIdx, [merged]);
                  }
                } else if (action === 'DELETE') {
                  const arr = room.yNodes.toArray();
                  const targetIdx = arr.findIndex(n => n.id === blockId);
                  if (targetIdx !== -1) {
                    room.yNodes.delete(targetIdx, 1);
                    room.releaseLock(blockId, userId);
                  }
                } else if (action === 'REORDER') {
                  const arr = room.yNodes.toArray();
                  if (index >= 0 && index < arr.length && newIndex >= 0 && newIndex < arr.length) {
                    const [item] = arr.splice(index, 1);
                    arr.splice(newIndex, 0, item);
                    room.yNodes.delete(0, room.yNodes.length);
                    room.yNodes.insert(0, arr);
                  }
                }
              });

              // Broadcast synchronized AST state
              const plainNodes = room.yNodes.toArray().map(node => {
                const plain = {};
                Object.keys(node).forEach(key => {
                  plain[key] = node[key];
                });
                return plain;
              });

              room.broadcast({
                type: 'AST_STATE_UPDATED',
                nodes: plainNodes,
                action,
                blockId,
                actor: { userId, userName }
              });

              // Also send back to sender for immediate ACK
              ws.send(
                JSON.stringify({
                  type: 'AST_STATE_UPDATED',
                  nodes: plainNodes,
                  action,
                  blockId,
                  actor: { userId, userName }
                })
              );
              break;
            }

            case 'ACQUIRE_BLOCK_LOCK': {
              room.acquireLock(msg.blockId, clientInfo);
              clientInfo.activeBlockId = msg.blockId;
              break;
            }

            case 'RELEASE_BLOCK_LOCK': {
              room.releaseLock(msg.blockId, userId);
              if (clientInfo.activeBlockId === msg.blockId) {
                clientInfo.activeBlockId = null;
              }
              break;
            }

            case 'USER_PRESENCE': {
              clientInfo.activeBlockId = msg.activeBlockId;
              room.broadcast(
                {
                  type: 'PRESENCE_UPDATE',
                  userId,
                  activeBlockId: msg.activeBlockId,
                  presence: room.getPresenceList()
                },
                ws
              );
              break;
            }

            case 'FORCE_SAVE': {
              await room.persistToDatabase();
              ws.send(JSON.stringify({ type: 'SAVE_ACK', success: true }));
              break;
            }
          }
        } catch (err) {
          console.error('[WS] Message handling error:', err);
        }
      });

      // Disconnect listener
      ws.on('close', async () => {
        console.log(`[WS] Client left room ${docId}: ${userName} (${userId})`);
        // Release any active locks held by this user
        for (const [blockId, lock] of room.blockLocks) {
          if (lock.userId === userId) {
            room.releaseLock(blockId, userId);
          }
        }

        room.clients.delete(ws);

        room.broadcast({
          type: 'USER_LEFT',
          userId,
          presence: room.getPresenceList()
        });

        // If no clients left, persist document immediately and cleanup
        if (room.clients.size === 0) {
          await room.persistToDatabase();
          this.rooms.delete(docId);
        }
      });
    });
  }

  async initializeRoomFromDB(room, docId) {
    try {
      const doc = await Document.findById(docId);
      if (doc && doc.rootNode && Array.isArray(doc.rootNode.children)) {
        // Deep serialize Mongoose documents to plain objects to avoid circular references
        const cleanChildren = doc.rootNode.children.map(child => {
          const plainChild = child.toObject ? child.toObject() : child;
          return {
            id: plainChild.id,
            type: plainChild.type,
            content: plainChild.content || '',
            properties: plainChild.properties || {},
            parentId: doc.rootNode.id,
            order: plainChild.order,
            depth: plainChild.depth || 1,
            children: plainChild.children || [],
            lastModifiedBy: plainChild.lastModifiedBy || 'Initial'
          };
        });

        room.ydoc.transact(() => {
          room.yNodes.delete(0, room.yNodes.length);
          room.yNodes.insert(0, cleanChildren);
        });
      }
    } catch (err) {
      console.error(`[CRDT Sync] Failed to load doc ${docId} from DB:`, err.message);
    }
  }

  handleUpgrade(request, socket, head) {
    this.wss.handleUpgrade(request, socket, head, ws => {
      this.wss.emit('connection', ws, request);
    });
  }
}
