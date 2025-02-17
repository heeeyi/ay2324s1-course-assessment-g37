import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();
const PORT = Number(process.env.PORT) || 3111;
const FRONT_END_URL = process.env.FRONT_END_URL ?? "http://127.0.0.1:5173";

const io = new Server(PORT, {
  cors: {
    origin: [FRONT_END_URL, "http://localhost:5173"],
    credentials: true,
  },
});

io.use((socket, next) => {
  console.log("Incoming connection");
  const roomId = socket.handshake["query"]["roomId"];
  if (roomId === undefined || Array.isArray(roomId)) {
    next(new Error("Missing room id"));
  }

  next();
});

io.on("connection", (socket) => {
  console.log(`Connection established with socket id ${socket.id}`);

  // Client sends { query: { roomId: actualRoomId } }
  // Middleware prevents undefined or array value so we typecast
  const room = socket.handshake["query"]["roomId"] as string;

  // Total rooms should be 1 for Peerprep
  socket.join(room);
  console.log(`A user joined room ${room}`);
  console.log(`Total rooms: ${socket.rooms.size - 1}`);

  // emit number of clients in room to ensure room is ready
  io.in(room).emit("room count", io.sockets.adapter.rooms.get(room)?.size);

  // Request for any existing code
  socket.broadcast.to(room).emit("request code", socket.id);
  socket.on("send code", (id, code) => {
    io.to(id).emit("receive code", code);
  });

  // Request for current programming language when user joins room
  socket.broadcast.to(room).emit("request language", socket.id);
  socket.on("send language", (id, code) => {
    io.to(id).emit("receive language", code);
  });

  socket.on("client code changes", (delta) => {
    socket.to(room).emit("server code changes", delta);
  });

  socket.on("client code format", (code) => {
    socket.to(room).emit("server code format", code);
  });

  socket.on("client change language", (language) => {
    socket.to(room).emit("server change language", language);
  });

  // chat events
  socket.on("send message", (text: string, time: string, name: string) => {
    socket.to(room).emit("receive message", text, time, name);
  });

  socket.on("other user has left", () => {
    console.log("Connection terminated because other user has left");
    socket.disconnect();
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit("other user has left", socket.id);
        socket
          .to(room)
          .emit("room count", io.sockets.adapter.rooms.get(room)!.size - 1);
      }
    }
  });

  socket.on("disconnect", (reason) => {
    socket.leave(room);
    console.log(`A user has disconnected because ${reason}`);
  });

  socket.conn.once("upgrade", () => {
    // called when the transport is upgraded (i.e. from HTTP long-polling to WebSocket)
    console.log("upgraded transport", socket.conn.transport.name); // prints "websocket"
  });
});

// Logging
io.engine.on("connection_error", (err) => {
  console.log(err.req); // the request object
  console.log(err.code); // the error code, for example 1
  console.log(err.message); // the error message, for example "Session ID unknown"
  console.log(err.context); // some additional error context
});
