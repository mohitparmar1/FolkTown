const colyseus = require("colyseus");

exports.FolkTown = class extends colyseus.Room {
  onCreate(options) {
    console.log("ON CREATE");

    // ✅ Define per-room player list
    this.players = {};

    // ✅ Handle player movement
    this.onMessage("PLAYER_MOVED", (player, data) => {
      console.log("PLAYER_MOVED", data);

      const p = this.players[player.sessionId];
      if (!p) return; // safeguard

      p.x = data.x;
      p.y = data.y;

      this.broadcast(
        "PLAYER_MOVED",
        {
          ...p,
          position: data.position,
        },
        { except: player }
      );
    });

    // ✅ Handle movement ended
    this.onMessage("PLAYER_MOVEMENT_ENDED", (player, data) => {
      const p = this.players[player.sessionId];
      if (!p) return;

      this.broadcast(
        "PLAYER_MOVEMENT_ENDED",
        {
          sessionId: player.sessionId,
          map: p.map,
          position: data.position,
        },
        { except: player }
      );
    });

    // ✅ Handle map change
    this.onMessage("PLAYER_CHANGED_MAP", (player, data) => {
      const p = this.players[player.sessionId];
      if (!p) return;

      p.map = data.map;

      // Send all current players to the one who changed map
      player.send("CURRENT_PLAYERS", { players: this.players });

      this.broadcast(
        "PLAYER_CHANGED_MAP",
        {
          sessionId: player.sessionId,
          map: p.map,
          x: 300,
          y: 75,
          players: this.players,
        },
        { except: player }
      );
    });
  }

  requestJoin(options, isNew) {
    // ✅ Prevent duplicate wallets joining same room
    if (options && options.wallet) {
      const duplicate = Object.values(this.players || {}).some(
        (p) => p.wallet && p.wallet === options.wallet
      );
      if (duplicate) return false;
    }
    return true;
  }

  onJoin(player, options) {
    console.log("ON JOIN");

    this.players[player.sessionId] = {
      sessionId: player.sessionId,
      map: "town",
      x: 352,
      y: 1216,
      wallet: options?.wallet || null,
    };

    // Send current players after a short delay
    setTimeout(
      () => player.send("CURRENT_PLAYERS", { players: this.players }),
      500
    );

    // Notify others that a player joined
    this.broadcast(
      "PLAYER_JOINED",
      { ...this.players[player.sessionId] },
      { except: player }
    );
  }

  onLeave(player, consented) {
    console.log("ON LEAVE");

    const p = this.players[player.sessionId];
    if (p) {
      this.broadcast("PLAYER_LEFT", {
        sessionId: player.sessionId,
        map: p.map,
      });
      delete this.players[player.sessionId];
    }
  }

  onDispose() {
    console.log("ON DISPOSE");
  }
};
