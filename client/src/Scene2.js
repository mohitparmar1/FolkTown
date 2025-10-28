import Phaser from "phaser";
import { onlinePlayers, room } from "./SocketServer";

import OnlinePlayer from "./OnlinePlayer";
import Player from "./Player";
import Enemy from "./Enemy";
import { isWalletConnected } from "./wallet";

let cursors, socketKey;

export class Scene2 extends Phaser.Scene {
  constructor() {
    super("playGame");
  }

  // Helper function to safely send room messages
  sendRoomMessage(event, data) {
    room.then((roomInstance) => {
      if (roomInstance && roomInstance.send) {
        roomInstance.send(event, data);
      }
    });
  }

  init(data) {
    // Map data
    this.mapName = data.map;

    // Player Texture starter position
    this.playerTexturePosition = data.playerTexturePosition;

    // Set container
    this.container = [];

    // Game session properties
    this.enemies = [];
    this.enemySpawnTimer = 0;
    this.enemySpawnDelay = 10000; // 10 seconds in milliseconds
    this.enemiesCanSpawn = false;
    this.sessionDuration = 300000; // 5 minutes in milliseconds
    this.sessionTimer = 0;
    this.sessionActive = true;
    this.kills = 0; // Player's kill count
    this.playerStats = { kills: 0 };
  }

  create() {
    room.then((roomInstance) => {
      if (roomInstance && roomInstance.onMessage) {
        roomInstance.onMessage((data) => {
          if (data.event === "CURRENT_PLAYERS") {
            console.log("CURRENT_PLAYERS");

            Object.keys(data.players).forEach((playerId) => {
              let player = data.players[playerId];

              if (playerId !== room.sessionId) {
                onlinePlayers[player.sessionId] = new OnlinePlayer({
                  scene: this,
                  playerId: player.sessionId,
                  key: player.sessionId,
                  map: player.map,
                  x: player.x,
                  y: player.y,
                });
              }
            });
          }
          if (data.event === "PLAYER_JOINED") {
            console.log("PLAYER_JOINED");

            if (!onlinePlayers[data.sessionId]) {
              onlinePlayers[data.sessionId] = new OnlinePlayer({
                scene: this,
                playerId: data.sessionId,
                key: data.sessionId,
                map: data.map,
                x: data.x,
                y: data.y,
              });
            }
          }
          if (data.event === "PLAYER_LEFT") {
            console.log("PLAYER_LEFT");

            if (onlinePlayers[data.sessionId]) {
              onlinePlayers[data.sessionId].destroy();
              delete onlinePlayers[data.sessionId];
            }
          }
          if (data.event === "PLAYER_MOVED") {
            //console.log('PLAYER_MOVED');

            // If player is in same map
            if (this.mapName === onlinePlayers[data.sessionId].map) {
              // If player isn't registered in this scene (map changing bug..)
              if (!onlinePlayers[data.sessionId].scene) {
                onlinePlayers[data.sessionId] = new OnlinePlayer({
                  scene: this,
                  playerId: data.sessionId,
                  key: data.sessionId,
                  map: data.map,
                  x: data.x,
                  y: data.y,
                });
              }
              // Start animation and set sprite position
              onlinePlayers[data.sessionId].isWalking(
                data.position,
                data.x,
                data.y
              );
            }
          }
          if (data.event === "PLAYER_MOVEMENT_ENDED") {
            // If player is in same map
            if (this.mapName === onlinePlayers[data.sessionId].map) {
              // If player isn't registered in this scene (map changing bug..)
              if (!onlinePlayers[data.sessionId].scene) {
                onlinePlayers[data.sessionId] = new OnlinePlayer({
                  scene: this,
                  playerId: data.sessionId,
                  key: data.sessionId,
                  map: data.map,
                  x: data.x,
                  y: data.y,
                });
              }
              // Stop animation & set sprite texture
              onlinePlayers[data.sessionId].stopWalking(data.position);
            }
          }
          if (data.event === "PLAYER_CHANGED_MAP") {
            console.log("PLAYER_CHANGED_MAP");

            if (onlinePlayers[data.sessionId]) {
              onlinePlayers[data.sessionId].destroy();

              if (
                data.map === this.mapName &&
                !onlinePlayers[data.sessionId].scene
              ) {
                onlinePlayers[data.sessionId] = new OnlinePlayer({
                  scene: this,
                  playerId: data.sessionId,
                  key: data.sessionId,
                  map: data.map,
                  x: data.x,
                  y: data.y,
                });
              }
            }
          }
        });
      }
    });

    this.map = this.make.tilemap({ key: this.mapName });

    console.log("this.mapName", this.mapName);
    console.log("this.map", this.map);

    // Set current map Bounds
    this.scene.scene.physics.world.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );

