// ══════════════════════════════════════════
// SuonaRoma · app.js · Legge da file JSON
// ══════════════════════════════════════════

// ── STATO GLOBALE ──
let venues    = [];
let eventiOggi = [];
let eventiTutti = [];
let allGenres  = [];
let sortedEvents = [];
let selectedGenres = new Set();
let currentVenueId = null;
let leafletMap = null;
let mapMarkers = {};
let activeMapVenue = null;
let calSelectedDate = null;

// ── DATE ──
const _today  = new Date();
const _mesiL  = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const _giorni = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];

function initDate() {
  const dd = String(_today.getDate()).padStart(2,'0');
  const mm = String(_today.getMonth()+1).padStart(2,'0');
  const yyyy = _today.getFullYear();
  const el1 = document.getElementById('live-date');
  const el2 = document.getElementById('full-date');
  if(el1) el1.textContent = `${dd}/${mm}/${yyyy}`;
  if(el2) el2.textContent = `${_giorni[_today.getDay()]} ${_today.getDate()} ${_mesiL[_today.getMonth()]} ${yyyy}`;
}

// ── CARICAMENTO JSON ──
async function loadData() {
  try {
    const [rLocali, rEventi] = await Promise.all([
      fetch('data/locali.json'),
      fetch('data/eventi.json')
    ]);
    venues      = await rLocali.json();
    eventiTutti = await rEventi.json();

    // Calcola data di oggi come stringa YYYY-MM-DD per confronto
    const pad  = n => String(n).padStart(2,'0');
    const oggi = `${_today.getFullYear()}-${pad(_today.getMonth()+1)}-${pad(_today.getDate())}`;

    // Oggi: eventi con data == oggi
    eventiOggi = eventiTutti.filter(e => e.data === oggi);

    // Generi: dall'unione dei generi dei locali
    allGenres = [...new Set(venues.flatMap(v => v.generi))].sort();
  } catch(e) {
    console.error('Errore caricamento JSON:', e);
    venues = []; eventiOggi = []; eventiTutti = [];
  }
}

function getVenue(id) { return venues.find(v => v.id === id); }

// ── INIT PAGINE ──
async function initPaginaOggi() {
  initDate();
  await loadData();
  renderEvents();
}

async function initPaginaCalendario() {
  initDate();
  await loadData();
  renderCalendario();
}

async function initPaginaLocali() {
  initDate();
  await loadData();
  renderVenues();
}

async function initPaginaGeneri() {
  initDate();
  await loadData();
  renderGenreTags();
}

async function initPaginaMappa() {
  initDate();
  await loadData();
  renderMappa();
}

function initPaginaContatti() {
  initDate();
}

// ── CARD EVENTO (riusabile) ──
function buildEventCard(ev, idx, totalCount, extraTopLabel) {
  const v     = ev.venueId ? getVenue(ev.venueId) : null;
  const vName = v ? v.nome    : (ev.tmVenue  || '');
  const vAddr = v ? v.indirizzo : (ev.tmAddress || '');
  const vClick = v ? `openVenuePanel(${v.id})` : `window.open('${ev.tmUrl||'#'}','_blank')`;
  const badge  = ev.isTM
    ? `<span class="booking-badge booking-yes" style="background:var(--accent)">🎟 Biglietti disponibili</span>`
    : `<span class="booking-badge ${ev.prenotazione?'booking-yes':'booking-no'}">${ev.prenotazione?'● Prenotazione richiesta':'○ Senza prenotazione'}</span>`;
  const topLabel = extraTopLabel
    ? `<div class="event-num" style="color:var(--accent)">${extraTopLabel}</div>`
    : '';
  return `<div class="event-card" onclick="${vClick}">
    ${topLabel}
    <div class="event-num">Nº ${String(idx+1).padStart(2,'0')} / ${String(totalCount).padStart(2,'0')}</div>
    <div class="event-time">${ev.ora}</div>
    <div class="event-artist">${ev.artista || ev.artist || ''}</div>
    <div class="event-genre-label">${ev.genere || ev.genre || ''}</div>
    ${ev.note ? `<div class="event-note">${ev.note}</div>` : ''}
    <div class="event-meta">
      <div class="event-meta-row"><i class="fa fa-location-dot"></i>
        ${v ? `<a class="venue-link" onclick="event.stopPropagation();openVenuePanel(${v.id})">${vName}</a>`
            : `<span style="font-weight:600;font-family:'DM Mono',monospace;font-size:11px">${vName}</span>`}
      </div>
      <div class="event-meta-row"><i class="fa fa-map-marker-alt"></i><span>${vAddr}</span></div>
      <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-top:.2rem">
        ${badge}
        <button onclick="event.stopPropagation();shareEventCard(${v?v.id:'null'},${idx},this,'${(ev.artista||ev.artist||'').replace(/'/g,"\\'")}','${(ev.genere||ev.genre||'').replace(/'/g,"\\'")}','${ev.ora}')" class="card-share-btn"><i class="fa fa-share-nodes"></i> Condividi</button>
      </div>
    </div>
  </div>`;
}

