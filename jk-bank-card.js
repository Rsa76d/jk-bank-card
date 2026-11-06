/* jk-bank-card v1.1.0 \u2014 combined view of several JK BMS (parallel bank) + side timers */
const JKB_VERSION = '1.1.0';

class JkBankCard extends HTMLElement {
  setConfig(config) {
    if (!config || !Array.isArray(config.batteries) || !config.batteries.length) {
      throw new Error('jk-bank-card: "batteries" list is required');
    }
    this._config = config;
    this._built = false;
    this._mode = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    this._update();
  }

  getCardSize() { return 9; }
  getGridOptions() { return { columns: 12, rows: 'auto', min_columns: 6 }; }

  _state(id) {
    if (!id || !this._hass) return null;
    const s = this._hass.states[id];
    return s && s.state !== 'unavailable' && s.state !== 'unknown' ? s : null;
  }

  _num(v) {
    if (typeof v === 'number') return v;
    const s = this._state(v);
    const n = s ? parseFloat(s.state) : NaN;
    return isNaN(n) ? null : n;
  }

  _build() {
    const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
    root.innerHTML = `
<style>
  ha-card { background: linear-gradient(180deg,#121826 0%,#0b0f19 100%); border-radius: 24px; padding: 18px; color: #e5e7eb; overflow: hidden; }
  .hdr { display: flex; align-items: center; gap: 14px; }
  .ico { width: 52px; height: 52px; border-radius: 14px; border: 1px solid #3a2f1c; background: #1a1712; display: flex; align-items: center; justify-content: center; font-size: 28px; }
  .ttl { flex: 1; min-width: 0; }
  .ttl b { display: block; font-size: 20px; color: #fff; }
  .sub { white-space: nowrap; font-size: 12px; letter-spacing: 3px; color: #8b93a7; text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 6px #22c55e; }
  .dot.off { background: #ef4444; box-shadow: 0 0 6px #ef4444; }
  .pill { padding: 8px 14px; border-radius: 999px; font-weight: 700; font-size: 13px; letter-spacing: 1.5px; border: 1px solid; white-space: nowrap; }
  .pill.dis { color: #f59e0b; border-color: #b45309; background: #1f160a; box-shadow: 0 0 14px rgba(245,158,11,.35); }
  .pill.chg { color: #22c55e; border-color: #15803d; background: #0b1d12; box-shadow: 0 0 14px rgba(34,197,94,.35); }
  .pill.idle { color: #9ca3af; border-color: #374151; background: #111827; }
  .gwrap { display: grid; grid-template-columns: minmax(58px,1fr) minmax(0,230px) minmax(58px,1fr); align-items: end; margin-top: 4px; }
  .gauge { position: relative; width: 100%; margin: 0 auto; }
  .tm { text-align: center; padding-bottom: 22%; cursor: pointer; min-width: 0; }
  .tm .ti { font-size: 16px; line-height: 1; }
  .tm .tv { font-size: 17px; font-weight: 800; margin-top: 4px; white-space: nowrap; }
  .tm .tl3 { font-size: 9px; letter-spacing: 1.2px; color: #8b93a7; margin-top: 3px; line-height: 1.25; text-transform: uppercase; }
  .tm.l .tv { color: #f59e0b; text-shadow: 0 0 10px rgba(245,158,11,.45); }
  .tm.r .tv { color: #38bdf8; text-shadow: 0 0 10px rgba(56,189,248,.45); }
  .tm.hid { visibility: hidden; }
  .gauge svg { width: 100%; display: block; }
  .arc { transition: stroke-dasharray .8s ease, stroke .5s; }
  .gc { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 6px; }
  .soc { font-size: 64px; font-weight: 800; line-height: 1; transition: color .5s; }
  .soc small { font-size: 22px; font-weight: 400; opacity: .8; }
  .ah { margin-top: 8px; color: #b6bccb; font-size: 16px; }
  .tl { margin-top: 4px; color: #b6bccb; font-size: 15px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
  .tile { background: #141a29; border: 1px solid #222a3d; border-radius: 16px; padding: 14px 8px; text-align: center; cursor: pointer; }
  .tile .i { font-size: 22px; }
  .tile .l { font-size: 12px; letter-spacing: 2.5px; color: #8b93a7; margin-top: 6px; }
  .tile .v { font-size: 28px; font-weight: 700; color: #fff; margin-top: 2px; }
  .tile .v small { font-size: 16px; font-weight: 400; color: #b6bccb; }
  .fet { display: flex; align-items: center; gap: 12px; border-radius: 16px; padding: 10px 16px; border: 1px solid; }
  .fet .fd { width: 14px; height: 14px; border-radius: 50%; }
  .fet .fl { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; }
  .fet .fv { font-size: 20px; font-weight: 800; }
  .fet.c { border-color: #4a3518; background: #17140f; color: #f59e0b; }
  .fet.c .fd { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
  .fet.d { border-color: #3b2a55; background: #151226; color: #c084fc; }
  .fet.d .fd { background: #c084fc; box-shadow: 0 0 8px #c084fc; }
  .fet.offs .fd { background: #4b5563; box-shadow: none; }
  .flow { margin-top: 10px; background: #111725; border: 1px solid #222a3d; border-radius: 16px; padding: 12px 12px 10px; }
  .flow .l { font-size: 12px; letter-spacing: 3px; color: #8b93a7; }
  .flow svg { width: 100%; display: block; margin-top: 4px; }
  .fv3 { display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; }
  .fv3 b { display: block; font-size: 24px; }
  .fv3 span { font-size: 11px; letter-spacing: 2px; color: #8b93a7; }
</style>
<ha-card>
  <div class="hdr">
    <div class="ico">\ud83d\udd0b</div>
    <div class="ttl"><b id="title"></b><div class="sub"><span id="subt"></span><span class="dot" id="dot"></span><span id="live">LIVE</span></div></div>
    <div class="pill idle" id="pill">IDLE</div>
  </div>
  <div class="gwrap">
  <div class="tm l hid" id="tmL" data-t="timer_left"><div class="ti">\u23f3</div><div class="tv" id="tmLv">\u2014</div><div class="tl3" id="tmLl"></div></div>
  <div class="gauge">
    <svg viewBox="0 0 200 175">
      <defs><filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle cx="100" cy="100" r="80" fill="none" stroke="#1f2636" stroke-width="16" stroke-linecap="round" stroke-dasharray="376.99 502.65" transform="rotate(135 100 100)"/>
      <circle id="arc" class="arc" cx="100" cy="100" r="80" fill="none" stroke="#facc15" stroke-width="16" stroke-linecap="round" stroke-dasharray="0 502.65" transform="rotate(135 100 100)" filter="url(#glow)"/>
    </svg>
    <div class="gc"><div class="soc" id="soc">--<small>%</small></div><div class="ah" id="ah"></div><div class="tl" id="tl"></div></div>
  </div>
  <div class="tm r hid" id="tmR" data-t="timer_right"><div class="ti">\u23f1\ufe0f</div><div class="tv" id="tmRv">\u2014</div><div class="tl3" id="tmRl"></div></div>
  </div>
  <div class="grid">
    <div class="tile" data-k="voltage"><div class="i">\ud83d\udd0c</div><div class="l">VOLTAGE</div><div class="v" id="v"></div></div>
    <div class="tile" data-k="current"><div class="i">\u26a1</div><div class="l">CURRENT</div><div class="v" id="i"></div></div>
    <div class="tile" data-k="remaining"><div class="i">\ud83d\udd0b</div><div class="l">REMAINING</div><div class="v" id="rem"></div></div>
    <div class="tile" data-k="soc"><div class="i">\u23f1\ufe0f</div><div class="l">TIME LEFT</div><div class="v" id="tl2"></div></div>
    <div class="fet c" id="fc"><div class="fd"></div><div><div class="fl">CHG FET</div><div class="fv" id="fcv"></div></div></div>
    <div class="fet d" id="fdis"><div class="fd"></div><div><div class="fl">DIS FET</div><div class="fv" id="fdv"></div></div></div>
  </div>
  <div class="flow">
    <div class="l">\u26a1 POWER FLOW</div>
    <svg viewBox="0 0 300 80">
      <defs>
        <linearGradient id="gL" x1="0" x2="1"><stop offset="0" stop-color="#a3a33a"/><stop offset="1" stop-color="#22c55e"/></linearGradient>
        <linearGradient id="gR" x1="0" x2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient>
        <filter id="dg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <path id="pL" d="M50 52 C80 12, 105 12, 128 50" fill="none" stroke="url(#gL)" stroke-width="2.5" opacity=".7"/>
      <path id="pR" d="M172 50 C195 12, 220 12, 250 52" fill="none" stroke="url(#gR)" stroke-width="2.5" opacity=".7"/>
      <text x="30" y="64" font-size="30" text-anchor="middle">\u26a1</text>
      <rect x="131" y="40" width="36" height="20" rx="5" fill="none" stroke="#22c55e" stroke-width="2.5"/>
      <rect x="167" y="46" width="4" height="8" rx="1.5" fill="#22c55e"/>
      <rect id="bfill" x="134" y="43" width="0" height="14" rx="3" fill="#4ade80"/>
      <text x="270" y="64" font-size="30" text-anchor="middle">\ud83c\udfe0</text>
      <g id="mover"></g>
    </svg>
    <div class="fv3">
      <div><b id="win" style="color:#22c55e">0</b><span>W IN</span></div>
      <div><b id="fsoc" style="color:#cbd5e1">--%</b><span>SOC</span></div>
      <div><b id="wout" style="color:#38bdf8">0</b><span>W OUT</span></div>
    </div>
  </div>
</ha-card>`;
    root.querySelectorAll('.tile').forEach(t => t.addEventListener('click', () => this._moreInfo(t.dataset.k)));
    root.querySelectorAll('.tm').forEach(t => t.addEventListener('click', () => {
      const tc = this._config[t.dataset.t];
      if (tc && tc.entity) this._fire(tc.entity);
    }));
    this._root = root;
    this._built = true;
  }

