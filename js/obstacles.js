/**
 * obstacles.js
 * Geração procedural de obstáculos, com dificuldade progressiva
 * e garantia de espaçamento sempre superável por um jogador habilidoso.
 */

const OBSTACLE_TYPES = {
  LOW: 'low',       // pequeno no chão -> pular
  TALL: 'tall',      // alto no chão -> pular (exige timing melhor)
  WIDE: 'wide',      // cluster largo no chão -> pular
  FLYING: 'flying'   // obstáculo aéreo -> abaixar
};

class Obstacle {
  constructor(type, x, groundY) {
    this.type = type;
    this.groundY = groundY;
    this.passed = false;

    switch (type) {
      case OBSTACLE_TYPES.LOW:
        this.width = 26;
        this.height = 34;
        this.y = groundY - this.height;
        break;
      case OBSTACLE_TYPES.TALL:
        this.width = 24;
        this.height = 56;
        this.y = groundY - this.height;
        break;
      case OBSTACLE_TYPES.WIDE:
        this.width = 58;
        this.height = 30;
        this.y = groundY - this.height;
        break;
      case OBSTACLE_TYPES.FLYING:
        this.width = 44;
        this.height = 22;
        // Flutua alto o suficiente para passar por cima de um jogador abaixado
        // (duckHeight ~30) mas baixo o suficiente para acertar um jogador em pé
        // (standHeight ~54). A base fica a ~40px do chão, com folga de segurança.
        this.y = groundY - 40 - this.height;
        break;
    }
    this.x = x;
    this.wobble = Math.random() * Math.PI * 2;
  }

  update(dt, speedPxPerSec) {
    this.x -= speedPxPerSec * dt;
    if (this.type === OBSTACLE_TYPES.FLYING) {
      this.wobble += dt * 4;
    }
  }

  getHitbox() {
    const pad = 3;
    return {
      x: this.x + pad,
      y: this.y + pad,
      width: this.width - pad * 2,
      height: this.height - pad * 2
    };
  }

  isOffscreen() {
    return this.x + this.width < -10;
  }

  draw(ctx) {
    ctx.save();
    const glow = this.type === OBSTACLE_TYPES.FLYING ? 'rgba(255,47,176,0.55)' : 'rgba(255,210,63,0.5)';
    const color = this.type === OBSTACLE_TYPES.FLYING ? '#ff2fb0' : '#ffd23f';

    ctx.shadowColor = glow;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;

    if (this.type === OBSTACLE_TYPES.FLYING) {
      const floatY = this.y + Math.sin(this.wobble) * 4;
      ctx.beginPath();
      ctx.moveTo(this.x, floatY + this.height / 2);
      ctx.lineTo(this.x + this.width * 0.25, floatY);
      ctx.lineTo(this.x + this.width * 0.75, floatY);
      ctx.lineTo(this.x + this.width, floatY + this.height / 2);
      ctx.lineTo(this.x + this.width * 0.75, floatY + this.height);
      ctx.lineTo(this.x + this.width * 0.25, floatY + this.height);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x + 4, floatY + this.height / 2);
      ctx.lineTo(this.x + this.width - 4, floatY + this.height / 2);
      ctx.stroke();
    } else if (this.type === OBSTACLE_TYPES.WIDE) {
      // cluster de 3 blocos formando um obstáculo largo
      const segW = this.width / 3 - 3;
      for (let i = 0; i < 3; i++) {
        const bx = this.x + i * (segW + 4);
        ctx.beginPath();
        ctx.moveTo(bx, this.y + this.height);
        ctx.lineTo(bx + segW / 2, this.y);
        ctx.lineTo(bx + segW, this.y + this.height);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // low / tall -> cristal/pico
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.height);
      ctx.lineTo(this.x + this.width * 0.5, this.y);
      ctx.lineTo(this.x + this.width, this.y + this.height);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x + this.width * 0.5, this.y);
      ctx.lineTo(this.x + this.width * 0.5, this.y + this.height);
      ctx.stroke();
    }

    ctx.restore();
  }
}

