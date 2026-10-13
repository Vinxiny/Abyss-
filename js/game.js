// High-polish Three.js renderer – anime-style characters, dual camera, effects

class Game {
  constructor() {
    this.world = new World();
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.running = false;
    this.cameraMode = localStorage.getItem('camMode') || 'iso';
    this.meshes = { players: new Map(), enemies: new Map(), projectiles: [], ryo: null, ground: null, effects: [] };
    this.input = { up: false, down: false, left: false, right: false, joyX: 0, joyY: 0 };
    window._input = this.input;
  }

  initRenderer() {
    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0612);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0612, 0.016);

    // Dramatic anime lighting
    const amb = new THREE.AmbientLight(0x2a1a4a, 0.45);
    this.scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffc0e0, 0.9);
    dir.position.set(15, 28, 12);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 1024;
    dir.shadow.mapSize.height = 1024;
    this.scene.add(dir);
    const rim = new THREE.DirectionalLight(0x7c3aed, 0.35);
    rim.position.set(-10, 8, -15);
    this.scene.add(rim);
    const point = new THREE.PointLight(0xc084fc, 0.7, 50);
    point.position.set(0, 10, 0);
    this.scene.add(point);

    // Ground with subtle grid feel
    const groundGeo = new THREE.PlaneGeometry(95, 95, 24, 24);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x140c22,
      roughness: 0.92,
      metalness: 0.08
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.meshes.ground = ground;

    // Atmospheric pillars
    for (let i = 0; i < 22; i++) {
      const h = 2.5 + Math.random() * 6;
      const geo = new THREE.CylinderGeometry(0.35 + Math.random() * 0.5, 0.55, h, 6);
      const mat = new THREE.MeshStandardMaterial({ color: 0x1e1235, roughness: 0.95, emissive: 0x0a0515, emissiveIntensity: 0.2 });
      const m = new THREE.Mesh(geo, mat);
      m.position.set((Math.random() - 0.5) * 75, h / 2, (Math.random() - 0.5) * 75);
      m.castShadow = true;
      this.scene.add(m);
    }

    // Floating embers / particles for anime atmosphere
    const embGeo = new THREE.BufferGeometry();
    const embCount = 80;
    const pos = new Float32Array(embCount * 3);
    for (let i = 0; i < embCount; i++) {
      pos[i*3] = (Math.random()-0.5)*80;
      pos[i*3+1] = Math.random()*12;
      pos[i*3+2] = (Math.random()-0.5)*80;
    }
    embGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const embMat = new THREE.PointsMaterial({ color: 0xc084fc, size: 0.18, transparent: true, opacity: 0.6 });
    this.embers = new THREE.Points(embGeo, embMat);
    this.scene.add(this.embers);

    this.setCameraMode(this.cameraMode);

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.camera.isPerspectiveCamera) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    } else {
      const aspect = window.innerWidth / window.innerHeight;
      const d = 26;
      this.camera.left = -d * aspect;
      this.camera.right = d * aspect;
      this.camera.top = d;
      this.camera.bottom = -d;
      this.camera.updateProjectionMatrix();
    }
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    localStorage.setItem('camMode', mode);
    document.getElementById('btn-cam-iso')?.classList.toggle('active', mode === 'iso');
    document.getElementById('btn-cam-third')?.classList.toggle('active', mode === 'third');

    if (mode === 'iso') {
      const aspect = window.innerWidth / window.innerHeight;
      const d = 26;
      this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 200);
      this.camera.position.set(28, 32, 28);
      this.camera.lookAt(0, 0, 0);
    } else {
      this.camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 200);
      this.camera.position.set(0, 7.5, 13);
    }
  }

  // Anime-style character: big head, expressive silhouette, magic aura
  createPlayerMesh(player) {
    const group = new THREE.Group();

    // Body (slim anime proportions)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: player.color, roughness: 0.35, metalness: 0.25,
      emissive: player.color, emissiveIntensity: 0.12
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.85, 6, 10), bodyMat);
    body.position.y = 0.95;
    body.castShadow = true;
    group.add(body);

    // Oversized anime head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffe4d6, roughness: 0.55 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), headMat);
    head.position.y = 1.85;
    head.castShadow = true;
    group.add(head);

    // Hair (simple stylized)
    const hairMat = new THREE.MeshStandardMaterial({ color: player.color, roughness: 0.7 });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    hair.position.y = 2.05;
    group.add(hair);

    // Magic aura ring at feet
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.04, 8, 24),
      new THREE.MeshBasicMaterial({ color: player.color, transparent: true, opacity: 0.7 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    group.add(ring);

    // Small shoulder cape for anime flair
    const cape = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 0.9, 6, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x1a1025, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    cape.position.y = 1.15;
    cape.rotation.x = 0.15;
    group.add(cape);

    // Floating name tag (anime style)
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.moveTo(12,8); ctx.lineTo(244,8); ctx.quadraticCurveTo(256,8,256,20); ctx.lineTo(256,44); ctx.quadraticCurveTo(256,56,244,56); ctx.lineTo(12,56); ctx.quadraticCurveTo(0,56,0,44); ctx.lineTo(0,20); ctx.quadraticCurveTo(0,8,12,8); ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8e0ff';
    ctx.fillText(player.name.substring(0, 12), 128, 40);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.2, 0.55, 1);
    sprite.position.y = 2.7;
    group.add(sprite);

    group.position.set(player.x, 0, player.z);
    this.scene.add(group);
    this.meshes.players.set(player, group);
    return group;
  }

  createEnemyMesh(enemy) {
    const size = enemy.type === 'boss' ? 1.4 : enemy.type === 'elite' ? 0.95 : 0.62;
    const geo = new THREE.IcosahedronGeometry(size, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: enemy.color, roughness: 0.4, metalness: 0.5,
      emissive: enemy.color, emissiveIntensity: 0.22
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(enemy.x, size * 0.9, enemy.z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.meshes.enemies.set(enemy, mesh);
    return mesh;
  }

  createRyoMesh() {
    if (!this.world.ryo) return;
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.3, metalness: 0.45, emissive: 0x2e1065, emissiveIntensity: 0.15 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.0, 6, 10), bodyMat);
    body.position.y = 1.1;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 10), new THREE.MeshStandardMaterial({ color: 0xe8c4a8 }));
    head.position.y = 2.05;
    group.add(head);

    // Long dark coat
    const coat = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 1.7, 8, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0f0a1a, side: THREE.DoubleSide })
    );
    coat.position.y = 1.0;
    group.add(coat);

    // Cigar glow (tiny point)
    const glow = new THREE.PointLight(0xf97316, 0.5, 3);
    glow.position.set(0.3, 1.9, 0.3);
    group.add(glow);

    group.position.set(this.world.ryo.x, 0, this.world.ryo.z);
    this.scene.add(group);
    this.meshes.ryo = group;
  }

  start(playersData, layer = 1) {
    this.world = new World();
    this.world.init(layer);
    this.world.onTeamWipe = () => this.teamWipe();

    this.meshes.players.forEach(m => this.scene.remove(m));
    this.meshes.enemies.forEach(m => this.scene.remove(m));
    this.meshes.players.clear();
    this.meshes.enemies.clear();
    if (this.meshes.ryo) this.scene.remove(this.meshes.ryo);

    playersData.forEach((pd, i) => {
      const angle = (i / Math.max(playersData.length, 1)) * Math.PI * 2;
      const p = new Player(Math.cos(angle) * 3.5, Math.sin(angle) * 3.5, pd.magic, pd.name, pd.isHealer, pd.id === Net.localId);
      p.id = pd.id; // critical for remote state matching
      this.world.addPlayer(p);
      this.createPlayerMesh(p);
    });

    this.world.setRyo(0, -7);
    this.createRyoMesh();
    this.world.spawnWave();

    // Network remote state handler – so we see other players move live
    Net.onRemoteState = (id, state) => {
      const p = this.world.players.find(pl => pl.id === id);
      if (p && !p.isLocal) {
        p.x = state.x;
        p.z = state.z;
        p.facing = state.facing;
        p.hp = state.hp;
        p.mana = state.mana;
        p.alive = state.alive;
      }
    };
    Net.onRemoteAbility = (id, slot, extra) => {
      const p = this.world.players.find(pl => pl.id === id);
      if (p && !p.isLocal) p.tryAbility(slot, this.world);
    };

    this.running = true;
    this.clock.start();
    this.loop();

    if ('ontouchstart' in window) {
      document.getElementById('mobile-controls').classList.remove('hidden');
    }
  }

  loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.world.update(dt);
    this.syncMeshes(dt);
    this.updateCamera();
    this.updateHUD();

    // Broadcast local player state ~15 times per second
    if (!this._netAcc) this._netAcc = 0;
    this._netAcc += dt;
    if (this._netAcc > 0.066) {
      this._netAcc = 0;
      const local = this.world.getLocalPlayer();
      if (local) {
        Net.sendState({
          x: local.x, z: local.z, facing: local.facing,
          hp: local.hp, mana: local.mana, alive: local.alive
        });
      }
    }

    // Animate embers
    if (this.embers) {
      this.embers.rotation.y += dt * 0.05;
      const pos = this.embers.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i+1] += dt * 0.4;
        if (pos[i+1] > 14) pos[i+1] = 0;
      }
      this.embers.geometry.attributes.position.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  syncMeshes(dt) {
    this.world.players.forEach(p => {
      let mesh = this.meshes.players.get(p);
      if (!mesh) mesh = this.createPlayerMesh(p);
      mesh.position.set(p.x, 0, p.z);
      mesh.rotation.y = p.facing;
      mesh.visible = p.alive;
      if (!p.alive) mesh.position.y = -0.6;
      // Subtle idle bounce for living
      if (p.alive) mesh.position.y = Math.sin(performance.now() * 0.004 + p.x) * 0.04;
    });

    this.world.enemies.forEach(e => {
      let mesh = this.meshes.enemies.get(e);
      if (!mesh) mesh = this.createEnemyMesh(e);
      mesh.position.set(e.x, e.radius * 0.9, e.z);
      mesh.visible = e.alive;
      if (e.alive) {
        mesh.rotation.y += dt * 0.8;
        mesh.position.y += Math.sin(e.pulse) * 0.08;
      }
    });

    if (this.world.ryo && this.meshes.ryo) {
      this.meshes.ryo.position.set(this.world.ryo.x, 0, this.world.ryo.z);
    }
  }

  updateCamera() {
    const local = this.world.getLocalPlayer();
    if (!local) return;

    if (this.cameraMode === 'iso') {
      const targetX = local.x + 26;
      const targetZ = local.z + 26;
      this.camera.position.x += (targetX - this.camera.position.x) * 0.07;
      this.camera.position.z += (targetZ - this.camera.position.z) * 0.07;
      this.camera.lookAt(local.x, 0, local.z);
    } else {
      const dist = 10.5;
      const height = 5.8;
      const tx = local.x - Math.sin(local.facing) * dist;
      const tz = local.z - Math.cos(local.facing) * dist;
      this.camera.position.x += (tx - this.camera.position.x) * 0.11;
      this.camera.position.z += (tz - this.camera.position.z) * 0.11;
      this.camera.position.y += (height - this.camera.position.y) * 0.11;
      this.camera.lookAt(local.x, 1.4, local.z);
    }
  }

  updateHUD() {
    const local = this.world.getLocalPlayer();
    if (!local) return;
    document.getElementById('hp-fill').style.width = ((local.hp / local.maxHp) * 100) + '%';
    document.getElementById('mana-fill').style.width = ((local.mana / local.maxMana) * 100) + '%';
    document.getElementById('gold-display').textContent = 'Gold: ' + local.gold;
    const layerNames = ['', "Hell's Gate", 'Circles of Torment', 'Devil Citadel', 'Abyssal Core'];
    document.getElementById('layer-info').textContent = `Layer ${this.world.layer} – ${layerNames[this.world.layer] || 'Deep Abyss'}`;
    document.querySelectorAll('.ability').forEach((el, i) => {
      el.classList.toggle('cooldown', local.cooldowns[i] > 0);
    });
  }

  teamWipe() {
    this.running = false;
    document.getElementById('game-hud').classList.add('hidden');
    document.getElementById('game-over').classList.remove('hidden');
    Audio.death();
  }

  stop() {
    this.running = false;
  }
}

const game = new Game();
