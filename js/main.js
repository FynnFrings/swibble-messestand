import { createStage, makeFloor, makeWall, makeRollup, makePodest, makeAssembly, flyTo, reducedMotion, SPECS } from './stand.js';

/* ---------- Hauptbühne: kompletter Stand ---------- */
const main = createStage(document.getElementById('stage-main'), {
  camera: [2.9, 1.75, 4.5], target: [0, 0.95, 0], autoRotate: true, minDistance: 2.2, maxDistance: 9,
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
  camera: [0.9, 1.2, 3.8], target: [0, 1.08, 0], autoRotate: false, minDistance: 1.2, maxDistance: 6, fov: 38,
});
const rollupSolo = makeRollup();
rStage.scene.add(rollupSolo);
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
    rStage.onTick((dt) => { if (t > 1) return; t += dt / 2.4; rollupSolo.userData.setExtend(Math.min(1, t)); });
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
  camera: [1.3, 1.3, 1.9], target: [0, 0.55, 0], autoRotate: true, minDistance: 1.0, maxDistance: 5, fov: 36,
});
pStage.scene.add(makePodest());
}
