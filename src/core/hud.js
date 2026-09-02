import { PILOT, ZONES, MILESTONES, MAX_DEPTH } from '../data.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor({ onBegin, onAudio, onRail, onFreelook }) {
    this.onBegin = onBegin;
    this.zone = -2;            // -1 hero, 0..4 dock, -2 none, 9 outro
    this.passed = new Set();
    this.whaleDone = false;

    // rail
    const rail = $('rail');
    ZONES.forEach((z, i) => {
      const b = document.createElement('button');
      b.className = 'rail-item';
      b.innerHTML = `<span class="lbl">${z.title}</span><span class="dm">${(z.depth).toLocaleString('en-US')} M</span><span class="dot"></span>`;
      b.addEventListener('click', () => onRail(i));
      rail.appendChild(b);
    });
    this.railItems = [...rail.children];

    // hero + outro static content
    $('heroTitle').textContent = PILOT.heroTitle[0];
    $('heroSub').innerHTML = PILOT.heroSub;
    $('heroPrompt').textContent = PILOT.heroPrompt;
    $('heroStats').innerHTML = PILOT.heroStats
      .map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
    $('outroTitle').textContent = PILOT.outroTitle;
    $('outroSub').innerHTML = PILOT.outroSub;
    $('outroNote').textContent = PILOT.outroNote;
    $('outroLinks').innerHTML = (ZONES.find(z => z.id === 'hadal').links || [])
      .filter(([, , href]) => href && !href.startsWith('mailto'))
      .map(([k, , href]) => `<a href="${href}" target="_blank" rel="noopener">${k} ↗</a>`).join('');
    $('strip').innerHTML = PILOT.awards.map((a, i) => `<span>${i === 0 ? '<b>' + a + '</b>' : a}</span>`).join('');

    $('begin').addEventListener('click', () => {
      $('ignition').classList.add('hidden');
      $('hud').classList.remove('hidden');
      onBegin();
    });
    $('audioBtn').addEventListener('click', () => {
      const on = onAudio();
      $('audioBtn').classList.toggle('off', !on);
      $('audioBtn').innerHTML = `<i></i>SONAR&nbsp;${on ? 'ON' : 'OFF'}`;
    });
    $('freelook').addEventListener('click', () => {
      const active = document.body.classList.toggle('freelook');
      onFreelook(active);
      $('freelook').textContent = active ? '◈ BACK TO CONSOLE' : '◈ FREE LOOK';
    });
    this._lastTxt = {};
  }

  preloader(p, done) {
    const n = Math.floor(p * 100);
    $('prenum').textContent = String(n).padStart(3, '0');
    $('prebar').style.width = (p * 100).toFixed(1) + '%';
    if (done) {
      setTimeout(() => {
        $('preloader').classList.add('hidden');
        if (!document.getElementById('ignition').dataset.lock) $('ignition').classList.remove('hidden');
      }, 420);
    }
  }

  liftVeil() { $('veil').classList.add('up'); }

  toast(title, sub) {
    $('toast').innerHTML = `<b>${title}</b><span>${sub}</span>`;
    $('toast').classList.add('show');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => $('toast').classList.remove('show'), 3400);
  }

  sonarRing() {
    const fx = $('sonarFx');
    const r = document.createElement('div');
    r.className = 'sonar-ring';
    r.style.left = '50%'; r.style.top = '46%';
    fx.appendChild(r);
    setTimeout(() => r.remove(), 1500);
  }

  // throttle the text writes
  _txt(id, v) {
    if (this._lastTxt[id] === v) return;
    this._lastTxt[id] = v;
    $(id).textContent = v;
  }

  updateDepth(depthM, rate) {
    this._txt('kDepth', `${Math.round(depthM).toLocaleString('en-US')}<small></small>`);
    $('kDepth').innerHTML = `${Math.round(depthM).toLocaleString('en-US')}<small>m</small>`;
    const psi = (1 + depthM / 10.06) * 14.69;
    this._txt('kPsi', `${Math.round(psi).toLocaleString('en-US')} PSI`);
    this._txt('kRate', `${Math.abs(rate).toFixed(0)} cm/s`);
    // zone label
    let zn = 'SURFACE';
    if (depthM >= 20 && depthM < 200) zn = 'SUNLIGHT ZONE';
    else if (depthM >= 200 && depthM < 1000) zn = 'TWILIGHT ZONE';
    else if (depthM >= 1000 && depthM < 4000) zn = 'MIDNIGHT ZONE';
    else if (depthM >= 4000 && depthM < 6000) zn = 'THE ABYSS';
    else if (depthM >= 6000 && depthM < 10900) zn = 'HADAL ZONE';
    else if (depthM >= 10900) zn = 'CHALLENGER DEEP';
    this._txt('kZone', zn);
    // milestones
    for (const [dm, title, sub] of MILESTONES) {
      if (depthM >= dm && !this.passed.has(dm)) {
        this.passed.add(dm);
        this.toast(`${Math.round(dm).toLocaleString('en-US')} M — ${title}`, sub);
        return dm;
      }
    }
    return 0;
  }

  _setPanels(hero, zone, outro) {
    $('panel-hero').classList.toggle('hidden', !hero);
    $('panel-zone').classList.toggle('hidden', zone === null);
    $('panel-zone').classList.toggle('on', zone !== null);
    $('panel-outro').classList.toggle('hidden', !outro);
  }

  /** idx: 0..4 dock a zone panel · -1 hero · -2 nothing · 9 outro */
  show(idx) {
    if (idx === this.zone) return;
    this.zone = idx;
    for (let i = 0; i < this.railItems.length; i++) this.railItems[i].classList.toggle('on', i === idx);
    if (idx >= 0 && idx < ZONES.length) {
      this._fillZone(ZONES[idx]);
      this._setPanels(false, ZONES[idx], false);
    } else if (idx === -1) this._setPanels(true, null, false);
    else if (idx === 9) this._setPanels(false, null, true);
    else this._setPanels(false, null, false);
  }

  _fillZone(z) {
    document.documentElement.style.setProperty('--zc', z.color);
    $('zRange').textContent = `${z.range} · ${z.name}`;
    $('zLatin').textContent = z.latin;
    $('zName').textContent = `TRANSMITTING FROM ${z.name}`;
    $('zTitle').textContent = z.title;
    $('zBody').textContent = z.body;
    const ex = $('zExtra');
    if (z.chips) ex.innerHTML = `<div class="chips">${z.chips.map(c => `<span>${c}</span>`).join('')}</div>`;
    else if (z.skills) ex.innerHTML = `<div class="skills">${z.skills.map(([name, lv, sub]) => `
      <div class="skill"><div class="sk-top"><span>${name}</span><em>${Math.round(lv * 100)}</em></div>
      <div class="sk-sub">${sub}</div><div class="bar"><i style="--w:${lv * 100}%"></i></div></div>`).join('')}</div>`;
    else if (z.projects) ex.innerHTML = z.projects.map(p => `
      <a class="proj" href="${p.url || '#'}" ${p.url ? 'target="_blank" rel="noopener"' : ''}>
      <b>${p.name}</b><span>${p.desc}</span></a>`).join('');
    else if (z.milestones) ex.innerHTML = `<div class="mstones">${z.milestones.map(([d, txt]) => `
      <div class="mst"><b>${d}</b>${txt}</div>`).join('')}</div>`;
    else if (z.links) ex.innerHTML = `<div class="clinks">${z.links.map(([k, v, href]) => `
      <a href="${href}" target="_blank" rel="noopener"><span class="k">${k}</span>
      <span class="v">${v}</span><span class="go">↗</span></a>`).join('')}</div>`;
    $('zFactTitle').textContent = z.factTitle;
    $('zFacts').innerHTML = z.facts.map(([k, v]) => `<li><span>${k}</span><span>${v}</span></li>`).join('');
  }

  dockPulse() { this.sonarRing(); }
}

export { MAX_DEPTH };
