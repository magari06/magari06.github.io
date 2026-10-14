/**
 * VISUAL EFFECTS & ARENA ENVIRONMENT MODULE (V3 - STABLE & HIGHLY REACTIVE)
 * Features:
 * - 3D Checkered Cube Matrix Floor directly driven by Sub-Bass & Tempo (No bugged elevation!)
 * - Volumetric 3D Equalizer Columns on all 4 walls with studio ballistic meters
 * - 3D Volumetric Particles distributed throughout the ENTIRE 3D cube (No flat lines!)
 * - Dynamic spotlights, neon boundaries, and kick shockwaves
 */

class EffectsManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.shockwaves = [];
    this.floorRipples = [];

    this.eqWallBars = [];     // 4 walls volumetric equalizer pillars
    this.eqFloorBars = [];    // Floor perimeter trenches

    this.cameraShakeTrauma = 0;
    this.floorReactivity = 1.0; // Adjustable via UI

    // Theme palette
    this.themeColors = {
      primary: new THREE.Color(0x00f0ff),
      secondary: new THREE.Color(0xff007f),
      accent: new THREE.Color(0x9d00ff),
      tileA: new THREE.Color(0x0c1222),
      tileB: new THREE.Color(0x16223d)
    };

    this.initArena();
    this.init3DCheckeredFloor();
    this.initVolumetricEqualizers();
    this.initVolumetricParticles(1200); // Dense 3D volumetric particles
  }

  setTheme(themeName) {
    let p = 0x00f0ff, s = 0xff007f, a = 0x9d00ff;
    if (themeName === 'synthwave') { p = 0xff71ce; s = 0x01cdfe; a = 0xb967ff; }
    else if (themeName === 'matrix') { p = 0x00ff66; s = 0xa6ff00; a = 0x00b33c; }
    else if (themeName === 'crimson') { p = 0xff2a2a; s = 0xff8c00; a = 0xff0055; }
    else if (themeName === 'gold') { p = 0xffcc00; s = 0xff6600; a = 0xffe600; }

    this.themeColors.primary.setHex(p);
    this.themeColors.secondary.setHex(s);
    this.themeColors.accent.setHex(a);

    if (this.arenaLines) {
      this.arenaLines.material.color.copy(this.themeColors.primary);
    }
    this.updateFloorColors();
  }

  // =========================================================================
  // 1. ARENA BOUNDS & NEON CAGE
  // =========================================================================
  initArena() {
    this.bounds = {
      minX: -26,
      maxX: 26,
      minY: -12,
      maxY: 22,
      minZ: -26,
      maxZ: 26
    };

    const width = this.bounds.maxX - this.bounds.minX;  // 52
    const height = this.bounds.maxY - this.bounds.minY; // 34
    const depth = this.bounds.maxZ - this.bounds.minZ;  // 52
    const centerY = (this.bounds.minY + this.bounds.maxY) / 2;

    const boxGeo = new THREE.BoxGeometry(width, height, depth);
    const edges = new THREE.EdgesGeometry(boxGeo);
    const lineMat = new THREE.LineBasicMaterial({
      color: this.themeColors.primary,
      transparent: true,
      opacity: 0.65,
      linewidth: 2
    });
    this.arenaLines = new THREE.LineSegments(edges, lineMat);
    this.arenaLines.position.set(0, centerY, 0);
    this.scene.add(this.arenaLines);

    // Corner Spotlights
    this.spotlights = [];
    const spotCoords = [
      { x: this.bounds.minX + 2, y: this.bounds.maxY - 2, z: this.bounds.minZ + 2 },
      { x: this.bounds.maxX - 2, y: this.bounds.maxY - 2, z: this.bounds.minZ + 2 },
      { x: this.bounds.minX + 2, y: this.bounds.maxY - 2, z: this.bounds.maxZ - 2 },
      { x: this.bounds.maxX - 2, y: this.bounds.maxY - 2, z: this.bounds.maxZ - 2 }
    ];

    for (let c of spotCoords) {
      const light = new THREE.SpotLight(this.themeColors.primary, 3.5, 75, Math.PI / 4, 0.5, 1.2);
      light.position.set(c.x, c.y, c.z);
      light.target.position.set(0, 0, 0);
      this.scene.add(light);
      this.scene.add(light.target);
      this.spotlights.push(light);

      const fixtureGeo = new THREE.CylinderGeometry(0.7, 1.0, 1.4, 16);
      const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x141a29, metalness: 0.9 });
      const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixture.position.set(c.x, c.y, c.z);
      this.scene.add(fixture);
    }
  }

  // =========================================================================
  // 2. 3D CHECKERED CUBE MATRIX FLOOR (HIGHLY AUDIO-REACTIVE & STABLE)
  // =========================================================================
  init3DCheckeredFloor() {
    this.floorGridSize = 22; // 22 x 22 = 484 interactive cubes
    const count = this.floorGridSize * this.floorGridSize;

    const width = this.bounds.maxX - this.bounds.minX; // 52
    const depth = this.bounds.maxZ - this.bounds.minZ; // 52
    const stepX = (width - 2) / this.floorGridSize;
    const stepZ = (depth - 2) / this.floorGridSize;
    this.tileStep = stepX;

    const cubeWidth = stepX * 0.92;
    const cubeHeight = 1.4;
    const cubeDepth = stepZ * 0.92;
    const tileGeo = new THREE.BoxGeometry(cubeWidth, cubeHeight, cubeDepth);
    tileGeo.translate(0, cubeHeight / 2, 0);

    const tileMat = new THREE.MeshStandardMaterial({
      roughness: 0.35,
      metalness: 0.75
    });

    this.floorMesh = new THREE.InstancedMesh(tileGeo, tileMat, count);
    this.floorMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.tileData = [];
    const dummy = new THREE.Object3D();
    const startX = this.bounds.minX + 1 + stepX / 2;
    const startZ = this.bounds.minZ + 1 + stepZ / 2;

    for (let gx = 0; gx < this.floorGridSize; gx++) {
      for (let gz = 0; gz < this.floorGridSize; gz++) {
        const index = gx * this.floorGridSize + gz;
        const x = startX + gx * stepX;
        const z = startZ + gz * stepZ;
        const distFromCenter = Math.sqrt(x * x + z * z);
        const isCheckered = (gx + gz) % 2 === 0;

        dummy.position.set(x, this.bounds.minY, z);
        dummy.updateMatrix();
        this.floorMesh.setMatrixAt(index, dummy.matrix);

        this.tileData.push({
          index: index,
          gx: gx,
          gz: gz,
          x: x,
          z: z,
          dist: distFromCenter,
          isCheckered: isCheckered,
          currentY: this.bounds.minY,
          targetY: this.bounds.minY
        });
      }
    }

    this.floorMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.floorMesh);
    this.updateFloorColors();
  }

  updateFloorColors() {
    if (!this.floorMesh) return;
    const dummyColor = new THREE.Color();

    for (let i = 0; i < this.tileData.length; i++) {
      const tile = this.tileData[i];
      if (tile.isCheckered) {
        dummyColor.copy(this.themeColors.tileA);
      } else {
        dummyColor.copy(this.themeColors.tileB);
      }
      this.floorMesh.setColorAt(i, dummyColor);
    }
    if (this.floorMesh.instanceColor) {
      this.floorMesh.instanceColor.needsUpdate = true;
    }
  }

  // =========================================================================
  // 3. VOLUMETRIC 3D EQUALIZER PILLARS ON ALL 4 WALLS & FLOOR PERIMETER
  // =========================================================================
  initVolumetricEqualizers() {
    const width = this.bounds.maxX - this.bounds.minX;  // 52
    const depth = this.bounds.maxZ - this.bounds.minZ;  // 52

    const wallPillarsGroup = new THREE.Group();

    const createPillar = (w, d, x, y, z, binIndex) => {
      const geo = new THREE.BoxGeometry(w, 1.0, d);
      geo.translate(0, 0.5, 0);

      const mat = new THREE.MeshStandardMaterial({
        color: this.themeColors.primary,
        emissive: this.themeColors.primary,
        emissiveIntensity: 0.45,
        roughness: 0.25,
        metalness: 0.8
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      wallPillarsGroup.add(mesh);

      return {
        mesh: mesh,
        binIndex: binIndex,
        currentHeight: 1.0
      };
    };

    // BACK WALL (Z = minZ): 28 pillars (Sub-bass & 808 kicks)
    const backCount = 28;
    const backStep = (width * 0.9) / backCount;
    const backStartX = -((width * 0.9) / 2) + backStep / 2;
    for (let i = 0; i < backCount; i++) {
      const x = backStartX + i * backStep;
      const pillar = createPillar(backStep * 0.78, 1.4, x, this.bounds.minY + 0.1, this.bounds.minZ + 0.8, Math.floor(i * 1.5));
      this.eqWallBars.push(pillar);
    }

    // FRONT WALL (Z = maxZ): 28 pillars (Highs & Trebles)
    const frontCount = 28;
    const frontStep = (width * 0.9) / frontCount;
    const frontStartX = -((width * 0.9) / 2) + frontStep / 2;
    for (let i = 0; i < frontCount; i++) {
      const x = frontStartX + i * frontStep;
      const pillar = createPillar(frontStep * 0.78, 1.4, x, this.bounds.minY + 0.1, this.bounds.maxZ - 0.8, Math.floor(i * 2.2));
      this.eqWallBars.push(pillar);
    }

    // LEFT WALL (X = minX): 22 pillars (Low Mids)
    const leftCount = 22;
    const leftStep = (depth * 0.9) / leftCount;
    const leftStartZ = -((depth * 0.9) / 2) + leftStep / 2;
    for (let i = 0; i < leftCount; i++) {
      const z = leftStartZ + i * leftStep;
      const pillar = createPillar(1.4, leftStep * 0.78, this.bounds.minX + 0.8, this.bounds.minY + 0.1, z, Math.floor(i * 2.0));
      this.eqWallBars.push(pillar);
    }

    // RIGHT WALL (X = maxX): 22 pillars (High Mids & Leads)
    const rightCount = 22;
    const rightStep = (depth * 0.9) / rightCount;
    const rightStartZ = -((depth * 0.9) / 2) + rightStep / 2;
    for (let i = 0; i < rightCount; i++) {
      const z = rightStartZ + i * rightStep;
      const pillar = createPillar(1.4, rightStep * 0.78, this.bounds.maxX - 0.8, this.bounds.minY + 0.1, z, Math.floor(i * 2.0));
      this.eqWallBars.push(pillar);
    }

    // FLOOR PERIMETER EQUALIZER TRENCHES
    const trenchStep = 4.2;
    const floorTrenches = [
      { start: this.bounds.minX + 4, end: this.bounds.maxX - 4, axis: 'x', constVal: this.bounds.minZ + 3.5 },
      { start: this.bounds.minX + 4, end: this.bounds.maxX - 4, axis: 'x', constVal: this.bounds.maxZ - 3.5 },
      { start: this.bounds.minZ + 4, end: this.bounds.maxZ - 4, axis: 'z', constVal: this.bounds.minX + 3.5 },
      { start: this.bounds.minZ + 4, end: this.bounds.maxZ - 4, axis: 'z', constVal: this.bounds.maxX - 3.5 }
    ];

    for (let t of floorTrenches) {
      const steps = Math.floor((t.end - t.start) / trenchStep);
      for (let s = 0; s < steps; s++) {
        const coord = t.start + s * trenchStep;
        let x = t.axis === 'x' ? coord : t.constVal;
        let z = t.axis === 'z' ? coord : t.constVal;
        const pillar = createPillar(1.2, 1.2, x, this.bounds.minY, z, (s * 3) % 40);
        this.eqFloorBars.push(pillar);
      }
    }

    this.scene.add(wallPillarsGroup);
  }

  // =========================================================================
  // 4. VOLUMETRIC 3D PARTICLES DISTRIBUTED THROUGHOUT THE ENTIRE CUBE
  // =========================================================================
  initVolumetricParticles(particleCount = 1200) {
    if (this.dustPoints) {
      this.scene.remove(this.dustPoints);
      this.dustPoints.geometry.dispose();
      this.dustPoints.material.dispose();
    }

    this.particleCount = particleCount;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    this.particleVelocities = [];

    const b = this.bounds;
    for (let i = 0; i < particleCount; i++) {
      // FULL 3D DISTRIBUTION across the entire volume of the arena!
      positions[i * 3 + 0] = THREE.MathUtils.randFloat(b.minX + 2, b.maxX - 2);
      positions[i * 3 + 1] = THREE.MathUtils.randFloat(b.minY + 2, b.maxY - 2);
      positions[i * 3 + 2] = THREE.MathUtils.randFloat(b.minZ + 2, b.maxZ - 2);

      // Random 3D orbital drift velocity
      this.particleVelocities.push({
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        vz: (Math.random() - 0.5) * 1.5,
        orbitRadius: THREE.MathUtils.randFloat(4, 24),
        orbitSpeed: THREE.MathUtils.randFloat(0.3, 1.2) * (Math.random() > 0.5 ? 1 : -1),
        orbitAngle: Math.random() * Math.PI * 2
      });

      colors[i * 3 + 0] = 0.15;
      colors[i * 3 + 1] = 0.85;
      colors[i * 3 + 2] = 1.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.55,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.dustPoints = new THREE.Points(geo, mat);
    this.scene.add(this.dustPoints);
  }

  // Camera Shake
  triggerCameraShake(intensity = 0.5) {
    this.cameraShakeTrauma = Math.min(1.0, this.cameraShakeTrauma + intensity * 0.4);
  }

  // Circular Floor Ripple on Bass Kick
  spawnFloorRipple(intensity = 1.0) {
    const ringGeo = new THREE.RingGeometry(0.5, 1.2, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.themeColors.primary,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(ringGeo, ringMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, this.bounds.minY + 0.12, 0);

    this.scene.add(mesh);
    this.floorRipples.push({
      mesh: mesh,
      scale: 1.0,
      maxScale: 38.0,
      opacity: 0.85,
      speed: 24.0 * (1.0 + intensity * 0.5)
    });
  }

  // =========================================================================
  // UPDATE LOOP (CALLED EVERY FRAME)
  // =========================================================================
  update(delta, audioData) {
    const { bands, isKick, beatIntensity } = audioData;
    const now = performance.now() * 0.001;
    const b = this.bounds;

    // 1. Kick Trigger Events
    if (isKick) {
      this.triggerCameraShake(beatIntensity * 0.5);
      this.spawnFloorRipple(beatIntensity);

      if (this.arenaLines) {
        this.arenaLines.material.opacity = 1.0;
      }
    } else {
      if (this.arenaLines && this.arenaLines.material.opacity > 0.45) {
        this.arenaLines.material.opacity -= delta * 1.5;
      }
    }

    // 2. UPDATE 3D CHECKERED CUBE MATRIX FLOOR (Direct Music Reaction)
    if (this.floorMesh && this.tileData) {
      const dummyObj = new THREE.Object3D();
      const dummyColor = new THREE.Color();
      const subBass = bands.subBass || 0;
      const energy = bands.energy || 0;

      for (let i = 0; i < this.tileData.length; i++) {
        const tile = this.tileData[i];

        // Concentric rhythmic wave expanding from center
        const wave = Math.sin(tile.dist * 0.40 - now * 5.2) * (subBass * 3.2 + beatIntensity * 2.4) * this.floorReactivity;

        // Center pedestal surge on bass hits (snappy punch)
        const centerSurge = tile.dist < 9.0 ? ((9.0 - tile.dist) / 9.0) * subBass * 4.2 * this.floorReactivity : 0;

        // Smooth clamped elevation (SAFE CLAMP: Never shoots to ceiling!)
        const targetElevation = Math.max(-0.4, Math.min(5.2, wave + centerSurge));
        const targetY = b.minY + targetElevation;

        // Snappy lift, smooth glide down
        const lerpSpeed = targetY > tile.currentY ? 22 * delta : 10 * delta;
        tile.currentY = THREE.MathUtils.lerp(tile.currentY, targetY, lerpSpeed);

        dummyObj.position.set(tile.x, tile.currentY, tile.z);

        // Vertical stretch
        const elevation = Math.max(0, tile.currentY - b.minY);
        const scaleY = 1.0 + elevation * 0.45;
        dummyObj.scale.set(1.0, scaleY, 1.0);
        dummyObj.updateMatrix();
        this.floorMesh.setMatrixAt(tile.index, dummyObj.matrix);

        // Neon Glow Shading based on elevation & beat
        if (elevation > 0.35) {
          const glowT = Math.min(1.0, (elevation - 0.35) / 2.5);
          dummyColor.copy(tile.isCheckered ? this.themeColors.primary : this.themeColors.secondary);
          dummyColor.lerp(this.themeColors.accent, glowT);
        } else {
          dummyColor.copy(tile.isCheckered ? this.themeColors.tileA : this.themeColors.tileB);
        }
        this.floorMesh.setColorAt(tile.index, dummyColor);
      }

      this.floorMesh.instanceMatrix.needsUpdate = true;
      if (this.floorMesh.instanceColor) {
        this.floorMesh.instanceColor.needsUpdate = true;
      }
    }

    // 3. UPDATE VOLUMETRIC 3D EQUALIZERS ON ALL 4 WALLS
    const freqData = window.audioEngine.freqData;
    if (freqData && this.eqWallBars.length > 0) {
      const step = Math.max(1, Math.floor(freqData.length / this.eqWallBars.length));

      for (let i = 0; i < this.eqWallBars.length; i++) {
        const pillar = this.eqWallBars[i];
        const val = (freqData[(pillar.binIndex * step) % freqData.length] || 0) / 255.0;

        // Target height clamped safely between 0.8 and 16.0 (leaves ample headroom below ceiling!)
        const targetHeight = Math.max(0.6, Math.min(16.0, val * 18.0 * this.floorReactivity));

        // Studio ballistic response: instant attack, smooth release
        const speed = targetHeight > pillar.currentHeight ? 24 * delta : 12 * delta;
        pillar.currentHeight = THREE.MathUtils.lerp(pillar.currentHeight, targetHeight, speed);
        pillar.mesh.scale.y = pillar.currentHeight;

        // Emissive neon color shifts with volume
        const mat = pillar.mesh.material;
        mat.emissiveIntensity = 0.4 + val * 2.2;
        if (val > 0.6) {
          mat.color.copy(this.themeColors.secondary);
          mat.emissive.copy(this.themeColors.secondary);
        } else {
          mat.color.copy(this.themeColors.primary);
          mat.emissive.copy(this.themeColors.primary);
        }
      }
    }

    // 4. UPDATE FLOOR PERIMETER TRENCHES
    if (freqData && this.eqFloorBars.length > 0) {
      for (let i = 0; i < this.eqFloorBars.length; i++) {
        const pillar = this.eqFloorBars[i];
        const val = (freqData[pillar.binIndex % freqData.length] || 0) / 255.0;
        const targetHeight = Math.max(0.5, Math.min(8.0, val * 9.0 * this.floorReactivity));
        pillar.currentHeight = THREE.MathUtils.lerp(pillar.currentHeight || 1.0, targetHeight, 18 * delta);
        pillar.mesh.scale.y = pillar.currentHeight;
        pillar.mesh.material.emissiveIntensity = 0.4 + val * 1.8;
      }
    }

    // 5. UPDATE VOLUMETRIC 3D PARTICLES ACROSS THE ENTIRE ARENA CUBE
    if (this.dustPoints) {
      const posAttr = this.dustPoints.geometry.attributes.position;
      const count = posAttr.count;
      const kickImpulse = isKick ? (1.5 + beatIntensity * 2.5) : 1.0;

      for (let i = 0; i < count; i++) {
        const vel = this.particleVelocities[i];

        // 3D Orbital Swirl around center
        vel.orbitAngle += vel.orbitSpeed * delta * (0.8 + bands.mid * 2.0);

        let px = posAttr.getX(i);
        let py = posAttr.getY(i);
        let pz = posAttr.getZ(i);

        // On kick: radial outward burst in 3D!
        if (isKick) {
          const dirX = px !== 0 ? Math.sign(px) : (Math.random() - 0.5);
          const dirY = (Math.random() - 0.5) * 2;
          const dirZ = pz !== 0 ? Math.sign(pz) : (Math.random() - 0.5);
          px += dirX * kickImpulse * 0.4;
          py += dirY * kickImpulse * 0.4;
          pz += dirZ * kickImpulse * 0.4;
        }

        // Continuous 3D drift
        px += vel.vx * delta * (1.0 + bands.high * 2.0);
        py += vel.vy * delta * (1.0 + bands.subBass * 3.0);
        pz += vel.vz * delta * (1.0 + bands.high * 2.0);

        // Volumetric boundary wrap in all 3 dimensions!
        if (px < b.minX + 1) px = b.maxX - 1;
        else if (px > b.maxX - 1) px = b.minX + 1;

        if (py < b.minY + 1) py = b.maxY - 1;
        else if (py > b.maxY - 1) py = b.minY + 1;

        if (pz < b.minZ + 1) pz = b.maxZ - 1;
        else if (pz > b.maxZ - 1) pz = b.minZ + 1;

        posAttr.setXYZ(i, px, py, pz);
      }
      posAttr.needsUpdate = true;
    }

    // 6. Update Floor Ripples
    for (let i = this.floorRipples.length - 1; i >= 0; i--) {
      const rip = this.floorRipples[i];
      rip.scale += rip.speed * delta;
      rip.mesh.scale.set(rip.scale, rip.scale, rip.scale);
      rip.opacity -= (rip.speed / rip.maxScale) * delta * 0.9;
      rip.mesh.material.opacity = Math.max(0, rip.opacity);

      if (rip.opacity <= 0 || rip.scale >= rip.maxScale) {
        this.scene.remove(rip.mesh);
        rip.mesh.geometry.dispose();
        rip.mesh.material.dispose();
        this.floorRipples.splice(i, 1);
      }
    }

    // 7. Update Spotlights
    for (let i = 0; i < this.spotlights.length; i++) {
      const light = this.spotlights[i];
      light.intensity = 2.5 + bands.subBass * 4.5;
    }

    // 8. Camera Shake Trauma Decay
    if (this.cameraShakeTrauma > 0) {
      const shakeAmt = this.cameraShakeTrauma * this.cameraShakeTrauma * 0.7;
      this.camera.position.x += (Math.random() - 0.5) * shakeAmt;
      this.camera.position.y += (Math.random() - 0.5) * shakeAmt;
      this.camera.position.z += (Math.random() - 0.5) * shakeAmt;

      this.cameraShakeTrauma = Math.max(0, this.cameraShakeTrauma - delta * 1.8);
    }
  }
}

window.EffectsManager = EffectsManager;
