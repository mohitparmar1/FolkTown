import Phaser from "phaser";

export default class Enemy extends Phaser.GameObjects.Sprite {
  constructor(config) {
    super(config.scene, config.x, config.y, "players");

    this.scene.add.existing(this);
    this.scene.physics.world.enableBody(this);
    this.scene.physics.add.collider(this, config.worldLayer);

    // Enemy properties
    this.maxHealth = config.maxHealth || 20;
    this.health = this.maxHealth;
    this.damage = config.damage || 5;
    this.speed = config.speed || 80;
    this.enemyId = config.enemyId || Phaser.Math.RND.uuid();

    // Set random enemy appearance using bob sprites (different from player)
    const enemyFrames = ["bob_front", "bob_back", "bob_left", "bob_right"];
    const randomFrame = Phaser.Utils.Array.GetRandom(enemyFrames);
    this.setTexture("players", randomFrame);

    // Add a red tint to make enemies visually distinct
    this.setTint(0xff6b6b);

    // Enemy can't go out of the world
    this.body.setCollideWorldBounds(true);
    this.setDepth(5);

    // Enemy stats display
    this.healthBar = this.scene.add.graphics();
    this.updateHealthBar();

    // Random movement direction
    this.moveTimer = 0;
    this.currentDirection = null;
    this.directionChangeInterval = Phaser.Math.Between(2000, 5000);

    // Damage indicator
    this.lastDamaged = 0;
    this.damageCooldown = 1000; // Can be damaged once per second
  }

  update(time, delta) {
    // Update health bar position
    this.updateHealthBar();

    // Random wandering behavior
    this.moveTimer += delta;

    if (
      this.moveTimer >= this.directionChangeInterval ||
      this.currentDirection === null
    ) {
      this.currentDirection = this.getRandomDirection();
      this.moveTimer = 0;
      this.directionChangeInterval = Phaser.Math.Between(2000, 5000);
    }

    this.moveInDirection(this.currentDirection, delta);

    // Flash red when damaged
    if (time - this.lastDamaged < 200) {
      this.setTint(0xff0000);
    } else {
      this.clearTint();
    }
  }

  getRandomDirection() {
    const directions = ["left", "right", "up", "down", "stop"];
    return Phaser.Utils.Array.GetRandom(directions);
  }

  moveInDirection(direction, delta) {
    const distance = (this.speed * delta) / 1000;

    this.body.setVelocity(0);

    switch (direction) {
      case "left":
        this.body.setVelocityX(-this.speed);
        this.anims.play("onlinePlayer-left-walk", true);
        this.setTexture("players", "bob_left");
        break;
      case "right":
        this.body.setVelocityX(this.speed);
        this.anims.play("onlinePlayer-right-walk", true);
        this.setTexture("players", "bob_right");
        break;
      case "up":
        this.body.setVelocityY(-this.speed);
        this.anims.play("onlinePlayer-back-walk", true);
        this.setTexture("players", "bob_back");
        break;
      case "down":
        this.body.setVelocityY(this.speed);
        this.anims.play("onlinePlayer-front-walk", true);
        this.setTexture("players", "bob_front");
        break;
      case "stop":
        this.body.setVelocity(0);
        this.anims.stop();
        break;
    }
  }

  takeDamage(damage, time) {
    if (time - this.lastDamaged < this.damageCooldown) {
      return;
    }

    this.health -= damage;
    this.lastDamaged = time;

    // Shake effect
    this.scene.tweens.add({
      targets: this,
      x: this.x + Phaser.Math.Between(-5, 5),
      duration: 50,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.setX(this.x);
      },
    });

    if (this.health <= 0) {
      this.die();
      return true; // Enemy killed
    }
    return false; // Enemy still alive
  }

  die() {
    // Play death animation
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.5,
      duration: 300,
      onComplete: () => {
        this.destroy();
      },
    });

    // Remove health bar
    this.healthBar.destroy();
  }

  updateHealthBar() {
    if (!this.healthBar) return;

    this.healthBar.clear();

    const barWidth = 40;
    const barHeight = 4;
    const healthPercent = this.health / this.maxHealth;
    const x = this.x - barWidth / 2;
    const y = this.y - 30;

    // Background (red)
    this.healthBar.fillStyle(0x000000);
    this.healthBar.fillRect(x, y, barWidth, barHeight);

    // Health (green)
    this.healthBar.fillStyle(0x00ff00);
    this.healthBar.fillRect(x, y, barWidth * healthPercent, barHeight);
  }

  destroy() {
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    super.destroy();
  }
}
