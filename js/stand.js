// Swibble Messestand – 3D-Szene (three.js r160)
// Maßeinheit: 1 = 1 Meter. Alle Produktmaße stammen aus SPECS.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const SPECS = {
  booth:    { w: 4.0, d: 2.5, carpet: '#1B2147' },
  rollup:   { w: 0.85, h: 2.0, art: { w: 870, h: 2185, x0: 10, x1: 860, y0: 10, y1: 2010 } },
  // Flyeralarm „Messetheken rund, System inkl. Druck“: Ø 45 cm, H 93 cm, Druckbahn 129 × 90 cm
  podest:   { r: 0.225, h: 0.93, printH: 0.90 },
  // Flyeralarm „Textilfaltdisplay Classic“, 12 Felder: 302 × 227 × 29 cm, Druckmaß 296,5 × 226,5 cm
  wall:     { w: 3.02, h: 2.27, depth: 0.29 },
};

const TEX = {
  rollupFront: 'textures/rollup-vorderseite.png',
  rollupBack:  'textures/rollup-rueckseite.png',
  podest:      'textures/podest-bahn.png',
  wall:        'textures/rueckwand.png',
};

const loader = new THREE.TextureLoader();
const texCache = {};
function tex(key) {
  if (!texCache[key]) {
    const t = loader.load(TEX[key]);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    texCache[key] = t;
  }
  return texCache[key];
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

const metal = () => new THREE.MeshStandardMaterial({ color: '#C9CBD3', metalness: 0.85, roughness: 0.32 });
const darkPlastic = () => new THREE.MeshStandardMaterial({ color: '#23252E', metalness: 0.1, roughness: 0.6 });

/* ---------- Roll-up (doppelseitig, 85 × 200 cm sichtbar) ---------- */
export function makeRollup() {
  const { w, h, art } = SPECS.rollup;
  const g = new THREE.Group();
  g.name = 'Roll-up';

  const casH = 0.11, casD = 0.10, casW = w + 0.04;
  const cassette = new THREE.Mesh(new RoundedBoxGeometry(casW, casH, casD, 4, 0.03), metal());
  cassette.position.y = casH / 2 + 0.012;
  cassette.castShadow = cassette.receiveShadow = true;
  g.add(cassette);

  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new RoundedBoxGeometry(0.03, casH + 0.006, casD + 0.006, 3, 0.012), darkPlastic());
    cap.position.set(s * (casW / 2), casH / 2 + 0.012, 0);
    g.add(cap);
    // ausklappbare Standfüße, vorne und hinten
    for (const f of [-1, 1]) {
      const foot = new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.012, 0.26, 2, 0.005), metal());
      foot.position.set(s * (casW / 2 - 0.06), 0.006, f * 0.12);
      foot.rotation.y = f * s * 0.18;
      foot.castShadow = true;
      g.add(foot);
    }
  }

  // Druck: Textur-Ausschnitt = sichtbarer Bereich ohne Beschnitt und Kassettenzugabe
  const u0 = art.x0 / art.w, u1 = art.x1 / art.w;
  const vTop = 1 - art.y0 / art.h, vBot = 1 - art.y1 / art.h;
  const sides = [];
  for (const [key, dir] of [['rollupFront', 1], ['rollupBack', -1]]) {
    const t = tex(key).clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0 });
    const geo = new THREE.PlaneGeometry(w, 1);
    geo.translate(0, 0.5, 0); // Pivot an der Unterkante: Banner wächst aus der Kassette
    const m = new THREE.Mesh(geo, mat);
    m.position.set(0, casH + 0.01, dir * 0.004);
    if (dir < 0) m.rotation.y = Math.PI;
    m.castShadow = true;
    g.add(m);
    sides.push({ mesh: m, map: t });
  }
  const rail = new THREE.Mesh(new RoundedBoxGeometry(w + 0.01, 0.028, 0.022, 2, 0.008), metal());
  rail.castShadow = true;
  g.add(rail);

  // extend: 0 = eingerollt, 1 = komplett ausgezogen
  g.userData.setExtend = (e) => {
    const k = Math.max(0.0001, easeInOut(clamp01(e)));
    for (const s of sides) {
      s.mesh.scale.y = h * k;
      s.map.repeat.set(u1 - u0, (vTop - vBot) * k);
      s.map.offset.set(u0, vTop - (vTop - vBot) * k); // oben zuerst sichtbar, wie beim Herausziehen
    }
    rail.position.y = casH + 0.01 + h * k;
    rail.visible = e > 0.01;
  };
  g.userData.setExtend(1);
  return g;
}

