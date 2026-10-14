/**
 * 3D PROCEDURAL CHARACTER MODELS & RIGS
 * Creates expressive, high-detail 3D characters that jump, squash, stretch,
 * and crash into the arena walls with reactive materials.
 */

class CharacterFactory {
  constructor() {
    this.materials = [];
  }

  // Create character mesh hierarchy based on style
  createCharacter(type = 'bunny', colorTheme = 'cyan') {
    const root = new THREE.Group();
    root.userData = {
      type: type,
      baseScale: new THREE.Vector3(1, 1, 1),
      currentScale: new THREE.Vector3(1, 1, 1),
      targetScale: new THREE.Vector3(1, 1, 1),
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ),
      squashVelocity: 0,
      squashFactor: 1.0,
      radius: 1.8,
      colorTheme: colorTheme,
      customParts: {}
    };

    const palette = this.getThemeColors(colorTheme);

    switch (type) {
      case 'bunny':
        this.buildCyberBunny(root, palette);
        break;
      case 'crystal':
        this.buildCrystalGem(root, palette);
        break;
      case 'spiky':
        this.buildSpikyBomb(root, palette);
        break;
      case 'emoji':
        this.buildCyberEmoji(root, palette);
        break;
      case 'mech':
      default:
        this.buildMechaDroid(root, palette);
        break;
    }

    return root;
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

