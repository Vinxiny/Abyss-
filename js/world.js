// World / Level management, spawning, camera helpers

class World {
  constructor() {
    this.players = [];
    this.enemies = [];
    this.projectiles = [];
    this.ryo = null;
    this.layer = 1;
    this.gold = 0; // shared team gold for simplicity in prototype
    this.waveTimer = 0;
    this.spawnPoints = [];
    this.tauntEl = null;
    this.ryoEl = null;
    this.onTeamWipe = null;
  }

  init(layer = 1) {
    this.layer = layer;
    this.enemies = [];
    this.projectiles = [];
    this.waveTimer = 3;
    this.spawnPoints = [
      { x: -20, z: -15 }, { x: 20, z: -15 },
      { x: -25, z: 10 }, { x: 25, z: 10 },
      { x: 0, z: -25 }, { x: -15, z: 20 }, { x: 15, z: 20 }
    ];
  }

  addPlayer(p) {
    this.players.push(p);
  }

  setRyo(x, z) {
    this.ryo = new CaptainRyo(x, z);
  }

  spawnEnemy(x, z, type = 'lesser') {
    // Scale difficulty by layer
    const e = new Enemy(x, z, type);
    if (this.layer >= 2) {
      e.maxHp = Math.floor(e.maxHp * 1.35);
      e.hp = e.maxHp;
      e.damage = Math.floor(e.damage * 1.2);
    }
    if (this.layer >= 3) {
      e.maxHp = Math.floor(e.maxHp * 1.5);
      e.hp = e.maxHp;
      e.damage = Math.floor(e.damage * 1.3);
      e.speed *= 1.1;
    }
    this.enemies.push(e);
    return e;
  }

  spawnWave() {
    const base = 3 + this.layer * 2;
    const elites = this.layer >= 2 ? Math.floor(this.layer / 2) : 0;
    for (let i = 0; i < base; i++) {
      const sp = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
      const ox = (Math.random() - 0.5) * 6;
      const oz = (Math.random() - 0.5) * 6;
      this.spawnEnemy(sp.x + ox, sp.z + oz, 'lesser');
    }
    for (let i = 0; i < elites; i++) {
      const sp = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
      this.spawnEnemy(sp.x, sp.z, 'elite');
    }
    if (this.layer >= 3 && Math.random() < 0.3) {
      // occasional mini-boss feel
      const sp = this.spawnPoints[0];
      this.spawnEnemy(sp.x, sp.z, 'elite');
    }
  }

  update(dt) {
    // Players
    this.players.forEach(p => p.update(dt, p.isLocal ? window._input : null, this));

    // Ryo
    if (this.ryo) this.ryo.update(dt, this);

    // Enemies
    this.enemies.forEach(e => e.update(dt, this));

    // Projectiles
    this.projectiles.forEach(p => p.update(dt, this));
    this.projectiles = this.projectiles.filter(p => p.alive);

    // Clean dead enemies after short delay (keep for visual)
    // We keep them marked alive=false so meshes can react

    // Wave timer
    this.waveTimer -= dt;
    if (this.waveTimer <= 0 && this.enemies.filter(e => e.alive).length < 4) {
      this.spawnWave();
      this.waveTimer = 18 - this.layer * 2;
    }

    // Team wipe check
    const living = this.players.filter(p => p.alive).length;
    if (this.players.length > 0 && living === 0) {
      if (this.onTeamWipe) this.onTeamWipe();
    }
  }

  showTaunt(text) {
    const el = document.getElementById('enemy-taunt');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.add('hidden'), 3400);
  }

  showRyo(text) {
    const el = document.getElementById('ryo-banner');
    if (!el) return;
    el.textContent = 'Ryo: ' + text;
    el.classList.remove('hidden');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.add('hidden'), 3400);
  }

  getLocalPlayer() {
    return this.players.find(p => p.isLocal);
  }
}
