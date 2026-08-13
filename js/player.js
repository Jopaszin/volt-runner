/**
 * player.js
 * Personagem original: um "bolt" geométrico neon que corre, pula e desliza.
 * Toda a animação é desenhada proceduralmente no Canvas (sem sprites).
 */
class Player {
  constructor(groundY) {
    this.groundY = groundY;

    this.standWidth = 40;
    this.standHeight = 54;
    this.duckWidth = 56;
    this.duckHeight = 30;

    this.width = this.standWidth;
    this.height = this.standHeight;

    this.x = 90;
    this.y = this.groundY - this.height;

    this.velocityY = 0;
    this.gravity = 2600;      // px/s^2
    this.fastFallGravity = 8000; // Gravidade aumentada ao agachar no ar (Fast Fall)
    this.jumpForce = -650;    // px/s
    this.maxFallSpeed = 1800;

    this.isJumping = false;
    this.isDucking = false;
    this.isDead = false;

    this.runPhase = 0;       // controla a animação de corrida (0..1)
    this.deathTimer = 0;
    this.deathSpin = 0;

    this.hueShift = 0;
  }

  reset() {
    this.width = this.standWidth;
    this.height = this.standHeight;
    this.y = this.groundY - this.height;
    this.velocityY = 0;
    this.isJumping = false;
    this.isDucking = false;
    this.isDead = false;
    this.runPhase = 0;
    this.deathTimer = 0;
    this.deathSpin = 0;
  }

  jump() {
    if (this.isDead) return;
    if (this.isJumping) return;
    this.isJumping = true;
    this.isDucking = false;
    this.width = this.standWidth;
    this.height = this.standHeight;
    this.velocityY = this.jumpForce;
    AudioFX.playJump();
  }

  setDucking(active) {
    if (this.isDead) return;
    
    if (active) {
      if (!this.isDucking && !this.isJumping) AudioFX.playDuck();
      this.isDucking = true;
      this.width = this.duckWidth;
      this.height = this.duckHeight;
      
      // Ajusta posição visual imediatamente se estiver no chão
      if (!this.isJumping) {
        this.y = this.groundY - this.height;
      }
    } else {
      this.isDucking = false;
      this.width = this.standWidth;
      this.height = this.standHeight;
      if (!this.isJumping) this.y = this.groundY - this.height;
    }
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.deathTimer = 0;
    AudioFX.playHit();
  }

  /** Retorna hitbox levemente reduzida para colisão mais justa/agradável. */
  getHitbox() {
    const pad = 6;
    return {
      x: this.x + pad,
      y: this.y + pad,
      width: this.width - pad * 2,
      height: this.height - pad * 2
    };
  }

  update(dt, speedPxPerSec) {
    if (this.isDead) {
      this.deathTimer += dt;
      this.deathSpin += dt * 6;
      return;
    }

    // física vertical
    if (this.isJumping) {
      // Aplica gravidade normal ou gravidade de queda rápida se estiver agachado no ar
      const currentGravity = this.isDucking ? this.fastFallGravity : this.gravity;
      this.velocityY += currentGravity * dt;
      this.velocityY = Math.min(this.velocityY, this.maxFallSpeed);
      this.y += this.velocityY * dt;

      // Colisão com o chão
      if (this.y >= this.groundY - this.height) {
        this.y = this.groundY - this.height;
        this.isJumping = false;
        this.velocityY = 0;
      }
    } else {
      this.y = this.groundY - this.height;
    }

    // animação de corrida: velocidade da passada acompanha a velocidade do jogo
    if (!this.isJumping) {
      this.runPhase += dt * (speedPxPerSec / 60);
    } else {
      this.runPhase += dt * 4;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

    if (this.isDead) {
      // gira e treme brevemente ao morrer, depois se estabiliza (não desaparece)
      const settle = Math.min(1, this.deathTimer / 0.5);
      ctx.rotate(Math.sin(this.deathSpin) * 0.3 * (1 - settle));
      ctx.globalAlpha = Math.max(0.55, 1 - this.deathTimer * 0.6);
    }

    const bodyColor = this.isDead ? '#ff4d5e' : '#00f0ff';
    const glow = this.isDead ? 'rgba(255,77,94,0.55)' : 'rgba(0,240,255,0.5)';

    // legs (animação de corrida simples - dois traços oscilantes)
    if (!this.isDead) {
      const legSwing = Math.sin(this.runPhase * 10) * (this.height * 0.28);
      ctx.strokeStyle = '#0090ff';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      const legY = this.height / 2 - 2;
      ctx.beginPath();
      ctx.moveTo(-this.width * 0.18, legY);
      ctx.lineTo(-this.width * 0.18 + legSwing * 0.3, legY + Math.abs(legSwing));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.width * 0.18, legY);
      ctx.lineTo(this.width * 0.18 - legSwing * 0.3, legY - legSwing * 0.2 + Math.abs(legSwing));
      ctx.stroke();
    }

    // corpo (hexágono estilizado, "bolt runner")
    ctx.shadowColor = glow;
    ctx.shadowBlur = 16;
    ctx.fillStyle = bodyColor;

    const w = this.width * 0.86;
    const h = this.height * 0.86;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, -h * 0.15);
    ctx.lineTo(-w * 0.3, -h * 0.5);
    ctx.lineTo(w * 0.3, -h * 0.5);
    ctx.lineTo(w * 0.5, -h * 0.15);
    ctx.lineTo(w * 0.5, h * 0.35);
    ctx.lineTo(w * 0.2, h * 0.5);
    ctx.lineTo(-w * 0.2, h * 0.5);
    ctx.lineTo(-w * 0.5, h * 0.35);
    ctx.closePath();
    ctx.fill();

    // "raio" central (identidade visual)
    ctx.shadowBlur = 0;
    ctx.fillStyle = this.isDead ? '#2b0a0d' : '#031018';
    ctx.beginPath();
    ctx.moveTo(-2, -h * 0.32);
    ctx.lineTo(6, -h * 0.02);
    ctx.lineTo(-1, -h * 0.02);
    ctx.lineTo(4, h * 0.32);
    ctx.lineTo(-8, h * 0.02);
    ctx.lineTo(0, h * 0.02);
    ctx.closePath();
    ctx.fill();

    // "olho" (dá vida ao personagem)
    if (!this.isDead) {
      ctx.fillStyle = '#031018';
      ctx.beginPath();
      ctx.arc(w * 0.22, -h * 0.22, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#2b0a0d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.15, -h * 0.28);
      ctx.lineTo(w * 0.28, -h * 0.16);
      ctx.moveTo(w * 0.28, -h * 0.28);
      ctx.lineTo(w * 0.15, -h * 0.16);
      ctx.stroke();
    }

    ctx.restore();
  }
}