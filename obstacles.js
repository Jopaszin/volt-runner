/**
 * obstacles.js
 * Geração procedural de obstáculos com altura corrigida para voador
 * e controle rigoroso de distância para evitar sobreposição de combos.
 */

const OBSTACLE_TYPES = {
  LOW: 'low',        // pequeno no chão -> pular
  TALL: 'tall',      // alto no chão -> pular
  WIDE: 'wide',      // cluster largo no chão -> pular
  FLYING: 'flying'   // obstáculo aéreo -> OBRIGA ABAIXAR
};

class Obstacle {
  constructor(type, x, groundY) {
    this.type = type;
    this.groundY = groundY;
    this.passed = false;

    switch (type) {
      case OBSTACLE_TYPES.LOW:
        this.width = 28;
        this.height = 36;
        this.y = groundY - this.height;
        break;

      case OBSTACLE_TYPES.TALL:
        this.width = 26;
        this.height = 58;
        this.y = groundY - this.height;
        break;

      case OBSTACLE_TYPES.WIDE:
        this.width = 62;
        this.height = 32;
        this.y = groundY - this.height;
        break;

      case OBSTACLE_TYPES.FLYING:
        this.width = 58;
        this.height = 40;
        // Mantida a altura definida no seu código
        this.y = groundY - 78; 
        break;
    }
    this.x = x;
    this.wobble = Math.random() * Math.PI * 2;
  }

  update(dt, speedPxPerSec) {
    this.x -= speedPxPerSec * dt;
    if (this.type === OBSTACLE_TYPES.FLYING) {
      this.wobble += dt * 5;
    }
  }

  getHitbox() {
    const pad = 3;
    return {
      x: this.x + pad,
      y: this.y + pad,
      width: Math.max(1, this.width - pad * 2),
      height: Math.max(1, this.height - pad * 2)
    };
  }

  isOffscreen() {
    return this.x + this.width < -10;
  }

  draw(ctx) {
    ctx.save();
    const glow = this.type === OBSTACLE_TYPES.FLYING ? 'rgba(255,47,176,0.65)' : 'rgba(255,210,63,0.55)';
    const color = this.type === OBSTACLE_TYPES.FLYING ? '#ff2fb0' : '#ffd23f';

    ctx.shadowColor = glow;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;

    if (this.type === OBSTACLE_TYPES.FLYING) {
      const floatY = this.y + Math.sin(this.wobble) * 3;
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
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x + 4, floatY + this.height / 2);
      ctx.lineTo(this.x + this.width - 4, floatY + this.height / 2);
      ctx.stroke();
    } else if (this.type === OBSTACLE_TYPES.WIDE) {
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
    this.nextSpawnDistance = 350;
  }

  reset() {
    this.obstacles = [];
    this.distanceSinceSpawn = 0;
    this.nextSpawnDistance = 350;
  }

  getTier(score) {
    if (score < 250) return 1;
    if (score < 700) return 2;
    if (score < 1500) return 3;
    return 4;
  }

  pickTypePool(tier) {
    if (tier === 1) {
      return [OBSTACLE_TYPES.LOW, OBSTACLE_TYPES.LOW, OBSTACLE_TYPES.FLYING];
    }
    if (tier === 2) {
      return [OBSTACLE_TYPES.LOW, OBSTACLE_TYPES.TALL, OBSTACLE_TYPES.FLYING];
    }
    if (tier === 3) {
      return [OBSTACLE_TYPES.LOW, OBSTACLE_TYPES.TALL, OBSTACLE_TYPES.WIDE, OBSTACLE_TYPES.FLYING];
    }
    return [OBSTACLE_TYPES.TALL, OBSTACLE_TYPES.WIDE, OBSTACLE_TYPES.FLYING, OBSTACLE_TYPES.FLYING];
  }

  computeMinGap(speedPxPerSec) {
    return 320 + (speedPxPerSec * 0.30);
  }

  update(dt, speedPxPerSec, score) {
    this.obstacles.forEach(o => o.update(dt, speedPxPerSec));
    this.obstacles = this.obstacles.filter(o => !o.isOffscreen());

    this.distanceSinceSpawn += speedPxPerSec * dt;

    if (this.distanceSinceSpawn >= this.nextSpawnDistance) {
      const { lastType, totalLength } = this.spawnNext(speedPxPerSec, score);
      this.distanceSinceSpawn = 0;
      
      let minGap = this.computeMinGap(speedPxPerSec);

      // Se o último item da sequência foi FLYING, adiciona folga para levantar
      if (lastType === OBSTACLE_TYPES.FLYING) {
        minGap += 180 + (speedPxPerSec * 0.15);
      }
      
      const extra = Math.random() * 120;
      // Adiciona a largura ocupada pela sequência ao cálculo da próxima distância
      this.nextSpawnDistance = minGap + totalLength + extra;
    }
  }

  spawnNext(speedPxPerSec, score) {
    const tier = this.getTier(score);
    const pool = this.pickTypePool(tier);
    const type = pool[Math.floor(Math.random() * pool.length)];
    
    const firstObs = new Obstacle(type, this.canvasWidth + 20, this.groundY);
    this.obstacles.push(firstObs);

    let lastType = type;
    let totalLength = firstObs.width;

    // Chance de Combo (chão + aéreo)
    const comboChance = tier === 1 ? 0 : (tier === 2 ? 0.15 : 0.25);

    if (Math.random() < comboChance) {
      const comboGap = 260 + (speedPxPerSec * 0.20);
      const secondType = type === OBSTACLE_TYPES.FLYING ? OBSTACLE_TYPES.LOW : OBSTACLE_TYPES.FLYING;
      
      const secondObs = new Obstacle(
        secondType, 
        this.canvasWidth + 20 + firstObs.width + comboGap, 
        this.groundY
      );
      this.obstacles.push(secondObs);

      lastType = secondType;
      totalLength += comboGap + secondObs.width;
    }

    return { lastType, totalLength };
  }

  draw(ctx) {
    this.obstacles.forEach(o => o.draw(ctx));
  }

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