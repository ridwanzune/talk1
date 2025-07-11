
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// In-memory store for rooms and socket-to-room mapping
const rooms = {}; // { [roomId]: [{ id, username }] }
const socketToRoom = {}; // { [socketId]: roomId }

const MAX_USERS_PER_ROOM = 2;

// Serve static files from the project root directory
app.use(express.static(path.join(__dirname, '/')));

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join-room', ({ roomId, username }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }

        // Check if the room is full
        if (rooms[roomId].length >= MAX_USERS_PER_ROOM) {
            console.log(`Room ${roomId} is full. Denying entry to ${username} (${socket.id})`);
            socket.emit('room-full');
            return;
        }

        const existingUsers = rooms[roomId];
        
        // Add the new user to the room
        rooms[roomId].push({ id: socket.id, username });
        socketToRoom[socket.id] = roomId;
        socket.join(roomId);

        console.log(`User ${username} (${socket.id}) joined room ${roomId}`);

        // Send the list of existing users to the new user
        socket.emit('all-users', { users: existingUsers });
    });

    socket.on('offer', (payload) => {
        const roomId = socketToRoom[socket.id];
        const room = rooms[roomId];
        const sender = room?.find(user => user.id === socket.id);
        
        if (sender && payload.target) {
            console.log(`Forwarding offer from ${sender.username} (${socket.id}) to ${payload.target}`);
            io.to(payload.target).emit('offer', {
                from: socket.id,
                username: sender.username,
                sdp: payload.sdp
            });
        }
    });

    socket.on('answer', (payload) => {
        if (payload.target) {
            console.log(`Forwarding answer from ${socket.id} to ${payload.target}`);
            io.to(payload.target).emit('answer', {
                from: socket.id,
                sdp: payload.sdp
            });
        }
    });

    socket.on('ice-candidate', (payload) => {
        if (payload.target) {
            console.log(`Forwarding ICE candidate from ${socket.id} to ${payload.target}`);
            io.to(payload.target).emit('ice-candidate', {
                from: socket.id,
                candidate: payload.candidate
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        const roomId = socketToRoom[socket.id];

        if (roomId && rooms[roomId]) {
            // Remove user from the room
            const userIndex = rooms[roomId].findIndex(user => user.id === socket.id);
            if (userIndex !== -1) {
                rooms[roomId].splice(userIndex, 1);
            }

            // Notify remaining users that this user has left
            socket.broadcast.to(roomId).emit('user-left', { id: socket.id });
            
            // If the room is now empty, clean it up
            if (rooms[roomId].length === 0) {
                console.log(`Room ${roomId} is empty and has been deleted.`);
                delete rooms[roomId];
            }
        }
        delete socketToRoom[socket.id];
    });
});

// For any route not handled by static files, serve index.html
// This is important for client-side routing to work on refresh
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on ${port}`);
});
