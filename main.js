const WIDTH = 900;
const HEIGHT = 540;

class MainScene extends Phaser.Scene {
  constructor() { super("main"); }

  init() {
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b1020");
    this.makeTextures();

    this.physics.world.setBounds(0, 0, WIDTH, HEIGHT);

    this.player = this.physics.add.sprite(WIDTH / 2, HEIGHT / 2, "player");
    this.player.setCollideWorldBounds(true);

    this.orbs = this.physics.add.group({ key: "orb", repeat: 11, setXY: { x: 100, y: 90, stepX: 65 } });
    this.orbs.children.iterate((orb) => {
      orb.setBounce(1);
      orb.setCollideWorldBounds(true);
      orb.setVelocity(Phaser.Math.Between(-120, 120), Phaser.Math.Between(-120, 120));
    });

    this.bombs = this.physics.add.group();
    for (let i = 0; i < 4; i++) this.spawnBomb();

    this.uiScore = this.add.text(16, 14, "Skor: 0", { fontSize: "18px", color: "#fff" });
    this.uiLives = this.add.text(16, 40, "Can: 3", { fontSize: "18px", color: "#fff" });
    this.uiMsg = this.add.text(WIDTH / 2, HEIGHT / 2, "", { fontSize: "42px", color: "#fff", align: "center" }).setOrigin(0.5);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,R");

    this.physics.add.overlap(this.player, this.orbs, this.collectOrb, null, this);
    this.physics.add.overlap(this.player, this.bombs, this.hitBomb, null, this);
  }

  makeTextures() {
    const g = this.add.graphics();
    g.fillStyle(0x4cc9f0, 1).fillRoundedRect(0, 0, 34, 34, 10);
    g.generateTexture("player", 34, 34);
    g.clear();

    g.fillStyle(0xfed766, 1).fillCircle(12, 12, 12);
    g.generateTexture("orb", 24, 24);
    g.clear();

    g.fillStyle(0xff006e, 1).fillCircle(14, 14, 14);
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
    b.setVelocity(Phaser.Math.Between(-220, 220), Phaser.Math.Between(-220, 220));
  }

  collectOrb(player, orb) {
    if (this.gameOver) return;
    orb.disableBody(true, true);
    this.score += 10;
    this.uiScore.setText(`Skor: ${this.score}`);
  }

  hitBomb() {
    if (this.gameOver) return;
    this.lives--;
    this.uiLives.setText(`Can: ${this.lives}`);
    if (this.lives <= 0) {
      this.gameOver = true;
      this.uiMsg.setText("GAME OVER\nR ile yeniden başlat");
    }
  }

  update() {
    if (this.gameOver && Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      this.scene.restart();
      return;
    }
    if (this.gameOver) return;

    const speed = 220;
    this.player.setVelocity(0);

    if (this.cursors.left.isDown || this.keys.A.isDown) this.player.setVelocityX(-speed);
    if (this.cursors.right.isDown || this.keys.D.isDown) this.player.setVelocityX(speed);
    if (this.cursors.up.isDown || this.keys.W.isDown) this.player.setVelocityY(-speed);
    if (this.cursors.down.isDown || this.keys.S.isDown) this.player.setVelocityY(speed);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: WIDTH,
  height: HEIGHT,
  physics: { default: "arcade", arcade: { gravity: { y: 0 } } },
  scene: [MainScene],
});
