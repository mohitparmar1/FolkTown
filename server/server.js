const http = require("http");
const express = require("express");
const cors = require("cors");
const colyseus = require("colyseus");
const { monitor } = require("@colyseus/monitor");
const { FolkTown } = require("./rooms/FolkTown");

const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());


const server = http.createServer(app);
const gameServer = new colyseus.Server({
  server,
});

gameServer
  .define("folk_town", FolkTown, { maxClients: 5 })
  .on("create", (room) =>
    console.log(`✅ Room created: ${room.roomId} (${room.name})`)
  )
  .on("dispose", (room) => console.log(`❌ Room disposed: ${room.roomId}`))
  .on("join", (room, client) =>
    console.log(
      `👥 ${client.id} joined ${room.roomId}. Players: ${room.clients.length}/${room.maxClients}`
    )
  )
  .on("leave", (room, client) =>
    console.log(`👋 ${client.id} left ${room.roomId}`)
  );


app.use("/colyseus", monitor(gameServer));

gameServer.listen(port);
console.log(`🚀 Listening on ws://localhost:${port}`);