/* ---------- Podest: runde Messetheke mit Rundum-Druckbahn ---------- */
export function makePodest() {
  const { r, h, printH } = SPECS.podest;
  const g = new THREE.Group();
  g.name = 'Podest';
  // Druckbahn: thetaStart = π legt die Bahnmitte (Front) nach vorne (+z), die Klettnaht nach hinten
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(r, r, printH, 96, 1, true, Math.PI, Math.PI * 2),
    new THREE.MeshStandardMaterial({ map: tex('podest'), roughness: 0.62, side: THREE.FrontSide }));
  wrap.position.y = printH / 2 + 0.005;
  wrap.castShadow = wrap.receiveShadow = true;
  g.add(wrap);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.004, r - 0.004, 0.006, 64), darkPlastic());
  base.position.y = 0.003;
  g.add(base);
  // schwarze Thekenplatte (belastbar bis 50 kg)
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.012, r + 0.012, h - printH - 0.005, 64),
    new THREE.MeshStandardMaterial({ color: '#15161C', roughness: 0.35, metalness: 0.1 }));
  top.position.y = printH + 0.005 + (h - printH - 0.005) / 2;
  top.castShadow = top.receiveShadow = true;
  g.add(top);

  // Auf dem Podest: Tablet mit Terminbuchung und ein Stapel Flyer
  const stand = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.012, 0.09, 2, 0.004), darkPlastic());
  stand.position.set(-0.05, h + 0.006, 0.02);
  g.add(stand);
  const tablet = new THREE.Group();
  const shell = new THREE.Mesh(new RoundedBoxGeometry(0.25, 0.175, 0.008, 3, 0.006), darkPlastic());
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.232, 0.158),
    new THREE.MeshBasicMaterial({ map: screenTexture() }));
  screen.position.z = 0.0042;
  tablet.add(shell, screen);
  tablet.position.set(-0.05, h + 0.1, 0.0);
  tablet.rotation.x = -0.32;
  tablet.castShadow = true;
  shell.castShadow = true;
  g.add(tablet);

  const flyerMat = new THREE.MeshStandardMaterial({ map: flyerTexture(), roughness: 0.7 });
  const paper = new THREE.MeshStandardMaterial({ color: '#F5F2F8', roughness: 0.9 });
  for (let i = 0; i < 2; i++) {
    const stack = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.018, 0.148),
      [paper, paper, flyerMat, paper, paper, paper]);
    stack.position.set(0.12, h + 0.009, -0.07 + i * 0.13);
    stack.rotation.y = 0.12 - i * 0.3;
    stack.castShadow = true;
    g.add(stack);
  }
  return g;
}

