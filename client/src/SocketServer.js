import * as Colyseus from "colyseus.js";

/*================================================
| Store of current online players keyed by sessionId
*/
let onlinePlayers = {};

/*================================================
| Colyseus connection with backend server
*/
const client = new Colyseus.Client("ws://localhost:3000");

// Safe placeholder room promise
let room = Promise.resolve({
  send: () => {},
  sessionId: null,
  onMessage: () => {},
});

/*================================================
| Function to join or create a room
*/
async function joinRoom(wallet) {
  try {
    // Try joining an existing folk_town room or create a new one if full
    room = client
      .joinOrCreate("folk_town", { wallet })
      .then((r) => {
        console.log(
          `[Colyseus] ✅ Joined room: ${r.roomId} (${r.name}) | session: ${r.sessionId}`
        );

        r.onMessage("playerJoined", (msg) => {
          console.log("📢 New player joined:", msg);
        });

        r.onLeave((code) => {
          console.log(`[Colyseus] ❌ Left room (${r.roomId}), code: ${code}`);
        });

        return r;
      })
      .catch((e) => {
        console.error("[Colyseus] ❗ Join error:", e.message);
        throw e;
      });

    return room;
  } catch (e) {
    console.log("JOIN ERROR", e?.message || e);
    room = Promise.resolve({
      send: () => {},
      sessionId: null,
      onMessage: () => {},
    });
    throw e;
  }
}

export { onlinePlayers, room, joinRoom };