    // Parameters are the name you gave the tileset in Tiled and then the key of the tileset image in
    // Phaser's cache (i.e. the name you used in preload)
    const tileset = this.map.addTilesetImage(
      "tuxmon-sample-32px-extruded",
      "TilesTown"
    );

    // Parameters: layer name (or index) from Tiled, tileset, x, y
    this.belowLayer = this.map.createLayer("Below Player", tileset, 0, 0);
    this.worldLayer = this.map.createLayer("World", tileset, 0, 0);
    this.grassLayer = this.map.createLayer("Grass", tileset, 0, 0);
    this.aboveLayer = this.map.createLayer("Above Player", tileset, 0, 0);

    this.worldLayer.setCollisionByProperty({ collides: true });

    // By default, everything gets depth sorted on the screen in the order we created things. Here, we
    // want the "Above Player" layer to sit on top of the player, so we explicitly give it a depth.
    // Higher depths will sit on top of lower depth objects.
    this.aboveLayer.setDepth(10);

    // Get spawn point from tiled map
    const spawnPoint = this.map.findObject(
      "SpawnPoints",
      (obj) => obj.name === "Spawn Point"
    );

    // Set player
    this.player = new Player({
      scene: this,
      worldLayer: this.worldLayer,
      key: "player",
      x: spawnPoint.x,
      y: spawnPoint.y,
    });

    const camera = this.cameras.main;
    camera.startFollow(this.player);
    camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    cursors = this.input.keyboard.createCursorKeys();

    // Help text that has a "fixed" position on the screen
    this.add
      .text(
        16,
        16,
        'Arrow keys to move\nPress "D" to show hitboxes\nPress "X" to attack nearby enemies',
        {
          font: "18px monospace",
          fill: "#000000",
          padding: { x: 20, y: 10 },
          backgroundColor: "#ffffff",
        }
      )
      .setScrollFactor(0)
      .setDepth(30);

    // Session UI elements
    this.createSessionUI();
    this.createCombatUI();

