/**
 * 3D PHYSICS ENGINE & COLLISION MANAGER (V2 - UPGRADED)
 * Features:
 * - High-impact Wall Rebound & Elastic Spring Squash System
 * - Axis-aligned Pancake Deformation with Volume Preservation
 * - Inter-object Collisions & Audio Impulse Levitation
 */

class PhysicsEngine {
  constructor() {
    // Arena boundaries (Room dimensions)
    this.bounds = {
      minX: -26,
      maxX: 26,
      minY: -12,
      maxY: 22,
      minZ: -26,
      maxZ: 26
    };

    // Physics parameters
    this.gravity = -38.0;          // Base gravity
    this.bounciness = 0.90;        // Wall restitution
    this.airResistance = 0.995;    // Damping
    this.jumpForce = 30.0;         // Bass kick vertical impulse
    this.horizontalKick = 14.0;    // Lateral blast on beats
    this.speedMultiplier = 1.0;    // Simulation rate

    this.bodies = [];
    this.collisionListeners = [];
  }

  // Register a 3D object into physics simulation
  addBody(mesh, options = {}) {
    const radius = mesh.userData.radius || 1.8;
    const body = {
      mesh: mesh,
      radius: radius,
      pos: mesh.position,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 8,
        (Math.random() - 0.5) * 10
      ),
      angVel: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ),
      mass: 1.0,
      isGrounded: false,
      restitution: options.bounciness || this.bounciness,
      lastImpactTime: 0,

