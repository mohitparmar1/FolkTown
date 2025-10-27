import Phaser from "phaser";

export default class OnlinePlayer extends Phaser.GameObjects.Sprite {
  constructor(config) {
    super(config.scene, config.x, config.y, config.playerId);

    this.scene.add.existing(this);
    this.scene.physics.world.enableBody(this);
    this.scene.physics.add.collider(this, config.worldLayer);

    this.setTexture("players", "bob_front.png").setScale(1.9, 2.1);

    this.map = config.map;
    console.log(`Map of ${config.playerId} is ${this.map}`);

    // Player Offset
    this.body.setOffset(0, 24);

    // Assign random color to distinguish players
    const colors = [0x00ff00, 0x0080ff, 0xff00ff, 0xffff00, 0xff8000, 0x00ffff];
    this.playerColor = colors[Math.floor(Math.random() * colors.length)];
    this.setTint(this.playerColor);

    // Display playerId above player with better styling
    const shortId = config.playerId.substring(0, 6);
    this.playerNickname = this.scene.add
      .text(this.x, this.y - 30, shortId, {
        font: "12px monospace",
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
        backgroundColor: Phaser.Display.Color.ValueToColor(this.playerColor)
          .rgba,
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1);
  }

  isWalking(position, x, y) {
    // Player
    this.anims.play(`onlinePlayer-${position}-walk`, true);
    this.setPosition(x, y);

    // PlayerId - center above player
    if (this.playerNickname) {
      this.playerNickname.x = this.x;
      this.playerNickname.y = this.y - 30;
    }
  }

  stopWalking(position) {
    this.anims.stop();
    this.setTexture("players", `bob_${position}.png`);

    // Update nickname position
    if (this.playerNickname) {
      this.playerNickname.x = this.x;
      this.playerNickname.y = this.y - 30;
    }
  }

  destroy() {
    super.destroy();
    this.playerNickname.destroy();
  }
}