// ── PAGINA OGGI ──
function renderEvents() {
  sortedEvents = [...eventiOggi].sort((a,b) => a.ora.localeCompare(b.ora));
  const venueIds = [...new Set(sortedEvents.filter(e=>e.venueId).map(e=>e.venueId))];
  const se = document.getElementById('stat-eventi');
  const sl = document.getElementById('stat-locali');
  const sa = document.getElementById('stat-archivio');
  if(se) se.textContent = sortedEvents.length;
  if(sl) sl.textContent = venueIds.length;
  if(sa) sa.textContent = venues.length;

  const grid = document.getElementById('events-grid');
  if(!grid) return;

  if(sortedEvents.length === 0) {
    grid.style.background = 'transparent';
    grid.innerHTML = `<div style="grid-column:1/-1;padding:3rem 2rem;text-align:center;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);letter-spacing:.1em"><span style="display:block;font-family:'Playfair Display',serif;font-size:1.5rem;color:var(--border);margin-bottom:.8rem">♩</span>Nessun evento in programma oggi.</div>`;
    return;
  }
  grid.style.background = 'var(--border)';
  grid.innerHTML = sortedEvents.map((ev, i) => buildEventCard(ev, i, sortedEvents.length, null)).join('');
}

// ── PAGINA LOCALI ──
function renderVenues(list) {
  const data = [...(list || venues)].sort((a,b) => a.nome.localeCompare(b.nome, 'it'));
  const n = data.length;
  const hint  = document.getElementById('locali-hint');
  const count = document.getElementById('locali-count');
  if(hint)  hint.textContent  = `${n} ${n===1?'locale':'locali'}`;
  if(count && !list) count.textContent = `${venues.length} locali in archivio`;

  document.getElementById('venues-grid').innerHTML = data.map(v => `
    <div class="venue-card">
      <div class="vc-num">Nº ${String(venues.indexOf(v)+1).padStart(2,'0')} / ${String(venues.length).padStart(2,'0')}</div>
      <div class="vc-tag">${v.tag}</div>
      <div class="vc-name">${v.nome}</div>
      ${v.descrizione ? `<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);line-height:1.6;margin-bottom:.8rem">${v.descrizione}</div>` : ''}
      <div class="vc-info">
        <div class="vc-row"><i class="fa fa-map-marker-alt"></i><span>${v.indirizzo}</span></div>
        <div class="vc-row"><i class="fa fa-phone"></i><a class="vc-phone" href="tel:${v.telefono.replace(/\s/g,'')}">${v.telefono}</a></div>
        <div class="vc-row"><i class="fa fa-globe"></i><a class="vc-web" href="${v.website}" target="_blank">${v.website.replace(/https?:\/\//,'')}</a></div>
      </div>
      <div class="vc-actions">
        <a class="vc-btn vc-btn-call" href="tel:${v.telefono.replace(/\s/g,'')}"><i class="fa fa-phone"></i> Chiama</a>
        <button class="vc-btn vc-btn-events" onclick="openVenuePanel(${v.id})"><i class="fa fa-calendar"></i> Eventi</button>
        <button class="vc-btn vc-btn-share" onclick="shareVenueCard(${v.id},this)"><i class="fa fa-share-nodes"></i> Condividi</button>
      </div>
    </div>`).join('') || `<div style="grid-column:1/-1;padding:3rem 2rem;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);text-align:center"><span style="display:block;font-family:'Playfair Display',serif;font-size:1.5rem;color:var(--border);margin-bottom:.5rem">♪</span>Nessun locale trovato</div>`;
}

function filterVenues(q) {
  const clear = document.getElementById('locali-clear');
  const hint  = document.getElementById('locali-hint');
  const bar   = document.getElementById('locali-bar-label');
  const count = document.getElementById('locali-count');
  const term  = q.trim().toLowerCase();
  clear.classList.toggle('hidden', term === '');
  if(!term) { renderVenues(); bar.textContent='◆ tutti i locali'; count.textContent=`${venues.length} locali in archivio`; return; }
  const filtered = venues.filter(v =>
    v.nome.toLowerCase().includes(term) ||
    v.indirizzo.toLowerCase().includes(term) ||
    v.tag.toLowerCase().includes(term) ||
    v.generi.some(g => g.toLowerCase().includes(term)) ||
    (v.tipo && v.tipo.toLowerCase().includes(term)) ||
    (v.descrizione && v.descrizione.toLowerCase().includes(term))
  );
  renderVenues(filtered);
  const n = filtered.length;
  hint.textContent  = `${n} ${n===1?'risultato':'risultati'}`;
  bar.textContent   = n > 0 ? `◆ risultati per "${q.trim()}"` : '◆ nessun risultato';
  count.textContent = `${n} ${n===1?'locale trovato':'locali trovati'}`;
}

function clearVenueSearch() {
  const input = document.getElementById('locali-search');
  input.value = ''; input.focus(); filterVenues('');
}

// ── PAGINA GENERI ──
function renderGenreTags() {
  document.getElementById('genre-tags').innerHTML =
    allGenres.map(g => `<span class="genre-tag${selectedGenres.has(g)?' selected':''}" onclick="toggleGenre('${g}')">${g}</span>`).join('') +
    `<span class="genre-reset" onclick="resetGenres()">✕ Azzera filtri</span>`;
  renderGenreResults();
}

function toggleGenre(g) { selectedGenres.has(g) ? selectedGenres.delete(g) : selectedGenres.add(g); renderGenreTags(); }
function resetGenres()   { selectedGenres.clear(); renderGenreTags(); }

function renderGenreResults() {
  const grid  = document.getElementById('genre-events-grid');
  const count = document.getElementById('genre-count');
  if(selectedGenres.size === 0) {
    count.textContent = 'seleziona un genere';
    grid.innerHTML = `<div class="generi-empty" style="grid-column:1/-1"><span>♩</span>Seleziona uno o più generi per vedere gli eventi</div>`;
    grid.style.background = 'transparent'; return;
  }
  const matchesGenre = (genreStr) => {
    const evGenres = genreStr.toLowerCase().split(/[\/,]+/).map(g => g.trim());
    return [...selectedGenres].some(sg => evGenres.some(eg => eg.includes(sg.toLowerCase()) || sg.toLowerCase().includes(eg)));
  };
  const todayFiltered  = eventiOggi.filter(ev => matchesGenre(ev.genere || ''));
  const futureFiltered = eventiTutti.filter(ev => matchesGenre(ev.genere || ''));
  const total = todayFiltered.length + futureFiltered.length;
  count.textContent = `${total} ${total===1?'evento trovato':'eventi trovati'}`;
  grid.style.background = total > 0 ? 'var(--border)' : 'transparent';
  if(total === 0) { grid.innerHTML = `<div class="generi-empty" style="grid-column:1/-1"><span>♪</span>Nessun evento trovato</div>`; return; }

  const todayCards = todayFiltered.map((ev, i) => buildEventCard(ev, i, todayFiltered.length, '● OGGI'));
  const futureCards = futureFiltered.map((ev, i) => {
    const d = new Date(ev.data);
    const label = `${d.getDate()} ${_mesiL[d.getMonth()].slice(0,3).toUpperCase()}`;
    return buildEventCard({...ev, artista: ev.artista, genere: ev.genere}, i, futureFiltered.length, label);
  });
  grid.innerHTML = [...todayCards, ...futureCards].join('');
}

// ── PAGINA CALENDARIO ──
function getAllFutureEventsSorted() {
  const pad  = n => String(n).padStart(2,'0');
  const oggi = `${_today.getFullYear()}-${pad(_today.getMonth()+1)}-${pad(_today.getDate())}`;
  return [...eventiTutti]
    .filter(e => e.data > oggi)
    .sort((a,b) => a.data !== b.data ? a.data.localeCompare(b.data) : a.ora.localeCompare(b.ora));
}

function renderCalendario() {
  const all = getAllFutureEventsSorted();
  const dates = [...new Set(all.map(e => e.data))].sort();
  if(!calSelectedDate && dates.length > 0) calSelectedDate = dates[0];
  const input = document.getElementById('cal-date-input');
  if(input) { input.min = dates[0]||''; input.max = dates[dates.length-1]||''; input.value = calSelectedDate||''; }
  _renderCalResults();
}

function _renderCalResults() {
  const all = getAllFutureEventsSorted();
  let filtered, labelText;
  if(calSelectedDate) {
    filtered = all.filter(e => e.data === calSelectedDate);
    const d = new Date(calSelectedDate+'T00:00:00');
    labelText = `◆ ${_giorni[d.getDay()]} ${d.getDate()} ${_mesiL[d.getMonth()]} ${d.getFullYear()}`;
  } else {
    filtered = all;
    labelText = '◆ tutti gli eventi in programma';
  }
  const bar   = document.getElementById('cal-bar-label');
  const count = document.getElementById('cal-count');
  const hint  = document.getElementById('cal-hint');
  if(bar)   bar.textContent   = labelText;
  if(count) count.textContent = `${filtered.length} ${filtered.length===1?'evento':'eventi'}`;
  if(hint)  hint.textContent  = `${filtered.length} ${filtered.length===1?'evento trovato':'eventi trovati'}`;

  const grid = document.getElementById('cal-events-grid');
  if(!grid) return;
  if(filtered.length === 0) {
    grid.style.background = 'transparent';
    grid.innerHTML = `<div style="grid-column:1/-1;padding:3rem 2rem;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);text-align:center;letter-spacing:.1em"><span style="display:block;font-family:'Playfair Display',serif;font-size:1.5rem;color:var(--border);margin-bottom:.5rem">♪</span>Nessun evento per questa data</div>`;
    return;
  }
  grid.style.background = 'var(--border)';
  grid.innerHTML = filtered.map((ev, i) => {
    const d = new Date(ev.data+'T00:00:00');
    const topLabel = calSelectedDate ? null : `${d.getDate()} ${_mesiL[d.getMonth()].slice(0,3).toUpperCase()} ${d.getFullYear()}`;
    return buildEventCard({...ev, artista: ev.artista, genere: ev.genere}, i, filtered.length, topLabel);
  }).join('');
}

function calSetDate(val) { calSelectedDate = val || null; _renderCalResults(); }
function calGoToday()    {
  const t = new Date();
  calSelectedDate = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  const input = document.getElementById('cal-date-input');
  if(input) input.value = calSelectedDate;
  _renderCalResults();
}
function calPrevDay() {
  const dates = [...new Set(eventiTutti.map(e=>e.data))].sort();
  const idx = calSelectedDate ? dates.indexOf(calSelectedDate) : 0;
  if(idx > 0) { calSelectedDate = dates[idx-1]; const i=document.getElementById('cal-date-input'); if(i) i.value=calSelectedDate; _renderCalResults(); }
}
function calNextDay() {
  const dates = [...new Set(eventiTutti.map(e=>e.data))].sort();
  const idx = calSelectedDate ? dates.indexOf(calSelectedDate) : -1;
  if(idx < dates.length-1) { calSelectedDate = dates[idx+1]; const i=document.getElementById('cal-date-input'); if(i) i.value=calSelectedDate; _renderCalResults(); }
}

// ── SIDE PANEL ──
function openVenuePanel(venueId) {
  currentVenueId = venueId;
  const v = getVenue(venueId);
  if(!v) return;
  document.getElementById('panel-tag').textContent     = v.tag;
  document.getElementById('panel-name').textContent    = v.nome;
  document.getElementById('panel-address').textContent = v.indirizzo;
  document.getElementById('btn-call').href             = 'tel:' + v.telefono.replace(/\s/g,'');
  document.getElementById('panel-website').href        = v.website;
  document.getElementById('contact-form').classList.remove('open');
  document.getElementById('form-success').style.display = 'none';

  const pad  = n => String(n).padStart(2,'0');
  const oggi = `${_today.getFullYear()}-${pad(_today.getMonth()+1)}-${pad(_today.getDate())}`;
  const futuri = eventiTutti
    .filter(e => e.venueId === venueId && e.data >= oggi)
    .sort((a,b) => a.data.localeCompare(b.data))
    .slice(0, 10);

  document.getElementById('panel-events').innerHTML = futuri.length
    ? futuri.map(e => {
        const d = new Date(e.data+'T00:00:00');
        return `<div class="panel-event">
          <div class="panel-event-date">
            <div class="panel-event-day">${d.getDate()}</div>
            <div class="panel-event-month">${_mesiL[d.getMonth()].slice(0,3).toUpperCase()}</div>
          </div>
          <div class="panel-event-info">
            <div class="panel-event-artist">${e.artista}</div>
            <div class="panel-event-genre">${e.genere}</div>
            <div class="panel-event-time"><i class="fa fa-clock"></i> ${e.ora}</div>
          </div>
        </div>`;
      }).join('')
    : `<div style="padding:1.5rem 2rem;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted)">Nessun evento in archivio. Consulta il sito ufficiale.</div>`;

  document.getElementById('panel-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePanel(e) {
  if(e && e.target !== document.getElementById('panel-overlay')) return;
  document.getElementById('panel-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
function toggleForm() { document.getElementById('contact-form').classList.toggle('open'); }
function sendForm() {
  const o = document.getElementById('form-oggetto').value;
  const m = document.getElementById('form-msg').value;
  if(!o||!m) { alert('Compila tutti i campi.'); return; }
  document.getElementById('form-oggetto').value = '';
  document.getElementById('form-msg').value = '';
  document.getElementById('form-success').style.display = 'block';
}

// ── SHARE ──
function doShare(title, text, url, btn) {
  if(navigator.share) {
    navigator.share({title, text, url}).catch(()=>{});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fa fa-check"></i> Copiato!';
      setTimeout(() => btn.innerHTML = orig, 2000);
    });
  }
}

function shareVenue() {
  const v = getVenue(currentVenueId); if(!v) return;
  const futuri = eventiTutti.filter(e=>e.venueId===v.id).slice(0,5);
  const evText = futuri.length ? '\n\nPROSSIMI EVENTI:\n'+futuri.map(e=>`• ${e.data} – ${e.artista} (${e.genere}) ore ${e.ora}`).join('\n') : '';
  const text = `🎵 ${v.nome}\n📍 ${v.indirizzo}\n📞 ${v.telefono}\n🌐 ${v.website}${evText}`;
  doShare(v.nome, text, v.website, document.querySelector('.btn-share'));
}

function shareVenueCard(venueId, btn) {
  const v = getVenue(venueId); if(!v) return;
  const text = `🎵 ${v.nome}\n📍 ${v.indirizzo}\n📞 ${v.telefono}\n🌐 ${v.website}`;
  doShare(v.nome, text, v.website, btn);
}

function shareEventCard(venueId, idx, btn, artista, genere, ora) {
  const v = venueId ? getVenue(venueId) : null;
  const vName = v ? v.nome : '';
  const vAddr = v ? v.indirizzo : '';
  const vUrl  = v ? v.website : '#';
  const text = `🎵 ${artista}\n🎼 ${genere}\n🕐 ore ${ora}\n📍 ${vName}\n🗺 ${vAddr}\n🌐 ${vUrl}`;
  doShare(`${artista}${vName?' – '+vName:''}`, text, vUrl, btn);
}

// ── PAGINA MAPPA ──
function renderMappa() {
  const sub = document.getElementById('mappa-sub');
  if(sub) sub.textContent = `${venues.length} locali · clicca per centrare la mappa`;
  document.getElementById('mappa-list').innerHTML = venues.map(v => `
    <div class="mappa-venue-item" id="mvi-${v.id}" onclick="selectMapVenue(${v.id})">
      <div class="mvi-pin">📍</div>
      <div class="mvi-body">
        <div class="mvi-name">${v.nome}</div>
        <div class="mvi-tag">${v.tag}</div>
        <div class="mvi-addr">${v.indirizzo}</div>
        <a class="mvi-phone" href="tel:${v.telefono.replace(/\s/g,'')}" onclick="event.stopPropagation()">${v.telefono}</a>
        <div class="mvi-actions">
          <a class="mvi-btn mvi-btn-call" href="tel:${v.telefono.replace(/\s/g,'')}" onclick="event.stopPropagation()"><i class="fa fa-phone"></i> Chiama</a>
          <button class="mvi-btn mvi-btn-eventi" onclick="event.stopPropagation();openVenuePanel(${v.id})"><i class="fa fa-calendar"></i> Eventi</button>
          <a class="mvi-btn mvi-btn-maps" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(v.indirizzo+', Roma')}" target="_blank" onclick="event.stopPropagation()"><i class="fa fa-diamond-turn-right"></i> Indicazioni</a>
        </div>
      </div>
    </div>`).join('');

  if(leafletMap) { leafletMap.invalidateSize(); return; }
  setTimeout(() => {
    leafletMap = L.map('leaflet-map', {zoomControl:true}).setView([41.9028, 12.4964], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
      subdomains:'abcd', maxZoom:19
    }).addTo(leafletMap);

    const customIcon = L.divIcon({ className:'',
      html:`<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:#C75B2A;border:2px solid #3d3f52;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3)"><span style="transform:rotate(45deg);font-size:13px;color:#EFE7D2">♪</span></div>`,
      iconSize:[32,32], iconAnchor:[16,32], popupAnchor:[0,-36]
    });
    const activeIcon = L.divIcon({ className:'',
      html:`<div style="width:38px;height:38px;border-radius:50% 50% 50% 0;background:#3d3f52;border:2px solid #C75B2A;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.4)"><span style="transform:rotate(45deg);font-size:15px;color:#EFE7D2">♪</span></div>`,
      iconSize:[38,38], iconAnchor:[19,38], popupAnchor:[0,-42]
    });

    venues.forEach(v => {
      if(!v.lat || !v.lng) return;
      const marker = L.marker([v.lat, v.lng], {icon: customIcon})
        .addTo(leafletMap)
        .bindPopup(`<div style="font-family:'DM Mono',monospace;min-width:180px">
          <div style="font-size:9px;color:#C75B2A;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.3rem">${v.tag}</div>
          <div style="font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:#3d3f52;margin-bottom:.4rem">${v.nome}</div>
          <div style="font-size:10px;color:#7a7060;margin-bottom:.5rem">${v.indirizzo}</div>
          <a href="tel:${v.telefono.replace(/\s/g,'')}" style="font-size:10px;color:#3d3f52;font-weight:600;text-decoration:none">${v.telefono}</a>
        </div>`, {maxWidth:240});
      marker.on('click', () => selectMapVenue(v.id, false));
      mapMarkers[v.id] = {marker, customIcon, activeIcon};
    });
  }, 100);
}