      // Juiced-up Spring Squash deformation state
      squashAxis: 'y',           // 'x', 'y', or 'z'
      squashFactor: 1.0,         // Current scale along impact axis (1.0 = normal, 0.35 = flat pancake)
      squashVelocity: 0.0,       // Spring velocity
      squashHold: 0.0            // Pause briefly on wall for maximum visual punch
    };

    this.bodies.push(body);
    return body;
  }

  clearBodies() {
    this.bodies = [];
  }

  onCollision(callback) {
    this.collisionListeners.push(callback);
  }

  notifyCollision(event) {
    for (let cb of this.collisionListeners) {
      cb(event);
    }
  }

  // Apply audio-reactive jump impulse on kick detection
  applyBeatJump(beatIntensity = 1.0) {
    for (let body of this.bodies) {
      const upwardImpulse = this.jumpForce * (0.85 + beatIntensity * 0.95);
      body.vel.y = Math.max(body.vel.y + upwardImpulse, upwardImpulse);

      const angle = Math.random() * Math.PI * 2;
      const lateralImpulse = this.horizontalKick * beatIntensity;
      body.vel.x += Math.cos(angle) * lateralImpulse;
      body.vel.z += Math.sin(angle) * lateralImpulse;

      body.angVel.x += (Math.random() - 0.5) * 8 * beatIntensity;
      body.angVel.y += (Math.random() - 0.5) * 8 * beatIntensity;
      body.angVel.z += (Math.random() - 0.5) * 8 * beatIntensity;

      // Rocket jump stretch: stretch tall along Y
      body.squashAxis = 'y';
      body.squashFactor = 1.6 + beatIntensity * 0.4; // stretched tall
      body.squashVelocity = -10.0;
    }
  }

  // Super Smash: Blast all objects outward into walls
  superSmashBlast() {
    for (let body of this.bodies) {
      const dir = body.pos.clone().normalize();
      if (dir.lengthSq() < 0.01) {
        dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      }
      body.vel.copy(dir.multiplyScalar(50));
      body.angVel.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );
      body.squashFactor = 1.5;
    }
  }

  // Main physics step per frame
  update(delta, audioData) {
    const dt = Math.min(delta, 0.05) * this.speedMultiplier;
    if (dt <= 0) return;

    const { bands } = audioData;

    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];

      // 1. Gravity & Levitation
      b.vel.y += this.gravity * dt;
      if (bands && bands.subBass > 0.45) {
        b.vel.y += (bands.subBass * 20.0) * dt;
      }

      b.vel.multiplyScalar(Math.pow(this.airResistance, dt * 60));
      b.angVel.multiplyScalar(0.985);

      // 2. Position Integration
      b.pos.x += b.vel.x * dt;
      b.pos.y += b.vel.y * dt;
      b.pos.z += b.vel.z * dt;

      // 3. Wall collision checks
      this.checkWallCollisions(b);

      // 4. Update Spring-Damper Squash & Stretch
      this.updateSquashSpring(b, dt);
    }

    // 5. Inter-object sphere collisions
    this.checkInterObjectCollisions();
  }

  checkWallCollisions(b) {
    const r = b.radius;
    const restitution = this.bounciness;

    // LEFT WALL (X min)
    if (b.pos.x - r < this.bounds.minX) {
      const impactSpeed = Math.abs(b.vel.x);
      b.pos.x = this.bounds.minX + r;
      b.vel.x = Math.abs(b.vel.x) * restitution;
      this.handleImpact(b, new THREE.Vector3(this.bounds.minX, b.pos.y, b.pos.z), new THREE.Vector3(1, 0, 0), impactSpeed, 'x');
    }
    // RIGHT WALL (X max)
    else if (b.pos.x + r > this.bounds.maxX) {
      const impactSpeed = Math.abs(b.vel.x);
      b.pos.x = this.bounds.maxX - r;
      b.vel.x = -Math.abs(b.vel.x) * restitution;
      this.handleImpact(b, new THREE.Vector3(this.bounds.maxX, b.pos.y, b.pos.z), new THREE.Vector3(-1, 0, 0), impactSpeed, 'x');
    }

    // FLOOR (Y min)
    if (b.pos.y - r < this.bounds.minY) {
      const impactSpeed = Math.abs(b.vel.y);
      b.pos.y = this.bounds.minY + r;
      b.vel.y = Math.abs(b.vel.y) * restitution;
      b.isGrounded = true;
      this.handleImpact(b, new THREE.Vector3(b.pos.x, this.bounds.minY, b.pos.z), new THREE.Vector3(0, 1, 0), impactSpeed, 'y');
    } else {
      b.isGrounded = false;
    }

    // CEILING (Y max)
    if (b.pos.y + r > this.bounds.maxY) {
      const impactSpeed = Math.abs(b.vel.y);
      b.pos.y = this.bounds.maxY - r;
      b.vel.y = -Math.abs(b.vel.y) * restitution;
      this.handleImpact(b, new THREE.Vector3(b.pos.x, this.bounds.maxY, b.pos.z), new THREE.Vector3(0, -1, 0), impactSpeed, 'y');
    }

    // BACK WALL (Z min)
    if (b.pos.z - r < this.bounds.minZ) {
      const impactSpeed = Math.abs(b.vel.z);
      b.pos.z = this.bounds.minZ + r;
      b.vel.z = Math.abs(b.vel.z) * restitution;
      this.handleImpact(b, new THREE.Vector3(b.pos.x, b.pos.y, this.bounds.minZ), new THREE.Vector3(0, 0, 1), impactSpeed, 'z');
    }
    // FRONT WALL (Z max)
    else if (b.pos.z + r > this.bounds.maxZ) {
      const impactSpeed = Math.abs(b.vel.z);
      b.pos.z = this.bounds.maxZ - r;
      b.vel.z = -Math.abs(b.vel.z) * restitution;
      this.handleImpact(b, new THREE.Vector3(b.pos.x, b.pos.y, this.bounds.maxZ), new THREE.Vector3(0, 0, -1), impactSpeed, 'z');
    }
  }

  // Handle impact physics reaction & squash/stretch
  handleImpact(body, hitPoint, normal, impactSpeed, axis) {
    if (impactSpeed < 1.0) return;

    // Spin impulses on bounce
    body.angVel.x += (Math.random() - 0.5) * impactSpeed * 0.5;
    body.angVel.y += (Math.random() - 0.5) * impactSpeed * 0.5;
    body.angVel.z += (Math.random() - 0.5) * impactSpeed * 0.5;

    // JUICY PANCAKE SQUASH:
    // Strong collision compresses down to 0.32 (32% thickness) and widens up to 1.76!
    const hitPower = Math.min(1.0, impactSpeed / 22.0);
    const squishedScale = Math.max(0.30, 1.0 - hitPower * 0.70);

    body.squashAxis = axis;
    body.squashFactor = squishedScale;
    body.squashVelocity = -22.0 * hitPower;
    body.squashHold = 0.06; // Hold compressed for 60ms so eye clearly registers the pancake smash!

    // Notify listeners for shockwaves, sparks, camera shake, and floor ripples
    this.notifyCollision({
      body: body,
      hitPoint: hitPoint,
      normal: normal,
      speed: impactSpeed,
      intensity: Math.min(2.5, impactSpeed / 10.0)
    });
  }

  // Damped Harmonic Oscillator (Spring) for bouncy squash recovery
  updateSquashSpring(b, dt) {
    if (b.squashHold > 0) {
      b.squashHold -= dt;
    } else {
      const k = 240.0;       // Spring stiffness
      const damping = 12.0;  // Damping coefficient
      const displacement = b.squashFactor - 1.0;
      const springForce = -k * displacement - damping * b.squashVelocity;

      b.squashVelocity += springForce * dt;
      b.squashFactor += b.squashVelocity * dt;
    }

    // Apply squash factor to mesh scale along the impacted axis
    const factor = Math.max(0.2, b.squashFactor);
    // Preserving volume: orthogonal axes expand as 1 / sqrt(factor)
    const ortho = Math.min(2.2, 1.0 / Math.sqrt(factor));

    if (b.squashAxis === 'y') {
      b.mesh.scale.set(ortho, factor, ortho);
    } else if (b.squashAxis === 'x') {
      b.mesh.scale.set(factor, ortho, ortho);
    } else {
      b.mesh.scale.set(ortho, ortho, factor);
    }
  }

  // Elastic collisions between multiple bodies
  checkInterObjectCollisions() {
    const len = this.bodies.length;
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const b1 = this.bodies[i];
        const b2 = this.bodies[j];

        const dx = b2.pos.x - b1.pos.x;
        const dy = b2.pos.y - b1.pos.y;
        const dz = b2.pos.z - b1.pos.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = b1.radius + b2.radius;

        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          const overlap = (minDist - dist) * 0.5;
          b1.pos.x -= nx * overlap;
          b1.pos.y -= ny * overlap;
          b1.pos.z -= nz * overlap;

          b2.pos.x += nx * overlap;
          b2.pos.y += ny * overlap;
          b2.pos.z += nz * overlap;

          const rvx = b2.vel.x - b1.vel.x;
          const rvy = b2.vel.y - b1.vel.y;
          const rvz = b2.vel.z - b1.vel.z;
          const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;

          if (velAlongNormal < 0) {
            const impulse = -(1 + this.bounciness) * velAlongNormal * 0.5;
            b1.vel.x -= nx * impulse;
            b1.vel.y -= ny * impulse;
            b1.vel.z -= nz * impulse;

            b2.vel.x += nx * impulse;
            b2.vel.y += ny * impulse;
            b2.vel.z += nz * impulse;

            // Mutual squash bump
            b1.squashFactor = Math.max(0.6, b1.squashFactor * 0.85);
            b2.squashFactor = Math.max(0.6, b2.squashFactor * 0.85);
          }
        }
      }
    }
  }
}

// Global Physics instance
window.physicsEngine = new PhysicsEngine();