  _moreInfo(key) {
    const b = this._config.batteries[0];
    const id = b && b[key];
    if (!id || typeof id !== 'string') return;
    this._fire(id);
  }

  _fire(id) {
    const ev = new Event('hass-more-info', { bubbles: true, composed: true });
    ev.detail = { entityId: id };
    this.dispatchEvent(ev);
  }

  _fmtTime(h) {
    if (h === null || !isFinite(h) || h <= 0) return '\u2014';
    if (h > 99) return '>99h';
    const m = Math.round(h * 60);
    return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
  }

  _socColor(s) {
    if (s < 20) return '#ef4444';
    if (s < 50) return '#f97316';
    if (s < 80) return '#facc15';
    return '#22c55e';
  }

  _update() {
    if (!this._built || !this._hass) return;
    const $ = id => this._root.getElementById(id);
    const cfg = this._config;
    const idle = cfg.idle_current ?? 0.3;
    let vSum = 0, vN = 0, iSum = 0, pSum = 0, pN = 0, rem = 0, cap = 0, socW = 0;
    let missing = false, chg = [], dis = [];

    for (const b of cfg.batteries) {
      const v = this._num(b.voltage), i = this._num(b.current), p = this._num(b.power);
      const c = this._num(b.capacity), s = this._num(b.soc);
      let r = this._num(b.remaining);
      if (v === null || i === null) { missing = true; continue; }
      vSum += v; vN++;
      iSum += i;
      if (p !== null) { pSum += p; pN++; } else { pSum += v * i; pN++; }
      if (c !== null) {
        cap += c;
        if (r === null && s !== null) r = c * s / 100;
      }
      if (r !== null) rem += r;
      const cs = this._state(b.chg_fet), ds = this._state(b.dis_fet);
      if (cs) chg.push(cs.state === 'on');
      if (ds) dis.push(ds.state === 'on');
    }

    const soc = cap > 0 ? Math.max(0, Math.min(100, rem / cap * 100)) : null;
    const volt = vN ? vSum / vN : null;

    // header
    $('title').textContent = cfg.title ?? 'Battery BMS';
    $('subt').textContent = cfg.subtitle ?? 'JK BMS';
    $('dot').classList.toggle('off', missing || !vN);
    $('live').textContent = missing || !vN ? 'OFFLINE' : 'LIVE';

    let mode = 'idle';
    if (iSum > idle) mode = 'chg';
    else if (iSum < -idle) mode = 'dis';
    const pill = $('pill');
    pill.className = 'pill ' + mode;
    pill.textContent = mode === 'chg' ? '\ud83d\udd0c CHARGING' : mode === 'dis' ? '\ud83d\udd0c DISCHARGING' : 'IDLE';

    // gauge
    const col = soc === null ? '#4b5563' : this._socColor(soc);
    const arc = $('arc');
    arc.setAttribute('stroke-dasharray', `${(soc ?? 0) / 100 * 376.99} 502.65`);
    arc.setAttribute('stroke', col);
    const socEl = $('soc');
    socEl.innerHTML = `${soc === null ? '--' : Math.round(soc)}<small>%</small>`;
    socEl.style.color = col;
    $('ah').textContent = `${rem.toFixed(1)} / ${Math.round(cap)} Ah`;

    let hours = null;
    if (mode === 'dis') hours = rem / Math.abs(iSum);
    else if (mode === 'chg') hours = (cap - rem) / iSum;
    const t = this._fmtTime(hours);
    $('tl').textContent = (mode === 'chg' ? '\u23f1 \u0434\u043e \u043f\u043e\u0432\u043d\u043e\u0433\u043e ' : '\u23f1 ') + t;

    // tiles
    $('v').innerHTML = volt === null ? '\u2014' : `${volt.toFixed(2)}<small>V</small>`;
    const iEl = $('i');
    iEl.innerHTML = `${iSum.toFixed(1)}<small>A</small>`;
    iEl.style.color = mode === 'dis' ? '#38bdf8' : mode === 'chg' ? '#22c55e' : '#fff';
    $('rem').innerHTML = `${rem.toFixed(1)}<small>Ah</small>`;
    $('tl2').textContent = t;

    // side timers (history_stats sensors, hours)
    const timer = (key, box, val, lab, defLabel) => {
      const tc = cfg[key];
      const el = $(box);
      if (!tc || !tc.entity) { el.classList.add('hid'); return; }
      el.classList.remove('hid');
      const h = this._num(tc.entity);
      if (h === null) $(val).textContent = '\u2014';
      else {
        const m = Math.floor(h * 60 + 1e-6);
        $(val).textContent = `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
      }
      $(lab).textContent = tc.label ?? defLabel;
    };
    timer('timer_left', 'tmL', 'tmLv', 'tmLl', 'today');
    timer('timer_right', 'tmR', 'tmRv', 'tmRl', 'since charge');

    const fet = (arr, el, val) => {
      const on = arr.length ? arr.every(Boolean) : null;
      $(val).textContent = on === null ? '\u2014' : on ? 'ON' : 'OFF';
      $(el).classList.toggle('offs', on !== true);
    };
    fet(chg, 'fc', 'fcv');
    fet(dis, 'fdis', 'fdv');

    // power flow
    const wIn = pSum > 0 && mode === 'chg' ? pSum : 0;
    const wOut = pSum < 0 && mode === 'dis' ? -pSum : 0;
    $('win').textContent = Math.round(wIn);
    $('wout').textContent = Math.round(wOut);
    $('fsoc').textContent = soc === null ? '--%' : `${Math.round(soc)}%`;
    $('bfill').setAttribute('width', String(30 * (soc ?? 0) / 100));
    $('bfill').setAttribute('fill', soc === null ? '#4b5563' : (soc < 20 ? '#ef4444' : '#4ade80'));

    if (mode !== this._mode) {
      this._mode = mode;
      const mover = $('mover');
      if (mode === 'idle') mover.innerHTML = '';
      else {
        const path = mode === 'chg' ? '#pL' : '#pR';
        const color = mode === 'chg' ? '#4ade80' : '#7dd3fc';
        mover.innerHTML = `<circle r="5" fill="${color}" filter="url(#dg)"><animateMotion dur="1.8s" repeatCount="indefinite" rotate="auto"><mpath href="${path}"/></animateMotion></circle>`;
      }
    }
  }
}

if (!customElements.get('jk-bank-card')) {
  customElements.define('jk-bank-card', JkBankCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'jk-bank-card', name: 'JK Bank Card', description: 'Combined view of parallel JK BMS batteries' });
  console.info(`%c JK-BANK-CARD %c v${JKB_VERSION} `, 'background:#f59e0b;color:#000', 'background:#111;color:#fff');
}