function selectMapVenue(id, fromList=true) {
  if(activeMapVenue && mapMarkers[activeMapVenue])
    mapMarkers[activeMapVenue].marker.setIcon(mapMarkers[activeMapVenue].customIcon);
  if(activeMapVenue) { const p=document.getElementById('mvi-'+activeMapVenue); if(p) p.classList.remove('active'); }
  activeMapVenue = id;
  const el = document.getElementById('mvi-'+id);
  if(el) { el.classList.add('active'); el.scrollIntoView({behavior:'smooth',block:'nearest'}); }
  if(mapMarkers[id]) {
    mapMarkers[id].marker.setIcon(mapMarkers[id].activeIcon);
    mapMarkers[id].marker.openPopup();
    if(fromList) { const v=getVenue(id); leafletMap.flyTo([v.lat, v.lng], 16, {duration:0.8}); }
  }
}

// ── PAGINA CONTATTI ──
function sendContatti() {
  const nome    = document.getElementById('c-nome').value.trim();
  const email   = document.getElementById('c-email').value.trim();
  const oggetto = document.getElementById('c-oggetto').value.trim();
  const msg     = document.getElementById('c-msg').value.trim();
  if(!nome||!email||!oggetto||!msg) { alert('Compila tutti i campi.'); return; }
  window.location.href = `mailto:nycheia@proton.me?subject=${encodeURIComponent('[SuonaRoma] '+oggetto)}&body=${encodeURIComponent('Da: '+nome+' <'+email+'>\n\n'+msg)}`;
  document.getElementById('c-nome').value='';
  document.getElementById('c-email').value='';
  document.getElementById('c-oggetto').value='';
  document.getElementById('c-msg').value='';
  document.getElementById('contatti-success').style.display='block';
  setTimeout(()=>document.getElementById('contatti-success').style.display='none',5000);
}