    // Add attack key (X key)
    this.attackKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.X
    );

    // Initialize audio manager
    this.audioManager = this.game.audioManager;
    if (this.audioManager) {
      this.audioManager.startBackgroundMusic();
    }

    // Track player movement for sound effects
    this.lastPlayerX = this.player.x;
    this.lastPlayerY = this.player.y;
    this.walkSoundTimer = 0;

    this.debugGraphics();

    this.movementTimer();

    // Handle window resize
    window.addEventListener("resize", this.resizeGame.bind(this));

    // Add decorative objects to the map
    this.addDecorativeObjects();
  }

  // Handle window resize for fullscreen
  resizeGame() {
    const width = window.innerWidth;
    const height = window.innerHeight - 48;

    this.scale.resize(width, height);
    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
  }

  // Add decorative objects to the map
  addDecorativeObjects() {
    // Add some decorative sprites scattered around the map
    const decorations = [
      {
        x: this.map.widthInPixels / 4,
        y: this.map.heightInPixels / 4,
        frame: "misa-front",
        scale: 0.5,
        tint: 0xcccccc,
      },
      {
        x: (this.map.widthInPixels * 3) / 4,
        y: this.map.heightInPixels / 4,
        frame: "misa-back",
        scale: 0.5,
        tint: 0xcccccc,
      },
      {
        x: this.map.widthInPixels / 4,
        y: (this.map.heightInPixels * 3) / 4,
        frame: "misa-left",
        scale: 0.5,
        tint: 0xcccccc,
      },
      {
        x: (this.map.widthInPixels * 3) / 4,
        y: (this.map.heightInPixels * 3) / 4,
        frame: "misa-right",
        scale: 0.5,
        tint: 0xcccccc,
      },
    ];

    decorations.forEach((dec, index) => {
      const decoration = this.add.sprite(
        dec.x,
        dec.y,
        "currentPlayer",
        dec.frame
      );
      decoration.setScale(dec.scale);
      decoration.setTint(dec.tint);
      decoration.setDepth(2); // Behind players but visible

      // Add a pulsing glow effect
      this.tweens.add({
        targets: decoration,
        alpha: 0.3,
        duration: 2000,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
        delay: index * 500, // Stagger animations
      });
    });
  }

  update(time, delta) {
    // Check if wallet is still connected
    if (!isWalletConnected()) {
      // Wallet disconnected, return to wallet prompt
      this.scene.start("bootGame");
      return;
    }

    if (!this.sessionActive) return;

    // Update session timer
    this.sessionTimer += delta;
    this.updateSessionTimer(time);

    // Check if enemies can start spawning (after 10 seconds)
    if (!this.enemiesCanSpawn && this.sessionTimer >= this.enemySpawnDelay) {
      this.enemiesCanSpawn = true;
      this.showMessage("Enemies incoming! Press X to attack!", 2000);
    }

    // Spawn enemies randomly
    if (this.enemiesCanSpawn) {
      this.enemySpawnTimer += delta;
      if (this.enemiesCanSpawn && this.enemies.length < 10) {
        if (this.enemySpawnTimer >= Phaser.Math.Between(3000, 8000)) {
          this.spawnRandomEnemy();
          this.enemySpawnTimer = 0;
        }
      }
    }

    // Update enemies
    this.enemies.forEach((enemy) => {
      if (enemy && enemy.active) {
        enemy.update(time, delta);
      }
    });

    // Check for attack input
    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.attemptAttack(time);
    }

    // Loop the player update method
    this.player.update(time, delta);

    // Play walk sound if player is moving
    if (this.audioManager) {
      const playerMoved =
        Math.abs(this.player.x - this.lastPlayerX) > 1 ||
        Math.abs(this.player.y - this.lastPlayerY) > 1;

      if (playerMoved) {
        this.walkSoundTimer += delta;
        if (this.walkSoundTimer >= 200) {
          // Play sound every 200ms of movement
          this.audioManager.playWalkSound();
          this.walkSoundTimer = 0;
        }
      }

      this.lastPlayerX = this.player.x;
      this.lastPlayerY = this.player.y;
    }

    // Check if session ended
    if (this.sessionTimer >= this.sessionDuration) {
      this.endSession();
      return;
    }

    // Horizontal movement
    if (cursors.left.isDown) {
      if (socketKey) {
        if (this.player.isMoved()) {
          this.sendRoomMessage("PLAYER_MOVED", {
            position: "left",
            x: this.player.x,
            y: this.player.y,
          });
        }
        socketKey = false;
      }
    } else if (cursors.right.isDown) {
      if (socketKey) {
        if (this.player.isMoved()) {
          this.sendRoomMessage("PLAYER_MOVED", {
            position: "right",
            x: this.player.x,
            y: this.player.y,
          });
        }
        socketKey = false;
      }
    }

    // Vertical movement
    if (cursors.up.isDown) {
      if (socketKey) {
        if (this.player.isMoved()) {
          this.sendRoomMessage("PLAYER_MOVED", {
            position: "back",
            x: this.player.x,
            y: this.player.y,
          });
        }
        socketKey = false;
      }
    } else if (cursors.down.isDown) {
      if (socketKey) {
        if (this.player.isMoved()) {
          this.sendRoomMessage("PLAYER_MOVED", {
            position: "front",
            x: this.player.x,
            y: this.player.y,
          });
        }
        socketKey = false;
      }
    }

    // Horizontal movement ended
    if (Phaser.Input.Keyboard.JustUp(cursors.left) === true) {
      this.sendRoomMessage("PLAYER_MOVEMENT_ENDED", { position: "left" });
    } else if (Phaser.Input.Keyboard.JustUp(cursors.right) === true) {
      this.sendRoomMessage("PLAYER_MOVEMENT_ENDED", { position: "right" });
    }

    // Vertical movement ended
    if (Phaser.Input.Keyboard.JustUp(cursors.up) === true) {
      this.sendRoomMessage("PLAYER_MOVEMENT_ENDED", { position: "back" });
    } else if (Phaser.Input.Keyboard.JustUp(cursors.down) === true) {
      this.sendRoomMessage("PLAYER_MOVEMENT_ENDED", { position: "front" });
    }
  }

  movementTimer() {
    setInterval(() => {
      socketKey = true;
    }, 50);
  }

  debugGraphics() {
    // Toggleable debug graphics using D key. Use addKey for reliable handling.
    this.debugGraphicsEnabled = false;
    this._debugGraphicsObj = null;

    const keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    keyD.on("down", () => {
      if (!this.debugGraphicsEnabled) {
        this.debugGraphicsEnabled = true;
        // Turn on physics debugging to show player's hitbox
        try {
          this.physics.world.createDebugGraphic();
        } catch (e) {
          console.warn("Unable to create physics debug graphic", e);
        }

        // Create worldLayer collision graphic above the player, but below the help text
        this._debugGraphicsObj = this.add
          .graphics()
          .setAlpha(0.75)
          .setDepth(20);
        this.worldLayer.renderDebug(this._debugGraphicsObj, {
          tileColor: null, // Color of non-colliding tiles
          collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tiles
          faceColor: new Phaser.Display.Color(40, 39, 37, 255), // Color of colliding face edges
        });
      } else {
        // Toggle off
        this.debugGraphicsEnabled = false;
        try {
          if (this._debugGraphicsObj) {
            this._debugGraphicsObj.destroy();
            this._debugGraphicsObj = null;
          }
        } catch (e) {}
      }
    });
  }

  // Check for random encounter at world position (called when player finishes a step)
  attemptEncounter(x, y) {
    // Do not run encounters while already in one
    if (this.inEncounter) return;

    // Only trigger encounters on grass layer tiles
    try {
      const tile = this.grassLayer.getTileAtWorldXY(x, y, true);
      if (!tile || tile.index === -1) return;

      // Roll a chance (e.g., 5% per step)
      const chance = 0.05;
      if (Math.random() < chance) {
        // Create a simple enemy payload (could be expanded)
        const enemy = { name: "Wild Slime", hp: 10, level: 1 };
        this.handleEncounter(enemy);
      }
    } catch (e) {
      // If something goes wrong, don't crash the game
      console.warn("Encounter check failed", e);
    }
  }

  // Simple encounter handler: show overlay, pause player movement, wait for SPACE to dismiss
  handleEncounter(enemy) {
    this.inEncounter = true;

    // Pause physics and show overlay text
    this.physics.world.pause();

    const overlay = this.add
      .rectangle(
        this.cameras.main.midPoint.x,
        this.cameras.main.midPoint.y,
        600,
        200,
        0x000000,
        0.75
      )
      .setScrollFactor(0)
      .setDepth(50);

    const title = this.add
      .text(
        this.cameras.main.midPoint.x,
        this.cameras.main.midPoint.y - 24,
        `A wild ${enemy.name} appears!`,
        {
          font: "20px monospace",
          fill: "#ffffff",
        }
      )
      .setOrigin(0.5)
      .setDepth(51)
      .setScrollFactor(0);

    const hint = this.add
      .text(
        this.cameras.main.midPoint.x,
        this.cameras.main.midPoint.y + 24,
        "Press SPACE to continue",
        {
          font: "14px monospace",
          fill: "#dddddd",
        }
      )
      .setOrigin(0.5)
      .setDepth(51)
      .setScrollFactor(0);

    // On spacebar press resume
    const space = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    const onSpace = () => {
      // Clean up
      overlay.destroy();
      title.destroy();
      hint.destroy();
      this.inEncounter = false;
      this.physics.world.resume();
      // remove listener
      space.off("down", onSpace);
    };
    space.on("down", onSpace);
  }

  // Create session UI
  createSessionUI() {
    this.sessionTimerText = this.add
      .text(16, 50, "Session: 5:00", {
        font: "24px monospace",
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(40);

    this.sessionStatusText = this.add
      .text(16, 90, "Enemies spawn in 10 seconds...", {
        font: "18px monospace",
        fill: "#ffff00",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(40);
  }

  // Create combat UI
  createCombatUI() {
    this.killsText = this.add
      .text(16, 130, "Kills: 0", {
        font: "20px monospace",
        fill: "#00ff00",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(40);
  }

  // Update session timer
  updateSessionTimer(time) {
    const remaining = this.sessionDuration - this.sessionTimer;
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const secondsStr = seconds.toString().padStart(2, "0");

    this.sessionTimerText.setText(`Session: ${minutes}:${secondsStr}`);

    // Change color to red when time is running out
    if (remaining <= 60000) {
      this.sessionTimerText.setTint(0xff0000);
    } else if (remaining <= 120000) {
      this.sessionTimerText.setTint(0xff8800);
    } else {
      this.sessionTimerText.clearTint();
    }
  }

  // Spawn random enemy
  spawnRandomEnemy() {
    // Get a random spawn location
    const spawnX = Phaser.Math.Between(100, this.map.widthInPixels - 100);
    const spawnY = Phaser.Math.Between(100, this.map.heightInPixels - 100);

    // Check if position is valid (not colliding with walls)
    const spawnTile = this.worldLayer.getTileAtWorldXY(spawnX, spawnY);
    if (!spawnTile || spawnTile.properties.collides) {
      // Try again with a different position
      return this.spawnRandomEnemy();
    }

    // Create enemy with random stats
    const enemy = new Enemy({
      scene: this,
      x: spawnX,
      y: spawnY,
      worldLayer: this.worldLayer,
      maxHealth: Phaser.Math.Between(15, 30),
      damage: Phaser.Math.Between(3, 8),
      speed: Phaser.Math.Between(50, 100),
    });

    this.enemies.push(enemy);
    this.physics.add.collider(enemy, this.worldLayer);

    // Clean up destroyed enemies
    this.enemies = this.enemies.filter((e) => e && e.active);
  }

  // Attempt attack on nearby enemies
  attemptAttack(time) {
    const attackRange = 50;
    let attacked = false;

    this.enemies.forEach((enemy, index) => {
      if (!enemy || !enemy.active) return;

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y
      );

      if (distance <= attackRange) {
        const killed = enemy.takeDamage(10, time);
        if (killed) {
          this.kills++;
          this.playerStats.kills = this.kills;
          this.killsText.setText(`Kills: ${this.kills}`);
          this.enemies.splice(index, 1);

          // Show kill notification
          this.showFloatingText(enemy.x, enemy.y, "+1 Kill!", 0x00ff00);

          // Play kill sound
          if (this.audioManager) {
            this.audioManager.playKillSound();
          }
        }
        attacked = true;
      }
    });

    // Play attack animation and sound if we hit something
    if (attacked) {
      this.playerAttackAnimation();
      if (this.audioManager) {
        this.audioManager.playAttackSound();
      }
    }
  }

  // Player attack animation
  playerAttackAnimation() {
    // Flash the player sprite
    this.tweens.add({
      targets: this.player,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.player.setAlpha(1);
      },
    });
  }

  // Show floating damage text
  showFloatingText(x, y, text, color) {
    const floatingText = this.add
      .text(x, y, text, {
        font: "20px monospace",
        fill: color === 0x00ff00 ? "#00ff00" : "#ff0000",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setDepth(50);

    this.tweens.add({
      targets: floatingText,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => floatingText.destroy(),
    });
  }

  // Show message on screen
  showMessage(text, duration = 3000) {
    if (this.sessionStatusText) {
      this.sessionStatusText.setText(text);
      this.tweens.add({
        targets: this.sessionStatusText,
        alpha: { from: 1, to: 0 },
        duration: duration,
        yoyo: true,
        repeat: 0,
      });
    }
  }

  // End session and show leaderboard
  endSession() {
    this.sessionActive = false;
    this.physics.world.pause();

    // Stop background music
    if (this.audioManager) {
      this.audioManager.stopBackgroundMusic();
    }

    // Remove old enemies
    this.enemies.forEach((enemy) => {
      if (enemy && enemy.active) {
        enemy.destroy();
      }
    });
    this.enemies = [];

    // Create leaderboard data - get all players' kills
    room.then((roomInstance) => {
      const leaderboardData = [
        { playerId: roomInstance.sessionId || "You", kills: this.kills },
      ];

      // In a multiplayer scenario, you would send the kills to the server
      // and receive all players' stats. For now, we just show the local player.
      this.showLeaderboard(leaderboardData);
    });
  }

  // Show leaderboard
  showLeaderboard(leaderboardData) {
    // Sort by kills
    leaderboardData.sort((a, b) => b.kills - a.kills);

    // Create overlay
    const overlay = this.add
      .rectangle(
        this.cameras.main.midPoint.x,
        this.cameras.main.midPoint.y,
        500,
        400,
        0x000000,
        0.9
      )
      .setScrollFactor(0)
      .setDepth(100);

    // Title
    const title = this.add
      .text(
        this.cameras.main.midPoint.x,
        this.cameras.main.midPoint.y - 150,
        "SESSION ENDED",
        {
          font: "32px monospace",
          fill: "#ffffff",
        }
      )
      .setOrigin(0.5)
      .setDepth(101)
      .setScrollFactor(0);

    // Leaderboard
    let leaderboardText = "LEADERBOARD\n\n";
    leaderboardData.slice(0, 10).forEach((entry, index) => {
      leaderboardText += `${index + 1}. ${entry.playerId}: ${
        entry.kills
      } kills\n`;
    });

    const leaderboard = this.add
      .text(
        this.cameras.main.midPoint.x,
        this.cameras.main.midPoint.y,
        leaderboardText,
        {
          font: "20px monospace",
          fill: "#ffffff",
        }
      )
      .setOrigin(0.5)
      .setDepth(101)
      .setScrollFactor(0);

    // Restart button hint
    const hint = this.add
      .text(
        this.cameras.main.midPoint.x,
        this.cameras.main.midPoint.y + 150,
        "Press SPACE to restart",
        {
          font: "18px monospace",
          fill: "#ffff00",
        }
      )
      .setOrigin(0.5)
      .setDepth(101)
      .setScrollFactor(0);

    // Listen for space to restart
    const space = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    const onSpace = () => {
      overlay.destroy();
      title.destroy();
      leaderboard.destroy();
      hint.destroy();

      space.off("down", onSpace);

      // Restart the scene (music will restart automatically in create())
      this.scene.restart({
        map: this.mapName,
        playerTexturePosition: this.playerTexturePosition,
      });
    };
    space.on("down", onSpace);
  }
}
