import TownJSON from "./assets/tilemaps/town.json";
import TilesTown from "./assets/tilesets/tuxmon-sample-32px-extruded.png";

import Route1JSON from "./assets/tilemaps/route1";

import AtlasJSON from "./assets/atlas/atlas";
import AtlasPNG from "./assets/atlas/atlas.png";
import PlayersAtlasJSON from "./assets/atlas/players";
import PlayersAtlasPNG from "./assets/images/players/players.png";

import AudioManager from "./AudioManager";
import { isWalletConnected } from "./wallet";

export class Scene1 extends Phaser.Scene {
  constructor() {
    super("bootGame");
  }

  preload() {
    // Load Town
    this.load.image("TilesTown", TilesTown);
    this.load.tilemapTiledJSON("town", TownJSON);

    // Load Route1
    this.load.tilemapTiledJSON("route1", Route1JSON);

    // Load atlas
    this.load.atlas("currentPlayer", AtlasPNG, AtlasJSON);
    this.load.atlas("players", PlayersAtlasPNG, PlayersAtlasJSON);
  }

  create() {
    // Initialize audio manager globally
    if (!this.game.audioManager) {
      this.game.audioManager = new AudioManager(this);
    }

    // Create the player's walking animations from the texture currentPlayer. These are stored in the global
    // animation manager so any sprite can access them.
    this.anims.create({
      key: "misa-left-walk",
      frames: this.anims.generateFrameNames("currentPlayer", {
        prefix: "misa-left-walk.",
        start: 0,
        end: 3,
        zeroPad: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "misa-right-walk",
      frames: this.anims.generateFrameNames("currentPlayer", {
        prefix: "misa-right-walk.",
        start: 0,
        end: 3,
        zeroPad: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "misa-front-walk",
      frames: this.anims.generateFrameNames("currentPlayer", {
        prefix: "misa-front-walk.",
        start: 0,
        end: 3,
        zeroPad: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "misa-back-walk",
      frames: this.anims.generateFrameNames("currentPlayer", {
        prefix: "misa-back-walk.",
        start: 0,
        end: 3,
        zeroPad: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // onlinePlayer animations
    this.anims.create({
      key: "onlinePlayer-left-walk",
      frames: this.anims.generateFrameNames("players", {
        start: 0,
        end: 3,
        zeroPad: 3,
        prefix: "bob_left_walk.",
        suffix: ".png",
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "onlinePlayer-right-walk",
      frames: this.anims.generateFrameNames("players", {
        start: 0,
        end: 3,
        zeroPad: 3,
        prefix: "bob_right_walk.",
        suffix: ".png",
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "onlinePlayer-front-walk",
      frames: this.anims.generateFrameNames("players", {
        start: 0,
        end: 3,
        zeroPad: 3,
        prefix: "bob_front_walk.",
        suffix: ".png",
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "onlinePlayer-back-walk",
      frames: this.anims.generateFrameNames("players", {
        start: 0,
        end: 3,
        zeroPad: 3,
        prefix: "bob_back_walk.",
        suffix: ".png",
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Check if wallet is connected
    this.checkWalletAndStart();
  }

  checkWalletAndStart() {
    if (isWalletConnected()) {
      // Wallet is connected, start the game
      if (this.walletCheckTimer) {
        this.time.removeEvent(this.walletCheckTimer);
      }
      this.scene.start("playGame", {
        map: "route1",
        playerTexturePosition: "front",
      });
    } else {
      // Show wallet connection prompt
      if (!this.walletPromptShown) {
        this.showWalletPrompt();
        this.walletPromptShown = true;
      }
    }
  }

  showWalletPrompt() {
    const { width, height } = this.cameras.main;

    // Clear any existing graphics
    this.children.removeAll();

    // Background overlay
    const bg = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.95)
      .setScrollFactor(0);

    // Title
    this.add
      .text(width / 2, height / 2 - 100, "Connect Your Wallet", {
        font: "48px monospace",
        fill: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    // Description
    this.add
      .text(
        width / 2,
        height / 2 - 20,
        "You need to connect your Phantom wallet\nto enter the battle arena",
        {
          font: "24px monospace",
          fill: "#cccccc",
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0);

    // Instructions
    this.add
      .text(
        width / 2,
        height / 2 + 60,
        "Click 'Connect Phantom' button above",
        {
          font: "20px monospace",
          fill: "#ffff00",
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0);

    // Animated pulsing dots
    const dots = this.add
      .text(width / 2, height / 2 + 120, "Waiting for connection...", {
        font: "18px monospace",
        fill: "#888888",
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.tweens.add({
      targets: dots,
      alpha: 0.3,
      duration: 1000,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });

    // Check wallet status periodically
    this.walletCheckTimer = this.time.addEvent({
      delay: 500,
      callback: this.checkWalletAndStart,
      callbackScope: this,
      loop: true,
    });
  }
}
