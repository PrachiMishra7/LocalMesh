const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);

// Serve the static frontend files from the Vite build directory
const frontendPath = path.join(__dirname, '../dist');
app.use(express.static(frontendPath));

// Fallback to index.html for React Router / SPA navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Attach WebSocketServer to the same HTTP server
const wss = new WebSocketServer({ server });

// Map of workspaceId -> Set of WebSocket clients
const workspaces = new Map();

wss.on('connection', (ws) => {
  console.log('New client connected.');

  // The workspace this client belongs to
  let currentWorkspaceId = null;

  ws.on('message', (messageAsString) => {
    try {
      const msg = JSON.parse(messageAsString);
      const { workspaceId, senderId } = msg;

      if (!workspaceId) return;

      // Register the client to the workspace if not already done
      if (currentWorkspaceId !== workspaceId) {
        currentWorkspaceId = workspaceId;
        if (!workspaces.has(workspaceId)) {
          workspaces.set(workspaceId, new Set());
        }
        workspaces.get(workspaceId).add(ws);
        console.log(`Client ${senderId} joined workspace ${workspaceId}`);
      }

      // Broadcast the message to everyone ELSE in the same workspace
      const room = workspaces.get(workspaceId);
      if (room) {
        for (const client of room) {
          if (client !== ws && client.readyState === 1) { // 1 = OPEN
            client.send(messageAsString); // Send the raw string
          }
        }
      }

    } catch (e) {
      console.error('Invalid message format received:', e.message);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected.');
    if (currentWorkspaceId) {
      const room = workspaces.get(currentWorkspaceId);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          workspaces.delete(currentWorkspaceId);
          console.log(`Workspace ${currentWorkspaceId} is now empty and removed.`);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend served from ${frontendPath}`);
});
