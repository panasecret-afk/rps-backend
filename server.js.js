const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // ยอมรับการเชื่อมต่อจากทุกหน้าเว็บ
});

let waitingPlayer = null; // คิวรอจับคู่ผู้เล่นทั่วโลก
const rooms = {};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // ระบบ Quick Match จับคู่ทั่วโลก
  socket.on('find_match', () => {
    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      const roomId = `room_${waitingPlayer.id}_${socket.id}`;
      const player1 = waitingPlayer;
      const player2 = socket;
      waitingPlayer = null;

      rooms[roomId] = { p1: player1.id, p2: player2.id, moves: {} };
      
      player1.join(roomId);
      player2.join(roomId);

      io.to(roomId).emit('match_found', { roomId, players: [player1.id, player2.id] });
    } else {
      waitingPlayer = socket;
      socket.emit('waiting_for_match');
    }
  });

  // รับการเลือก ค้อน/กระดาษ/กรรไกร
  socket.on('make_move', ({ roomId, move }) => {
    const room = rooms[roomId];
    if (room) {
      room.moves[socket.id] = move;

      if (Object.keys(room.moves).length === 2) {
        io.to(roomId).emit('game_result', room.moves);
        room.moves = {}; 
      } else {
        socket.to(roomId).emit('opponent_moved');
      }
    }
  });

  socket.on('disconnect', () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));