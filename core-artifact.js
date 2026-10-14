/**
 * CENTRAL AUDIO-REACTIVE 3D HOLOGRAM ARTIFACT
 * A majestic centerpiece hovering in the middle of the neon cube arena.
 * Breathes, twists, scales, and radiates with the music frequencies without
 * any physics collisions or erratic wall clipping!
 */

class CoreArtifact {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.position.set(0, 5.0, 0);
    this.scene.add(this.root);

    this.currentStyle = 'pulsar';
    this.currentColorTheme = 'cyan';
    this.customParts = {};

    this.buildArtifact('pulsar', 'cyan');
  }

  getThemeColors(theme) {
    switch (theme) {
      case 'synthwave':
        return { primary: 0xff71ce, secondary: 0x01cdfe, accent: 0xb967ff, emissive: 0xff00aa };
      case 'matrix':
        return { primary: 0x00ff66, secondary: 0xa6ff00, accent: 0x00cc44, emissive: 0x33ff77 };
      case 'crimson':
        return { primary: 0xff2a2a, secondary: 0xff8c00, accent: 0xff0055, emissive: 0xff3300 };
      case 'gold':
        return { primary: 0xffcc00, secondary: 0xff6600, accent: 0xffe600, emissive: 0xffaa00 };
      case 'cyan':
      default:
        return { primary: 0x00f0ff, secondary: 0xff007f, accent: 0x9d00ff, emissive: 0x00d4ff };
    }
  }

  setTheme(theme) {
    this.currentColorTheme = theme;
    this.buildArtifact(this.currentStyle, theme);
  }

  setStyle(style) {
    this.currentStyle = style;
    this.buildArtifact(style, this.currentColorTheme);
  }

  clear() {
    while (this.root.children.length > 0) {
      const child = this.root.children[0];
      this.root.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }
    this.customParts = {};
  }

  buildArtifact(style, theme) {
    this.clear();
    const palette = this.getThemeColors(theme);

    switch (style) {
      case 'monolith':
        this.buildCrystalMonolith(palette);
        break;
      case 'reactor':
        this.buildQuantumReactor(palette);
        break;
      case 'vortex':
        this.buildVortexPortal(palette);
        break;
      case 'pulsar':
      default:
        this.buildCyberPulsar(palette);
        break;
    }
  }

  // 1. CYBER PULSAR (Spiked Core + Gyro Rings)
  buildCyberPulsar(palette) {
    const coreGeo = new THREE.SphereGeometry(1.6, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0a101f,
      emissive: palette.primary,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.15
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    this.root.add(core);
    this.customParts.core = core;

    // Procedural Frequency Spikes
    const spikesGroup = new THREE.Group();
    const spikeGeo = new THREE.ConeGeometry(0.24, 1.8, 12);
    spikeGeo.translate(0, 0.9, 0);
    const spikeMat = new THREE.MeshStandardMaterial({
      color: palette.secondary,
      emissive: palette.secondary,
      emissiveIntensity: 0.9,
      metalness: 0.8,
      roughness: 0.2
    });

    const spikeCount = 36;
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < spikeCount; i++) {
      const y = 1 - (i / (spikeCount - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(x * 1.5, y * 1.5, z * 1.5);
      const normal = new THREE.Vector3(x, y, z).normalize();
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      spikesGroup.add(spike);
    }
    this.root.add(spikesGroup);
    this.customParts.spikes = spikesGroup;

    // Dual Counter-Rotating Gyro Rings
    const ring1Geo = new THREE.TorusGeometry(3.2, 0.1, 16, 64);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: palette.primary });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    this.root.add(ring1);
    this.customParts.ring1 = ring1;

    const ring2Geo = new THREE.TorusGeometry(3.6, 0.08, 16, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: palette.accent });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 2;
    this.root.add(ring2);
    this.customParts.ring2 = ring2;
  }

  // 2. CRYSTAL MONOLITH (Faceted Gem + Orbiting Shards)
  buildCrystalMonolith(palette) {
    const geo = new THREE.IcosahedronGeometry(2.4, 0);
    const mat = new THREE.MeshPhysicalMaterial({
      color: palette.primary,
      emissive: palette.primary,
      emissiveIntensity: 0.4,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.85,
      thickness: 1.5,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geo, mat);
    this.root.add(mesh);
    this.customParts.gem = mesh;

    // Wireframe overlay
    const wireGeo = new THREE.WireframeGeometry(geo);
    const wireMat = new THREE.LineBasicMaterial({ color: palette.secondary, linewidth: 2 });
    const wire = new THREE.LineSegments(wireGeo, wireMat);
    this.root.add(wire);
    this.customParts.wire = wire;

    // Orbiting Floating Shards
    const shardsGroup = new THREE.Group();
    const shardGeo = new THREE.OctahedronGeometry(0.5, 0);
    const shardMat = new THREE.MeshBasicMaterial({ color: palette.accent });
    for (let i = 0; i < 8; i++) {
      const shard = new THREE.Mesh(shardGeo, shardMat);
      const angle = (i / 8) * Math.PI * 2;
      shard.position.set(Math.cos(angle) * 4.2, (Math.random() - 0.5) * 1.8, Math.sin(angle) * 4.2);
      shardsGroup.add(shard);
    }
    this.root.add(shardsGroup);
    this.customParts.shards = shardsGroup;
  }

  // 3. QUANTUM REACTOR (Plasma Orb + Orbital Electrons)
  buildQuantumReactor(palette) {
    const orbGeo = new THREE.SphereGeometry(2.0, 32, 32);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x050711,
      emissive: palette.primary,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.9
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    this.root.add(orb);
    this.customParts.orb = orb;

    const ringGeo = new THREE.TorusGeometry(3.0, 0.12, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: palette.secondary });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    this.root.add(ring);
    this.customParts.ring = ring;

    // Orbiting electron spheres
    const electrons = new THREE.Group();
    const eGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const eMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 3; i++) {
      const e = new THREE.Mesh(eGeo, eMat);
      electrons.add(e);
    }
    this.root.add(electrons);
    this.customParts.electrons = electrons;
  }

  // 4. VORTEX PORTAL (Torus Knot Singularity)
  buildVortexPortal(palette) {
    const knotGeo = new THREE.TorusKnotGeometry(2.0, 0.45, 128, 16, 2, 3);
    const knotMat = new THREE.MeshStandardMaterial({
      color: 0x11162b,
      emissive: palette.primary,
      emissiveIntensity: 0.9,
      metalness: 0.85,
      roughness: 0.25
    });
    const knot = new THREE.Mesh(knotGeo, knotMat);
    this.root.add(knot);
    this.customParts.knot = knot;

    const haloGeo = new THREE.RingGeometry(3.4, 4.2, 48);
    const haloMat = new THREE.MeshBasicMaterial({
      color: palette.secondary,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    this.root.add(halo);
    this.customParts.halo = halo;
  }

  // Update dynamic animation hooks per frame
  update(delta, audioData) {
    const { bands, isKick, beatIntensity } = audioData;
    const now = performance.now() * 0.001;

    // Gentle floating bob in center
    this.root.position.y = 5.0 + Math.sin(now * 1.5) * 0.6 + (bands.subBass * 1.2);

    // Dynamic scale pulse on kicks
    const targetScale = isKick ? (1.35 + beatIntensity * 0.35) : (1.0 + bands.subBass * 0.35);
    this.root.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 10 * delta);

    // Continuous rotation
    this.root.rotation.y += delta * (0.6 + bands.mid * 2.0);

    const parts = this.customParts;

    if (this.currentStyle === 'pulsar') {
      if (parts.spikes) {
        const spikeLen = 1.0 + bands.subBass * 1.8 + (isKick ? beatIntensity * 1.4 : 0);
        parts.spikes.children.forEach(spike => {
          spike.scale.set(1, spikeLen, 1);
        });
      }
      if (parts.ring1) parts.ring1.rotation.x += delta * 1.8;
      if (parts.ring2) parts.ring2.rotation.z -= delta * 2.2;
      if (parts.core) {
        parts.core.material.emissiveIntensity = 0.8 + bands.bass * 2.0;
      }
    } else if (this.currentStyle === 'monolith') {
      if (parts.gem) {
        parts.gem.rotation.x += delta * 0.8;
        parts.gem.rotation.z += delta * 0.5;
      }
      if (parts.wire) {
        parts.wire.rotation.copy(parts.gem.rotation);
      }
      if (parts.shards) {
        parts.shards.rotation.y += delta * (1.5 + bands.high * 3.0);
      }
    } else if (this.currentStyle === 'reactor') {
      if (parts.ring) parts.ring.rotation.z += delta * 2.5;
      if (parts.electrons) {
        const time = now * 3.5;
        parts.electrons.children.forEach((e, idx) => {
          const a = time + (idx * Math.PI * 2 / 3);
          e.position.set(Math.cos(a) * 3.2, Math.sin(a * 2) * 1.2, Math.sin(a) * 3.2);
        });
      }
      if (parts.orb) parts.orb.material.emissiveIntensity = 1.0 + bands.energy * 3.0;
    } else if (this.currentStyle === 'vortex') {
      if (parts.knot) {
        parts.knot.rotation.x += delta * 1.2;
        parts.knot.rotation.z += delta * 1.5;
      }
      if (parts.halo) parts.halo.rotation.z -= delta * 0.8;
    }
  }
}

window.CoreArtifact = CoreArtifact;