// Bildschirm des Tablets: Canvas statt Bilddatei, damit keine Fremdgrafik nötig ist
function screenTexture() {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 436;
  const x = c.getContext('2d');
  x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, 640, 436);
  x.fillStyle = '#000D36'; x.fillRect(0, 0, 640, 70);
  x.fillStyle = '#FFFFFF'; x.font = '600 30px Poppins, sans-serif'; x.fillText('Swibble', 30, 46);
  x.fillStyle = '#7610AA'; x.font = '600 18px Poppins, sans-serif'; x.fillText('MEET.SWIBBLE.NET', 30, 118);
  x.fillStyle = '#000D36'; x.font = '700 38px Poppins, sans-serif'; x.fillText('Erstgespräch buchen', 30, 166);
  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
  days.forEach((d, i) => {
    x.fillStyle = i === 2 ? '#B718EC' : '#F4E3F9';
    x.beginPath(); x.roundRect(30 + i * 118, 200, 102, 100, 16); x.fill();
    x.fillStyle = i === 2 ? '#FFFFFF' : '#000D36';
    x.font = '600 26px Poppins, sans-serif'; x.fillText(d, 60 + i * 118, 260);
  });
  x.fillStyle = '#B718EC'; x.beginPath(); x.roundRect(30, 330, 580, 70, 18); x.fill();
  x.fillStyle = '#FFFFFF'; x.font = '600 26px Poppins, sans-serif'; x.fillText('Termin sichern', 230, 374);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function flyerTexture() {
  const c = document.createElement('canvas');
  c.width = 210; c.height = 297;
  const x = c.getContext('2d');
  x.fillStyle = '#000D36'; x.fillRect(0, 0, 210, 297);
  x.fillStyle = '#B718EC'; x.beginPath(); x.roundRect(110, 170, 140, 90, 20); x.fill();
  x.fillStyle = '#FFFFFF'; x.font = '700 26px Poppins, sans-serif'; x.fillText('Swibble', 18, 44);
  x.font = '700 20px Poppins, sans-serif'; x.fillText('Dein Business', 18, 110); x.fillText('hat Potenzial.', 18, 136);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- Rückwand: Textilfaltdisplay mit 2 LED-Strahlern ---------- */
export function makeWall() {
  const { w, h, depth } = SPECS.wall;
  const g = new THREE.Group();
  g.name = 'Rückwand';
  const edge = new THREE.MeshStandardMaterial({ color: '#2A2C33', roughness: 0.9 });
  const fabric = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05),
    [edge, edge, edge, edge,
     new THREE.MeshStandardMaterial({ map: tex('wall'), roughness: 0.85 }),
     new THREE.MeshStandardMaterial({ color: '#2A2C33', roughness: 0.95 })]); // anthrazite Rückseite
  fabric.position.y = h / 2;
  fabric.castShadow = fabric.receiveShadow = true;
  g.add(fabric);
  // Standfüße hinten
  for (const s of [-1, 0, 1]) {
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.02, depth, 2, 0.006), metal());
    foot.position.set(s * (w / 2 - 0.15), 0.01, -depth / 2);
    foot.castShadow = true;
    g.add(foot);
  }
  // LED-Auslegerstrahler auf der Oberkante
  const lamps = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 8), darkPlastic());
    arm.rotation.x = Math.PI / 2 - 0.35;
    arm.position.set(s * w / 4, h + 0.05, 0.19);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.1, 16), darkPlastic());
    head.position.set(s * w / 4, h + 0.11, 0.39);
    head.rotation.x = 0.9;
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), new THREE.MeshBasicMaterial({ color: '#FFF4E6' }));
    glow.position.set(0, -0.051, 0); glow.rotation.x = Math.PI / 2;
    head.add(glow);
    g.add(arm, head);
    lamps.push(head);
  }
  g.userData.lamps = lamps;
  return g;
}

/* ---------- Standfläche ---------- */
export function makeFloor() {
  const { w, d, carpet } = SPECS.booth;
  const g = new THREE.Group();
  g.name = 'Standfläche';
  const plate = new THREE.Mesh(new RoundedBoxGeometry(w, 0.04, d, 2, 0.008),
    new THREE.MeshStandardMaterial({ color: carpet, roughness: 1 }));
  plate.position.y = 0.02;
  plate.receiveShadow = true;
  g.add(plate);
  const edgeMat = new THREE.MeshStandardMaterial({ color: '#B718EC', roughness: 0.5, emissive: '#B718EC', emissiveIntensity: 0.35 });
  const front = new THREE.Mesh(new THREE.BoxGeometry(w + 0.002, 0.012, 0.004), edgeMat);
  front.position.set(0, 0.02, d / 2 + 0.001);
  g.add(front);
  return g;
}