class ObstacleManager {
  constructor(groundY, canvasWidth) {
    this.groundY = groundY;
    this.canvasWidth = canvasWidth;
    this.obstacles = [];
    this.distanceSinceSpawn = 0;
    this.nextSpawnDistance = 400;
  }

  reset() {
    this.obstacles = [];
    this.distanceSinceSpawn = 0;
    this.nextSpawnDistance = 420;
  }

  /** Define a dificuldade em função da pontuação (ver especificação do jogo). */
  getTier(score) {
    if (score < 500) return 1;
    if (score < 1500) return 2;
    return 3;
  }

  pickTypePool(tier) {
    if (tier === 1) {
      return [OBSTACLE_TYPES.LOW, OBSTACLE_TYPES.LOW, OBSTACLE_TYPES.TALL];
    }
    if (tier === 2) {
      return [OBSTACLE_TYPES.LOW, OBSTACLE_TYPES.TALL, OBSTACLE_TYPES.WIDE, OBSTACLE_TYPES.FLYING];
    }
    return [OBSTACLE_TYPES.LOW, OBSTACLE_TYPES.TALL, OBSTACLE_TYPES.WIDE, OBSTACLE_TYPES.FLYING, OBSTACLE_TYPES.FLYING];
  }

  /**
   * Calcula a distância mínima segura até o próximo obstáculo, garantindo
   * que sempre exista tempo suficiente de reação/pulo em qualquer velocidade.
   */
  computeMinGap(speedPxPerSec, tier) {
    const reactionTime = 0.5;       // tempo mínimo de reação humana confortável
    const jumpClearTime = 0.75;     // tempo aproximado para completar um pulo (com folga)
    const safety = tier >= 3 ? 0.08 : 0.18; // combos mais justos apenas no tier mais alto
    return speedPxPerSec * (reactionTime + jumpClearTime + safety);
  }

  update(dt, speedPxPerSec, score) {
    // move e remove obstáculos antigos
    this.obstacles.forEach(o => o.update(dt, speedPxPerSec));
    this.obstacles = this.obstacles.filter(o => !o.isOffscreen());

    // controla o espaçamento por distância percorrida (não por tempo fixo),
    // o que mantém a progressão consistente independente do FPS.
    this.distanceSinceSpawn += speedPxPerSec * dt;

    if (this.distanceSinceSpawn >= this.nextSpawnDistance) {
      this.spawnNext(speedPxPerSec, score);
      this.distanceSinceSpawn = 0;
      const tier = this.getTier(score);
      const minGap = this.computeMinGap(speedPxPerSec, tier);
      const extra = minGap * (0.3 + Math.random() * 0.9);
      this.nextSpawnDistance = minGap + extra;
    }
  }

  spawnNext(speedPxPerSec, score) {
    const tier = this.getTier(score);
    const pool = this.pickTypePool(tier);
    const type = pool[Math.floor(Math.random() * pool.length)];
    const obstacle = new Obstacle(type, this.canvasWidth + 20, this.groundY);
    this.obstacles.push(obstacle);

    // combos no tier 3: chance de adicionar um segundo obstáculo próximo,
    // mas sempre respeitando um espaçamento superável.
    if (tier >= 3 && Math.random() < 0.28) {
      const comboGap = this.computeMinGap(speedPxPerSec, tier) * 0.55;
      const secondType = type === OBSTACLE_TYPES.FLYING ? OBSTACLE_TYPES.LOW : OBSTACLE_TYPES.FLYING;
      const second = new Obstacle(secondType, this.canvasWidth + 20 + obstacle.width + comboGap, this.groundY);
      this.obstacles.push(second);
    }
  }

  draw(ctx) {
    this.obstacles.forEach(o => o.draw(ctx));
  }

  /** Retorna true se algum obstáculo colide com a hitbox do jogador. */
  checkCollision(playerHitbox) {
    return this.obstacles.some(o => {
      const hb = o.getHitbox();
      return (
        playerHitbox.x < hb.x + hb.width &&
        playerHitbox.x + playerHitbox.width > hb.x &&
        playerHitbox.y < hb.y + hb.height &&
        playerHitbox.y + playerHitbox.height > hb.y
      );
    });
  }
}
