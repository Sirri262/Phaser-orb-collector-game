const WIDTH = 900;
const HEIGHT = 540;

class MainScene extends Phaser.Scene {
  constructor() {
    super("main");
  }

  init() {
    this.score = 0;
    this.lives = 3;

    this.started = false;
    this.gameOver = false;

    this.wave = 1;

    // Prevent multi-hit life loss
    this.invincible = false;
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b1020");

    this.makeTextures();

    // Physics bounds
    this.physics.world.setBounds(0, 0, WIDTH, HEIGHT);

    // Player
    this.player = this.physics.add.sprite(WIDTH / 2, HEIGHT / 2, "player");
    this.player.setCollideWorldBounds(true);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.moveKeys = this.input.keyboard.addKeys("W,A,S,D");
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // IMPORTANT: make sure keyboard is enabled
    this.input.keyboard.enabled = true;

    // UI
    this.uiScore = this.add.text(16, 14, "Skor: 0", {
      fontSize: "18px",
      color: "#fff",
      fontFamily: "system-ui, Arial",
    });

    this.uiLives = this.add.text(16, 40, "Can: 3", {
      fontSize: "18px",
      color: "#fff",
      fontFamily: "system-ui, Arial",
    });

    this.uiMsg = this.add
      .text(WIDTH / 2, HEIGHT / 2, "", {
        fontSize: "42px",
        color: "#fff",
        align: "center",
        fontFamily: "system-ui, Arial",
      })
      .setOrigin(0.5);

    // Groups
    this.bombs = this.physics.add.group();
    for (let i = 0; i < 3; i++) this.spawnBomb();

    this.spawnOrbs();

    // Overlaps
    this.physics.add.overlap(this.player, this.bombs, this.hitBomb, null, this);

    // Start screen
    this.uiMsg.setText("START");
    this.physics.world.pause();

    // Extra safety: If the page loses focus, clicking will focus it again
    this.input.on("pointerdown", () => {
      // try to ensure key events are captured
      window.focus();
    });

    // Extra safety: also listen for keydown-R (some layouts / focus cases)
    this._restartHandler = () => {
      if (this.gameOver) this.restartGame();
    };
    this.input.keyboard.on("keydown-R", this._restartHandler);

    // Clean up listeners on shutdown (prevents duplicates)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this._restartHandler) {
        this.input.keyboard.off("keydown-R", this._restartHandler);
      }
    });
  }

  restartGame() {
    // fully restart the scene
    this.scene.restart();
  }

  makeTextures() {
    const g = this.add.graphics();

    // Player
    g.fillStyle(0x4cc9f0, 1).fillRoundedRect(0, 0, 34, 34, 10);
    g.lineStyle(3, 0xffffff, 0.85).strokeRoundedRect(0, 0, 34, 34, 10);
    g.generateTexture("player", 34, 34);
    g.clear();

    // Orb (food)
    g.fillStyle(0xfed766, 1).fillCircle(12, 12, 12);
    g.lineStyle(2, 0xffffff, 0.8).strokeCircle(12, 12, 12);
    g.generateTexture("orb", 24, 24);
    g.clear();

    // Bomb
    g.fillStyle(0xff006e, 1).fillCircle(14, 14, 14);
    g.lineStyle(3, 0xffffff, 0.85).strokeCircle(14, 14, 14);
    g.generateTexture("bomb", 28, 28);

    g.destroy();
  }

  spawnBomb() {
    const b = this.bombs.create(
      Phaser.Math.Between(60, WIDTH - 60),
      Phaser.Math.Between(60, HEIGHT - 60),
      "bomb"
    );

    b.setBounce(1);
    b.setCollideWorldBounds(true);

    // Bomb speed scales with wave
    const base = 180 + (this.wave - 1) * 25;
    b.setVelocity(
      Phaser.Math.Between(-base, base),
      Phaser.Math.Between(-base, base)
    );
  }

  spawnOrbs() {
    if (this.orbs) this.orbs.clear(true, true);

    this.orbs = this.physics.add.group();

    const count = 12 + (this.wave - 1) * 2;
    const v = 120 + (this.wave - 1) * 25;

    for (let i = 0; i < count; i++) {
      const orb = this.orbs.create(
        Phaser.Math.Between(60, WIDTH - 60),
        Phaser.Math.Between(60, HEIGHT - 60),
        "orb"
      );
      orb.setBounce(1);
      orb.setCollideWorldBounds(true);
      orb.setVelocity(Phaser.Math.Between(-v, v), Phaser.Math.Between(-v, v));
    }

    // Rebind overlap because we recreated the group
    this.physics.add.overlap(this.player, this.orbs, this.collectOrb, null, this);
  }

  collectOrb(player, orb) {
    if (this.gameOver) return;

    orb.disableBody(true, true);

    this.score += 10;
    this.uiScore.setText(`Skor: ${this.score}`);

    // Next wave when all orbs are collected
    if (this.orbs.countActive(true) === 0) {
      this.wave += 1;

      // Harder: add bomb, speed up existing bombs
      this.spawnBomb();
      this.bombs.children.iterate((b) => {
        if (!b.body) return;
        b.setVelocity(b.body.velocity.x * 1.15, b.body.velocity.y * 1.15);
      });

      this.spawnOrbs();

      this.uiMsg.setText(`WAVE ${this.wave}`);
      this.time.delayedCall(700, () => this.uiMsg.setText(""), [], this);
    }
  }

  hitBomb(player, bomb) {
    if (this.gameOver) return;
    if (this.invincible) return;

    this.invincible = true;

    // Knockback
    const dx = player.x - bomb.x;
    const dy = player.y - bomb.y;
    player.setVelocity(dx * 6, dy * 6);

    // Lose exactly 1 life
    this.lives -= 1;
    this.uiLives.setText(`Can: ${this.lives}`);

    // Feedback
    player.setTint(0xff5555);
    this.cameras.main.shake(140, 0.01);

    if (this.lives <= 0) {
      this.endGame();
      return;
    }

    // Invincibility window
    this.time.delayedCall(1000, () => {
      this.invincible = false;
      player.clearTint();
    });
  }

  endGame() {
    this.gameOver = true;

    // Pause physics (input still works)
    this.physics.world.pause();

    this.player.setVelocity(0, 0);
    this.player.setTint(0xff5555);

    this.uiMsg.setText("GAME OVER\nCTRL + R TO RESTART");
  }

  update() {
    // ✅ Restart (works even if keydown event doesn't)
    if (this.gameOver && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.restartGame();
      return;
    }

    // Start with Space
    if (!this.started) {
      if (Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
        this.started = true;
        this.uiMsg.setText("");
        this.physics.world.resume();
      }
      return;
    }

    if (this.gameOver) return;

    // Movement
    const speed = 220;
    this.player.setVelocity(0);

    if (this.cursors.left.isDown || this.moveKeys.A.isDown) this.player.setVelocityX(-speed);
    if (this.cursors.right.isDown || this.moveKeys.D.isDown) this.player.setVelocityX(speed);
    if (this.cursors.up.isDown || this.moveKeys.W.isDown) this.player.setVelocityY(-speed);
    if (this.cursors.down.isDown || this.moveKeys.S.isDown) this.player.setVelocityY(speed);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: WIDTH,
  height: HEIGHT,
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [MainScene],
});
