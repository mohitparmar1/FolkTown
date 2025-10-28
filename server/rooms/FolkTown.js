const colyseus = require("colyseus");

exports.FolkTown = class extends colyseus.Room {
  onCreate(options) {
    console.log("ON CREATE");
    // Use per-room players map instead of module-global
    this.players = {};

    this.onMessage("PLAYER_MOVED", (player, data) => {
      console.log("PLAYER_MOVED", data);

      players[player.sessionId].x = data.x;
      players[player.sessionId].y = data.y;

      this.broadcast(
        "PLAYER_MOVED",
        {
          ...players[player.sessionId],
          position: data.position,
        },
        { except: player }
      );
    });

    this.onMessage("PLAYER_MOVEMENT_ENDED", (player, data) => {
      this.broadcast(
        "PLAYER_MOVEMENT_ENDED",
        {
          sessionId: player.sessionId,
          map: players[player.sessionId].map,
          position: data.position,
        },
        { except: player }
      );
    });

    this.onMessage("PLAYER_CHANGED_MAP", (player, data) => {
      if (!this.players[player.sessionId]) return;
      this.players[player.sessionId].map = data.map;

      player.send("CURRENT_PLAYERS", { players: this.players });

      this.broadcast(
        "PLAYER_CHANGED_MAP",
        {
          sessionId: player.sessionId,
          map: this.players[player.sessionId].map,
          x: 300,
          y: 75,
          players: this.players,
        },
        { except: player }
      );
    });
  }

  requestJoin(options, isNew) {
    // Ensure wallet uniqueness per room (if provided)
    if (options && options.wallet) {
      const duplicate = Object.values(this.players || {}).some(
        (p) => p.wallet && p.wallet === options.wallet
      );
      if (duplicate) return false; // reject join
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
      wallet: options && options.wallet ? options.wallet : null,
    };

    setTimeout(
      () => player.send("CURRENT_PLAYERS", { players: this.players }),
      500
    );
    this.broadcast(
      "PLAYER_JOINED",
      { ...this.players[player.sessionId] },
      { except: player }
    );
  }

  onLeave(player, consented) {
    console.log("ON LEAVE");

    if (this.players[player.sessionId]) {
      this.broadcast("PLAYER_LEFT", {
        sessionId: player.sessionId,
        map: this.players[player.sessionId].map,
      });
      delete this.players[player.sessionId];
    }
  }

  onDispose() {
    console.log("ON DISPOSE");
  }
};