/* ---------- Bühne: Renderer, Kamera, Licht, Hallenboden ---------- */
export function createStage(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const bg = new THREE.Color(opts.background ?? '#ECE7F2');
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, opts.fogNear ?? 9, opts.fogFar ?? 22);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(opts.fov ?? 35, 1, 0.05, 60);
  camera.position.set(...(opts.camera ?? [3.6, 2.0, 5.2]));

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...(opts.target ?? [0, 1.0, 0]));
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = opts.minDistance ?? 1.4;
  controls.maxDistance = opts.maxDistance ?? 10;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.enablePan = false;
  controls.autoRotate = !!opts.autoRotate;
  controls.autoRotateSpeed = 0.6;
  controls.update();

  scene.add(new THREE.HemisphereLight('#FFFFFF', '#B9AFC8', 0.9));
  const sun = new THREE.DirectionalLight('#FFFFFF', 2.2);
  sun.position.set(3, 6, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -3; sc.right = 3; sc.top = 3.5; sc.bottom = -1; sc.near = 1; sc.far = 15;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#EBC5F7', 0.6);
  fill.position.set(-4, 3, 2);
  scene.add(fill);

  const hall = new THREE.Mesh(new THREE.CircleGeometry(30, 64),
    new THREE.MeshStandardMaterial({ color: opts.floor ?? '#DCD5E4', roughness: 0.9 }));
  hall.rotation.x = -Math.PI / 2;
  hall.receiveShadow = true;
  scene.add(hall);

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  // nur rendern, solange die Bühne sichtbar ist
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(canvas);

  const tickers = [];
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible) return;
    for (const f of tickers) f(dt);
    controls.update();
    renderer.render(scene, camera);
  });

  // Nach Interaktion kurz pausieren, dann sanft weiterdrehen
  if (opts.autoRotate) {
    let idle;
    controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(idle); });
    controls.addEventListener('end', () => { idle = setTimeout(() => { controls.autoRotate = !reducedMotion(); }, 4000); });
    if (reducedMotion()) controls.autoRotate = false;
  }

  return { THREE, renderer, scene, camera, controls, onTick: (f) => tickers.push(f), sun };
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Kamerafahrt zu Position/Ziel
export function flyTo(stage, pos, target, dur = 1.2) {
  const { camera, controls } = stage;
  const p0 = camera.position.clone(), t0 = controls.target.clone();
  const p1 = new THREE.Vector3(...pos), t1 = new THREE.Vector3(...target);
  if (reducedMotion()) { camera.position.copy(p1); controls.target.copy(t1); return; }
  let t = 0;
  const step = (dt) => {
    if (t >= 1) return;
    t = Math.min(1, t + dt / dur);
    const k = easeInOut(t);
    camera.position.lerpVectors(p0, p1, k);
    controls.target.lerpVectors(t0, t1, k);
  };
  stage.onTick(step);
}

/* ---------- Aufbau-Animation für den kompletten Stand ---------- */
// Jedes Teil bekommt einen Fortschritt 0…1, der weich auf sein Ziel zuläuft.
export function makeAssembly(stage, parts) {
  const state = parts.map((p) => ({ ...p, cur: 1, goal: 1 }));
  const apply = (s) => {
    const k = clamp01(s.cur);
    const o = s.obj;
    o.visible = k > 0.001;
    if (s.kind === 'drop') {
      o.position.y = s.base.y + (1 - easeOut(k)) * 1.6;
      o.rotation.y = s.rotY + (1 - easeOut(k)) * 0.6;
    } else if (s.kind === 'unfold') {
      o.scale.set(Math.max(0.001, easeInOut(k)), 1, 1);
    } else if (s.kind === 'rollup') {
      o.position.y = s.base.y + (1 - easeOut(clamp01(k * 2.2))) * 1.2;
      o.userData.setExtend(clamp01((k - 0.45) / 0.55));
    } else if (s.kind === 'floor') {
      o.scale.set(Math.max(0.001, easeOut(k)), 1, Math.max(0.001, easeOut(k)));
    }
  };
  state.forEach((s) => { s.base = s.obj.position.clone(); s.rotY = s.obj.rotation.y; apply(s); });
  stage.onTick((dt) => {
    for (const s of state) {
      if (s.cur === s.goal) continue;
      const speed = dt / (s.dur ?? 1.1);
      s.cur = s.goal > s.cur ? Math.min(s.goal, s.cur + speed) : Math.max(s.goal, s.cur - speed * 2);
      apply(s);
    }
  });
  return {
    // zeigt alle Teile bis einschließlich Schritt n (1-basiert); 0 = leer
    show(n, instant = false) {
      state.forEach((s, i) => {
        s.goal = i < n ? 1 : 0;
        if (instant || reducedMotion()) { s.cur = s.goal; apply(s); }
      });
    },
    count: state.length,
  };
}
