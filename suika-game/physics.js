/* Classic script so the game can also be opened directly from disk. */
(() => {
  'use strict';

  const TICK = 1 / 120;
  const GRAVITY = 1080;
  const DROP_DELAY = 0.45;
  const OVERFLOW_DELAY = 1.5;
  const DEFAULT_RADII = [16, 21, 27, 34, 42, 51, 61, 73, 87, 102, 119];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  // nx,ny points from the wall into the playfield. Apply friction at the
  // contact point, which lets a sideways landing turn into a rolling piece.
  function wallContact(body, nx, ny, penetration) {
    if (penetration < 0) return;
    body.x += nx * penetration;
    body.y += ny * penetration;
    if (ny < 0) body.landed = true;

    const normalSpeed = body.vx * nx + body.vy * ny;
    if (normalSpeed >= 0) return;
    const bounce = normalSpeed < -85 ? 0.12 : 0;
    const impulse = -(1 + bounce) * normalSpeed / body.invMass;
    const slip = -body.vx * ny + body.vy * nx - body.spin * body.r;
    const friction = clamp(-slip / (3 * body.invMass), -0.38 * impulse, 0.38 * impulse);
    body.vx += (nx * impulse - ny * friction) * body.invMass;
    body.vy += (ny * impulse + nx * friction) * body.invMass;
    body.spin -= body.r * friction * body.invInertia;
  }

  function confine(body, width, height) {
    wallContact(body, 1, 0, body.r - body.x);
    wallContact(body, -1, 0, body.x + body.r - width);
    wallContact(body, 0, -1, body.y + body.r - height);
  }

  function circleContact(a, b, dx, dy, distance) {
    const nx = distance > 0 ? dx / distance : 0;
    const ny = distance > 0 ? dy / distance : -1;
    const invMass = a.invMass + b.invMass;
    const separation = 0.8 * Math.max(0, a.r + b.r - distance - 0.025) / invMass;
    a.x -= nx * separation * a.invMass;
    a.y -= ny * separation * a.invMass;
    b.x += nx * separation * b.invMass;
    b.y += ny * separation * b.invMass;
    if (ny > 0.25 && b.landed) a.landed = true;
    if (ny < -0.25 && a.landed) b.landed = true;

    const vx = b.vx - a.vx;
    const vy = b.vy - a.vy;
    const normalSpeed = vx * nx + vy * ny;
    if (normalSpeed >= 0) return;
    const bounce = normalSpeed < -85 ? 0.12 : 0;
    const impulse = -(1 + bounce) * normalSpeed / invMass;
    const slip = -vx * ny + vy * nx - a.spin * a.r - b.spin * b.r;
    const friction = clamp(-slip / (3 * invMass), -0.32 * impulse, 0.32 * impulse);
    const ix = nx * impulse - ny * friction;
    const iy = ny * impulse + nx * friction;
    a.vx -= ix * a.invMass;
    a.vy -= iy * a.invMass;
    b.vx += ix * b.invMass;
    b.vy += iy * b.invMass;
    a.spin -= a.r * friction * a.invInertia;
    b.spin -= b.r * friction * b.invInertia;
  }

  class Game {
    constructor({ width = 400, height = 520, dangerY = 68, spawnY = 30,
      radii = DEFAULT_RADII, rng = Math.random } = {}) {
      this.width = width;
      this.height = height;
      this.dangerY = dangerY;
      this.spawnY = spawnY;
      this.radii = [...radii];
      this.rng = rng;
      this.reset();
    }

    reset() {
      this.bodies = [];
      this.events = [];
      this.score = 0;
      this.over = false;
      this.danger = 0;
      this.cooldown = 0;
      this.remainder = 0;
      this.nextId = 1;
      // An opening pair lets a new player discover the first merge immediately.
      this.current = 0;
      this.next = 0;
    }

    get canDrop() {
      return !this.over && this.cooldown <= 0;
    }

    clampX(x) {
      const r = this.radii[this.current];
      return clamp(x, r, this.width - r);
    }

    makeBody(level, x, y) {
      const r = this.radii[level];
      const invMass = 1 / (r * r);
      return { id: this.nextId++, level, x, y, r, angle: 0, vx: 0, vy: 0, spin: 0,
        invMass, invInertia: 2 * invMass / (r * r), landed: false, overflowTime: 0 };
    }

    drop(x) {
      if (!this.canDrop || !Number.isFinite(x)) return false;
      const body = this.makeBody(this.current, this.clampX(x), this.spawnY);
      this.bodies.push(body);
      this.events.push({ type: 'drop', level: body.level, x: body.x, y: body.y });
      this.current = this.next;
      const roll = this.rng();
      const level = roll < 0.34 ? 0 : roll < 0.64 ? 1 : roll < 0.86 ? 2 : 3;
      this.next = Math.min(level, this.radii.length - 2);
      this.cooldown = DROP_DELAY;
      return true;
    }

    drainEvents() {
      const result = this.events;
      this.events = [];
      return result;
    }

    merge(a, b) {
      const tier = a.level + 1;
      const final = tier === this.radii.length;
      const level = final ? a.level : tier;
      const r = this.radii[level];
      const x = clamp((a.x + b.x) / 2, r, this.width - r);
      const y = Math.min((a.y + b.y) / 2, this.height - r);
      const points = tier * (tier + 1) / 2;
      this.score += points;
      this.events.push({ type: 'merge', level, x, y, points, final });
      if (final) return;
      const body = this.makeBody(level, x, y);
      body.vx = (a.vx + b.vx) / 2;
      body.vy = (a.vy + b.vy) / 2;
      body.spin = (a.spin + b.spin) / 2;
      body.landed = a.landed || b.landed;
      this.bodies.push(body);
    }

    solveContacts() {
      const bodies = this.bodies;
      const pairs = [];
      const consumed = new Set();
      for (let iteration = 0; iteration < 5; iteration++) {
        for (let i = 0; i < bodies.length; i++) {
          const a = bodies[i];
          if (consumed.has(a)) continue;
          confine(a, this.width, this.height);
          for (let j = i + 1; j < bodies.length; j++) {
            const b = bodies[j];
            if (consumed.has(b)) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const radius = a.r + b.r;
            const squared = dx * dx + dy * dy;
            if (squared > radius * radius) continue;
            if (a.level === b.level) {
              consumed.add(a);
              consumed.add(b);
              pairs.push([a, b]);
              break;
            }
            circleContact(a, b, dx, dy, Math.sqrt(squared));
          }
        }
      }
      if (pairs.length) {
        this.bodies = bodies.filter(body => !consumed.has(body));
        for (const [a, b] of pairs) this.merge(a, b);
      }
      for (const body of this.bodies) confine(body, this.width, this.height);
    }

    tick() {
      this.cooldown = Math.max(0, this.cooldown - TICK);
      for (const body of this.bodies) {
        body.vy += GRAVITY * TICK;
        body.vx *= 0.998;
        body.spin *= 0.996;
        body.x += body.vx * TICK;
        body.y += body.vy * TICK;
        body.angle += body.spin * TICK;
      }
      this.solveContacts();

      this.danger = 0;
      for (const body of this.bodies) {
        const aboveLimit = body.landed && body.y - body.r < this.dangerY;
        body.overflowTime = aboveLimit ? body.overflowTime + TICK : 0;
        this.danger = Math.max(this.danger, body.overflowTime / OVERFLOW_DELAY);
      }
      if (this.danger >= 1) {
        this.danger = 1;
        this.over = true;
        this.events.push({ type: 'over', score: this.score });
      }
    }

    step(seconds) {
      if (this.over || !Number.isFinite(seconds) || seconds <= 0) return;
      // Avoid replaying minutes of elapsed time on return from a sleeping tab.
      this.remainder += Math.min(seconds, 2);
      while (this.remainder + 1e-10 >= TICK && !this.over) {
        this.remainder -= TICK;
        this.tick();
      }
    }
  }

  globalThis.SuikaPhysics = { Game };
})();
