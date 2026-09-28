import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import apiRouter from './routes/api.js';
import { CRDTSyncServer } from './services/crdtSync.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'SyncDoc Collaborative Document Engine',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', apiRouter);

// Create HTTP and WebSocket Server
const server = http.createServer(app);
const crdtServer = new CRDTSyncServer(server);

// Route WebSocket Upgrade requests
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname === '/ws') {
    crdtServer.handleUpgrade(request, socket, head);
  } else {
    socket.destroy();
  }
});

// Start Database and Server
async function start() {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 SyncDoc Server running on http://localhost:${PORT}`);
      console.log(`⚡ WebSocket CRDT endpoint active at ws://localhost:${PORT}/ws`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start SyncDoc server:', err);
    process.exit(1);
  }
}

start();

export { app, server };
