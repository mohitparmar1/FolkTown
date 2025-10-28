import * as Colyseus from "colyseus.js";

/*================================================
| Object with current online players keyed by sessionId
*/
let onlinePlayers = {};

/*================================================
| Colyseus connection with server
*/
var client = new Colyseus.Client("ws://localhost:3000");

// Start with a safe placeholder Promise so other modules can call room.then(...)
let room = Promise.resolve({
  send: () => {},
  sessionId: null,
  onMessage: () => {},
});

async function joinRoom(wallet) {
  // wallet: string (publicKey) or null
  try {
    room = client.joinOrCreate("folk_town", { wallet });
    const r = await room;
    console.log(r.sessionId, "joined", r.name);
    return r;
  } catch (e) {
    console.log("JOIN ERROR", e && e.message ? e.message : e);
    // keep room as a safe placeholder
    room = Promise.resolve({
      send: () => {},
      sessionId: null,
      onMessage: () => {},
    });
    throw e;
  }
}

export { onlinePlayers, room, joinRoom };
