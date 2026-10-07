import { createStage, makeFloor, makeWall, makeRollup, makePodest, makeAssembly, flyTo, reducedMotion, SPECS } from './stand.js';

/* ---------- Frei-Modus: Vollbild mit freier Kamera ---------- */
const ICON = {
  free: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>',
  reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>',
};

function setupViewer(wrapId, stage, name) {
  const wrap = document.getElementById(wrapId);
  if (!wrap || !stage) return;
  const box = wrap.querySelector('.stage-card, .viewer');
  const touch = stage.touchDevice;
  const hintRest = touch ? '' : 'Ziehen: drehen · Rechtsklick: verschieben · Scrollen: zoomen';
  const hintFree = touch ? '1 Finger: drehen · 2 Finger: zoomen und verschieben' : 'Ziehen: drehen · Rechtsklick oder Shift: verschieben · Scrollen: zoomen';

  const hint = document.createElement('span');
  hint.className = 'stage-hint';
  hint.textContent = hintRest;
  hint.hidden = !hintRest;
  const ui = document.createElement('div');
  ui.className = 'view-ui';
  ui.innerHTML =
    `<button class="ui-btn" type="button" data-act="reset" aria-label="Ansicht zurücksetzen">${ICON.reset}</button>` +
    `<button class="ui-btn primary" type="button" data-act="free" aria-label="${name} frei bewegen">${ICON.free}<span class="lbl">Frei bewegen</span></button>` +
    `<button class="ui-btn primary" type="button" data-act="close" aria-label="Frei-Modus schließen" hidden>${ICON.close}<span class="lbl">Schließen</span></button>`;
  box.append(hint, ui);
  const btnFree = ui.querySelector('[data-act="free"]');
  const btnClose = ui.querySelector('[data-act="close"]');

  const setFree = (on) => {
    wrap.classList.toggle('is-free', on);
    document.body.classList.toggle('free-open', on);
    btnFree.hidden = on;
    btnClose.hidden = !on;
    hint.textContent = on ? hintFree : hintRest;
    hint.hidden = !hint.textContent;
    stage.setFree(on);
    (on ? btnClose : btnFree).focus({ preventScroll: true });
  };
  btnFree.addEventListener('click', () => setFree(true));
  btnClose.addEventListener('click', () => setFree(false));
  ui.querySelector('[data-act="reset"]').addEventListener('click', () => stage.reset());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && wrap.classList.contains('is-free')) setFree(false); });
}


/* ---------- Hauptbühne: kompletter Stand ---------- */
const main = createStage(document.getElementById('stage-main'), {
  camera: [2.9, 1.75, 4.5], target: [0, 0.95, 0], autoRotate: true, minDistance: 2.2, maxDistance: 9, refAspect: 1.7,
});
const { w: bw, d: bd } = SPECS.booth;
const floor = makeFloor();
const wall = makeWall();
wall.position.set(0, 0.04, -bd / 2 + 0.32);
const rollup = makeRollup();
rollup.position.set(bw / 2 - 0.85, 0.04, -0.1);
rollup.rotation.y = -0.42;
const podest = makePodest();
podest.position.set(-0.55, 0.04, 0.45);
podest.rotation.y = 0.25;
main.scene.add(floor, wall, rollup, podest);

setupViewer('wrap-main', main, 'Messestand');

const assembly = makeAssembly(main, [
  { obj: floor, kind: 'floor', dur: 0.8 },
  { obj: wall, kind: 'unfold', dur: 1.2 },
  { obj: rollup, kind: 'rollup', dur: 1.8 },
  { obj: podest, kind: 'drop', dur: 1.0 },
]);

const stepBtns = [...document.querySelectorAll('.step[data-step]')];
const markStep = (n) => stepBtns.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.step === n)));
stepBtns.forEach((b) => b.addEventListener('click', () => {
  stopPlay();
  const n = +b.dataset.step;
  assembly.show(n);
  markStep(n);
}));

let playTimers = [];
function stopPlay() { playTimers.forEach(clearTimeout); playTimers = []; }
document.getElementById('btn-play').addEventListener('click', () => {
  stopPlay();
  assembly.show(0, true);
  markStep(0);
  const times = [300, 1300, 2700, 4700];
  times.forEach((t, i) => playTimers.push(setTimeout(() => { assembly.show(i + 1); markStep(i + 1); }, reducedMotion() ? 0 : t)));
});

/* ---------- Roll-up einzeln ---------- */
if (document.getElementById('stage-rollup')) {
const rStage = createStage(document.getElementById('stage-rollup'), {
  camera: [0.9, 1.2, 3.8], target: [0, 1.08, 0], autoRotate: false, minDistance: 1.2, maxDistance: 6, fov: 38, refAspect: 0.75,
  bounds: { min: [-1, 0.05, -1], max: [1, 2.3, 1] },
});
const rollupSolo = makeRollup();
rStage.scene.add(rollupSolo);
setupViewer('wrap-rollup', rStage, 'Roll-up');
const R = 3.9;
const views = {
  front: [[0.9, 1.25, R - 0.1], [0, 1.08, 0]],
  back: [[-0.9, 1.25, -(R - 0.1)], [0, 1.08, 0]],
  detail: [[0.55, 0.45, 1.0], [0, 0.18, 0]],
};
document.querySelectorAll('[data-rview]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-rview]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  if (b.dataset.rview === 'pull') {
    let t = 0;
    rStage.onTick((dt) => { if (t > 1) return false; t += dt / 2.4; rollupSolo.userData.setExtend(Math.min(1, t)); });
    rollupSolo.userData.setExtend(0);
    flyTo(rStage, ...views.front);
    return;
  }
  flyTo(rStage, ...views[b.dataset.rview]);
}));

}

/* ---------- Podest einzeln ---------- */
if (document.getElementById('stage-podest')) {
const pStage = createStage(document.getElementById('stage-podest'), {
  camera: [1.3, 1.3, 1.9], target: [0, 0.55, 0], autoRotate: true, minDistance: 1.0, maxDistance: 5, fov: 36, refAspect: 0.75,
  bounds: { min: [-0.8, 0.05, -0.8], max: [0.8, 1.3, 0.8] },
});
pStage.scene.add(makePodest());
setupViewer('wrap-podest', pStage, 'Podest');
}