  // =========================================================================
  // 1. CYBER BUNNY BOT (Кибер-Заяц)
  // Expressive mecha mascot with bouncy floppy ears and glowing visor
  // =========================================================================
  buildCyberBunny(group, palette) {
    group.userData.radius = 1.9;

    // Body / Head sphere
    const headGeo = new THREE.SphereGeometry(1.4, 32, 24);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x182035,
      metalness: 0.85,
      roughness: 0.2,
      wireframe: false
    });
    const head = new THREE.Mesh(headGeo, headMat);
    group.add(head);

    // Glowing Neon Visor
    const visorGeo = new THREE.BoxGeometry(1.6, 0.65, 0.8);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x050810,
      emissive: palette.primary,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.9
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.2, 1.0);
    visor.rotation.x = 0.1;
    group.add(visor);
    group.userData.customParts.visor = visor;

    // Cyber Ears (Left & Right)
    const earGroupL = new THREE.Group();
    const earGroupR = new THREE.Group();
    earGroupL.position.set(-0.85, 1.25, 0);
    earGroupR.position.set(0.85, 1.25, 0);

    const earGeo = new THREE.ConeGeometry(0.32, 1.8, 16);
    earGeo.translate(0, 0.9, 0); // Pivot at base

    const earMat = new THREE.MeshStandardMaterial({
      color: 0x1f2a42,
      metalness: 0.8,
      roughness: 0.3
    });
    const earInnerMat = new THREE.MeshBasicMaterial({
      color: palette.secondary,
      wireframe: false
    });

    const earMeshL = new THREE.Mesh(earGeo, earMat);
    const earMeshR = new THREE.Mesh(earGeo, earMat);
    earGroupL.add(earMeshL);
    earGroupR.add(earMeshR);

    // Inner glowing ear strip
    const earStripGeo = new THREE.BoxGeometry(0.12, 1.4, 0.12);
    earStripGeo.translate(0, 0.8, 0.2);
    const earStripL = new THREE.Mesh(earStripGeo, earInnerMat);
    const earStripR = new THREE.Mesh(earStripGeo, earInnerMat);
    earGroupL.add(earStripL);
    earGroupR.add(earStripR);

    earGroupL.rotation.z = 0.25;
    earGroupR.rotation.z = -0.25;

    group.add(earGroupL);
    group.add(earGroupR);

    group.userData.customParts.earL = earGroupL;
    group.userData.customParts.earR = earGroupR;

    // Floating Robotic Hands
    const handGeo = new THREE.SphereGeometry(0.38, 16, 16);
    const handMat = new THREE.MeshStandardMaterial({
      color: 0x22304d,
      emissive: palette.primary,
      emissiveIntensity: 0.3,
      metalness: 0.9,
      roughness: 0.2
    });
    const handL = new THREE.Mesh(handGeo, handMat);
    const handR = new THREE.Mesh(handGeo, handMat);
    handL.position.set(-1.8, -0.4, 0.2);
    handR.position.set(1.8, -0.4, 0.2);
    group.add(handL);
    group.add(handR);
    group.userData.customParts.handL = handL;
    group.userData.customParts.handR = handR;

    // Rocket Thruster Nozzle at bottom
    const thrusterGeo = new THREE.CylinderGeometry(0.45, 0.65, 0.45, 16);
    const thrusterMat = new THREE.MeshStandardMaterial({
      color: 0x111522,
      metalness: 0.9,
      roughness: 0.4
    });
    const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    thruster.position.set(0, -1.35, 0);
    group.add(thruster);

    // Thruster Jet Flame (Glows intensely on jumps)
    const flameGeo = new THREE.ConeGeometry(0.42, 1.4, 16);
    flameGeo.rotateX(Math.PI);
    flameGeo.translate(0, -0.7, 0);
    const flameMat = new THREE.MeshBasicMaterial({
      color: palette.primary,
      transparent: true,
      opacity: 0.75
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, -1.5, 0);
    group.add(flame);
    group.userData.customParts.flame = flame;
  }

  // =========================================================================
  // 2. CRYSTAL GEM / NEON POLYHEDRON
  // Intricate faceted crystal with inner glowing core and orbiting rings
  // =========================================================================
  buildCrystalGem(group, palette) {
    group.userData.radius = 1.8;

    // Outer faceted polyhedron (Icosahedron)
    const outerGeo = new THREE.IcosahedronGeometry(1.6, 0);
    const outerMat = new THREE.MeshPhysicalMaterial({
      color: palette.primary,
      emissive: palette.primary,
      emissiveIntensity: 0.2,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.85,
      thickness: 1.2,
      transparent: true,
      opacity: 0.85
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    group.add(outerMesh);

    // Outer wireframe cage
    const wireGeo = new THREE.WireframeGeometry(outerGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: palette.secondary,
      linewidth: 2
    });
    const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
    group.add(wireMesh);

    // Inner Pulsing Core
    const coreGeo = new THREE.OctahedronGeometry(0.75, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: palette.secondary
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);
    group.userData.customParts.core = coreMesh;

    // Orbiting Neon Ring
    const ringGeo = new THREE.TorusGeometry(2.1, 0.08, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: palette.accent
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    group.add(ringMesh);
    group.userData.customParts.ring = ringMesh;
  }

  // =========================================================================
  // 3. SPIKY BASS BOMB (Шипастый Басс-Шар)
  // Sphere with procedural spikes that shoot out on bass drops!
  // =========================================================================
  buildSpikyBomb(group, palette) {
    group.userData.radius = 2.0;

    // Center metallic core
    const coreGeo = new THREE.SphereGeometry(1.2, 24, 24);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x141824,
      metalness: 0.95,
      roughness: 0.15,
      emissive: palette.primary,
      emissiveIntensity: 0.25
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // Extruded spikes arranged around sphere
    const spikesGroup = new THREE.Group();
    const spikeGeo = new THREE.ConeGeometry(0.22, 1.2, 12);
    spikeGeo.translate(0, 0.6, 0);

    const spikeMat = new THREE.MeshStandardMaterial({
      color: palette.secondary,
      emissive: palette.secondary,
      emissiveIntensity: 0.6,
      metalness: 0.7,
      roughness: 0.3
    });

    const spikeCount = 32;
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

    for (let i = 0; i < spikeCount; i++) {
      const y = 1 - (i / (spikeCount - 1)) * 2; // -1 to 1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(x * 1.15, y * 1.15, z * 1.15);

      // Orient spike outwards from center
      const normal = new THREE.Vector3(x, y, z).normalize();
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

      spikesGroup.add(spike);
    }

    group.add(spikesGroup);
    group.userData.customParts.spikes = spikesGroup;
  }

  // =========================================================================
  // 4. CYBER EMOJI SMILEY (Кибер-Эмодзи)
  // Expressive neon face with cyberpunk sunglasses that opens mouth on kicks
  // =========================================================================
  buildCyberEmoji(group, palette) {
    group.userData.radius = 1.7;

    // Head
    const headGeo = new THREE.SphereGeometry(1.4, 32, 24);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffee00,
      metalness: 0.3,
      roughness: 0.3,
      emissive: 0xffaa00,
      emissiveIntensity: 0.15
    });
    const head = new THREE.Mesh(headGeo, headMat);
    group.add(head);

    // Cyberpunk Visor / Shades
    const shadesGeo = new THREE.BoxGeometry(1.8, 0.5, 0.4);
    const shadesMat = new THREE.MeshStandardMaterial({
      color: 0x0a0d18,
      emissive: palette.primary,
      emissiveIntensity: 0.7,
      metalness: 0.9,
      roughness: 0.1
    });
    const shades = new THREE.Mesh(shadesGeo, shadesMat);
    shades.position.set(0, 0.25, 1.25);
    group.add(shades);

    // Mouth (Capsule / Cylinder)
    const mouthGeo = new THREE.TorusGeometry(0.45, 0.12, 16, 32, Math.PI);
    const mouthMat = new THREE.MeshBasicMaterial({
      color: 0x221100
    });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.3, 1.25);
    mouth.rotation.x = Math.PI;
    mouth.rotation.z = Math.PI;
    group.add(mouth);
    group.userData.customParts.mouth = mouth;

    // Glowing Neon Horns / Antennae
    const hornGeo = new THREE.ConeGeometry(0.25, 0.9, 16);
    hornGeo.translate(0, 0.45, 0);
    const hornMat = new THREE.MeshBasicMaterial({ color: palette.secondary });

    const hornL = new THREE.Mesh(hornGeo, hornMat);
    const hornR = new THREE.Mesh(hornGeo, hornMat);
    hornL.position.set(-0.8, 1.15, 0);
    hornL.rotation.z = 0.4;
    hornR.position.set(0.8, 1.15, 0);
    hornR.rotation.z = -0.4;

    group.add(hornL);
    group.add(hornR);
  }

  // =========================================================================
  // 5. MECHA DROID (Кибер-Дроид)
  // Spherical sleek combat drone with glowing center eye and dual rings
  // =========================================================================
  buildMechaDroid(group, palette) {
    group.userData.radius = 1.7;

    const bodyGeo = new THREE.SphereGeometry(1.3, 32, 24);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x161a29,
      metalness: 0.9,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Eye Sensor
    const eyeGeo = new THREE.SphereGeometry(0.5, 24, 24);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: palette.primary,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.8
    });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0, 1.05);
    group.add(eye);
    group.userData.customParts.eye = eye;

    // Orbiting Gyro Ring 1
    const gyro1Geo = new THREE.TorusGeometry(1.8, 0.08, 16, 64);
    const gyro1Mat = new THREE.MeshStandardMaterial({
      color: 0x334466,
      emissive: palette.secondary,
      emissiveIntensity: 0.4,
      metalness: 0.8
    });
    const gyro1 = new THREE.Mesh(gyro1Geo, gyro1Mat);
    group.add(gyro1);
    group.userData.customParts.gyro1 = gyro1;

    // Orbiting Gyro Ring 2
    const gyro2Geo = new THREE.TorusGeometry(2.0, 0.07, 16, 64);
    const gyro2Mat = new THREE.MeshBasicMaterial({ color: palette.accent });
    const gyro2 = new THREE.Mesh(gyro2Geo, gyro2Mat);
    gyro2.rotation.x = Math.PI / 2;
    group.add(gyro2);
    group.userData.customParts.gyro2 = gyro2;
  }

  // Update dynamic animation hooks per frame
  updateCharacter(group, delta, audioData) {
    const parts = group.userData.customParts;
    const type = group.userData.type;
    const { bands, isKick, beatIntensity } = audioData;

    // Squash & Stretch is managed directly by PhysicsEngine spring-damper

    // Type-specific micro-animations
    if (type === 'bunny') {
      if (parts.earL && parts.earR) {
        const wiggle = Math.sin(performance.now() * 0.008) * 0.12;
        parts.earL.rotation.z = 0.25 + wiggle + (bands.high * 0.4);
        parts.earR.rotation.z = -0.25 - wiggle - (bands.high * 0.4);
      }
      if (parts.flame) {
        // Flame extends with bass / kick
        const flameScale = isKick ? (1.5 + beatIntensity * 2.0) : Math.max(0.2, bands.subBass * 1.8);
        parts.flame.scale.set(1, flameScale, 1);
        parts.flame.material.opacity = isKick ? 1.0 : (0.2 + bands.subBass * 0.6);
      }
      if (parts.visor) {
        parts.visor.material.emissiveIntensity = 0.8 + bands.bass * 1.5;
      }
    } else if (type === 'crystal') {
      if (parts.core) {
        parts.core.rotation.y += delta * 3;
        parts.core.rotation.x += delta * 2;
        const coreScale = 1.0 + bands.bass * 0.7;
        parts.core.scale.set(coreScale, coreScale, coreScale);
      }
      if (parts.ring) {
        parts.ring.rotation.z += delta * (1.5 + bands.mid * 4);
      }
    } else if (type === 'spiky') {
      if (parts.spikes) {
        const spikeLen = 1.0 + (bands.subBass * 1.4) + (isKick ? beatIntensity * 1.2 : 0);
        parts.spikes.children.forEach((spike, idx) => {
          spike.scale.set(1, spikeLen, 1);
        });
      }
    } else if (type === 'emoji') {
      if (parts.mouth) {
        const mouthOpen = isKick ? 2.5 : (1.0 + bands.bass * 1.8);
        parts.mouth.scale.set(1, mouthOpen, 1);
      }
    } else if (type === 'mech') {
      if (parts.gyro1) {
        parts.gyro1.rotation.x += delta * 2;
        parts.gyro1.rotation.y += delta * 1.5;
      }
      if (parts.gyro2) {
        parts.gyro2.rotation.y -= delta * 3;
      }
      if (parts.eye) {
        parts.eye.material.emissiveIntensity = 1.0 + bands.subBass * 2.5;
      }
    }
  }
}

// Global Factory instance
window.characterFactory = new CharacterFactory();
