(() => {
  'use strict';
  const STORAGE_SESSIONS = 'rt75.sessions.v1';
  const STORAGE_DRAFT = 'rt75.draft.v1';
  const $ = id => document.getElementById(id);
  const screens = [...document.querySelectorAll('.screen')];
  const scoreInputs = ['score3','score4','score5','score6','score7'].map($);

  let draft = null;
  let roundIndex = 0;
  let cloudState = { ready:false, available:false, signedIn:false, accountName:'', message:'Local' };

  const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : `rt75-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const todayLocal = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };
  const descriptor = i => ({walkBack: i < 4 ? 'A' : 'B', round: (i % 4) + 1});
  const sum = a => a.reduce((x,y)=>x+y,0);
  const safeSessions = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_SESSIONS) || '[]'); }
    catch { return []; }
  };
  const saveSessions = sessions => localStorage.setItem(STORAGE_SESSIONS, JSON.stringify(sessions));
  const saveDraft = () => draft && localStorage.setItem(STORAGE_DRAFT, JSON.stringify({...draft, roundIndex}));
  const clearDraft = () => localStorage.removeItem(STORAGE_DRAFT);
  const readDraft = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_DRAFT) || 'null'); }
    catch { return null; }
  };

  function showScreen(name){
    screens.forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));
    window.scrollTo({top:0, behavior:'instant'});
  }

  function startNewSession(){
    const date = $('sessionDate').value;
    if(!date){ $('sessionDate').focus(); return; }
    draft = {
      sessionId: makeId(),
      sessionDate: date,
      discipline: $('discipline').value,
      rounds: Array.from({length:8},()=>null),
      context: {energy:3, focus:3, physicalSetup:3, distractionLevel:3, notes:'', achievements:''},
      createdAt: new Date().toISOString()
    };
    roundIndex = 0;
    saveDraft();
    loadRound();
    showScreen('score');
  }

  function validateScores(){
    const values = [];
    for(const input of scoreInputs){
      if(input.value === '') return {ok:false, message:'Enter a score for every distance.'};
      const n = Number(input.value);
      if(!Number.isInteger(n) || n < 0 || n > 15) return {ok:false, message:'Each distance score must be a whole number from 0 to 15.'};
      values.push(n);
    }
    return {ok:true, values};
  }

  function updateRoundTotal(){
    const values = scoreInputs.map(i => i.value === '' ? 0 : Math.max(0, Math.min(15, Number(i.value) || 0)));
    const t = sum(values);
    $('roundTotal').textContent = t;
    $('roundPct').textContent = `${((t/75)*100).toFixed(1)}%`;
  }

  function persistCurrentRound(){
    const result = validateScores();
    if(!result.ok){ $('scoreError').textContent = result.message; return false; }
    $('scoreError').textContent = '';
    const d = descriptor(roundIndex);
    const total = sum(result.values);
    draft.rounds[roundIndex] = {
      walkBack:d.walkBack,
      round:d.round,
      score3m:result.values[0], score4m:result.values[1], score5m:result.values[2], score6m:result.values[3], score7m:result.values[4],
      roundTotal: total,
      roundPct: total/75
    };
    saveDraft();
    return true;
  }

  function loadRound(){
    const d = descriptor(roundIndex);
    $('roundLabel').textContent = `Walk-Back ${d.walkBack} · Round ${d.round}`;
    $('roundProgress').textContent = `${roundIndex+1} of 8`;
    $('progressBar').style.width = `${((roundIndex+1)/8)*100}%`;
    $('prevRoundBtn').disabled = roundIndex === 0;
    $('nextRoundBtn').textContent = roundIndex === 7 ? 'Continue to context' : 'Save & next';
    const r = draft.rounds[roundIndex];
    const vals = r ? [r.score3m,r.score4m,r.score5m,r.score6m,r.score7m] : ['','','','',''];
    scoreInputs.forEach((input,i)=>input.value = vals[i]);
    updateRoundTotal();
    renderRoundTiles();
  }

  function renderRoundTiles(){
    $('roundTiles').innerHTML = draft.rounds.map((r,i) => {
      const d = descriptor(i);
      return `<div class="round-tile ${i===roundIndex?'current':''}"><small>${d.walkBack}${d.round}</small><strong>${r?r.roundTotal:'—'}</strong></div>`;
    }).join('');
  }

  function goNextRound(){
    if(!persistCurrentRound()) return;
    if(roundIndex < 7){ roundIndex++; loadRound(); return; }
    loadContext(); showScreen('context');
  }
  function goPrevRound(){
    const hasAny = scoreInputs.some(i=>i.value!=='');
    if(hasAny && !persistCurrentRound()) return;
    if(roundIndex>0){ roundIndex--; loadRound(); }
  }

  function loadContext(){
    const c = draft.context || {};
    $('energy').value = c.energy ?? 3; $('focus').value = c.focus ?? 3; $('physical').value = c.physicalSetup ?? 3; $('distraction').value = c.distractionLevel ?? 3;
    $('notes').value = c.notes || ''; $('achievements').value = c.achievements || '';
    refreshRatings();
  }
  function refreshRatings(){
    $('energyValue').textContent = `${$('energy').value}/5`;
    $('focusValue').textContent = `${$('focus').value}/5`;
    $('physicalValue').textContent = `${$('physical').value}/5`;
    $('distractionValue').textContent = `${$('distraction').value}/5`;
  }
  function persistContext(){
    draft.context = {
      energy:Number($('energy').value), focus:Number($('focus').value), physicalSetup:Number($('physical').value), distractionLevel:Number($('distraction').value),
      notes:$('notes').value.trim(), achievements:$('achievements').value.trim()
    };
    saveDraft();
  }

  function buildReview(){
    persistContext();
    $('reviewMeta').textContent = `${formatDate(draft.sessionDate)} · ${draft.discipline} · ${shortId(draft.sessionId)}`;
    const total = sum(draft.rounds.map(r=>r.roundTotal));
    $('sessionTotal').textContent = `${total}/600`;
    $('reviewRounds').innerHTML = draft.rounds.map(r => `<div class="review-row"><strong>${r.walkBack}${r.round}</strong><div class="review-scores"><span>3m ${r.score3m}</span><span>4m ${r.score4m}</span><span>5m ${r.score5m}</span><span>6m ${r.score6m}</span><span>7m ${r.score7m}</span></div><div class="review-total">${r.roundTotal}</div></div>`).join('');
    const c=draft.context;
    $('reviewContext').innerHTML = `
      <div class="context-item"><span>Energy</span><strong>${c.energy}/5</strong></div>
      <div class="context-item"><span>Focus</span><strong>${c.focus}/5</strong></div>
      <div class="context-item"><span>Physical setup</span><strong>${c.physicalSetup}/5</strong></div>
      <div class="context-item"><span>Distraction</span><strong>${c.distractionLevel}/5</strong></div>
      <div class="context-item wide"><span>Notes</span><strong>${escapeHtml(c.notes || '—')}</strong></div>
      <div class="context-item wide"><span>Achievements</span><strong>${escapeHtml(c.achievements || '—')}</strong></div>`;
  }

  async function finalSave(){
    const sessions=safeSessions();
    const record={...draft, savedAt:new Date().toISOString(), sync:{status:'pending', message:'Saved locally; waiting to sync.'}};
    sessions.unshift(record);
    saveSessions(sessions);
    clearDraft();
    const total=sum(record.rounds.map(r=>r.roundTotal));
    $('successSummary').textContent=`${formatDate(record.sessionDate)} · ${record.discipline} · ${total}/600`;
    $('successSync').textContent='Saved safely on this device.';
    draft=null; roundIndex=0;
    updateHome();
    showScreen('success');

    if(cloudState.signedIn){
      $('successSync').textContent='Saved locally. Syncing to Microsoft Lists…';
      await syncRecord(record.sessionId, msg => $('successSync').textContent = msg);
    } else {
      $('successSync').textContent='Saved locally. Sign in with Microsoft to sync.';
    }
  }

  async function syncRecord(sessionId, progress = () => {}){
    const sessions=safeSessions();
    const index=sessions.findIndex(s=>s.sessionId===sessionId);
    if(index<0) return false;
    if(!window.rt75Cloud) return false;
    try{
      sessions[index].sync={status:'syncing', message:'Syncing…'};
      saveSessions(sessions);
      progress('Syncing to Microsoft Lists…');
      await window.rt75Cloud.syncSession(sessions[index], progress);
      const refreshed=safeSessions();
      const idx=refreshed.findIndex(s=>s.sessionId===sessionId);
      if(idx>=0){
        refreshed[idx].sync={status:'synced', syncedAt:new Date().toISOString(), message:'Synced to Microsoft Lists'};
        saveSessions(refreshed);
      }
      progress('Synced to Microsoft Lists ✓');
      updateHome();
      return true;
    }catch(err){
      console.error('Road to 75 sync failed', err);
      const refreshed=safeSessions();
      const idx=refreshed.findIndex(s=>s.sessionId===sessionId);
      if(idx>=0){
        refreshed[idx].sync={status:'error', message:err.message || 'Sync failed'};
        saveSessions(refreshed);
      }
      progress(`Saved locally. Sync failed: ${err.message || 'Unknown error'}`);
      updateHome();
      return false;
    }
  }

  function renderHistory(){
    const sessions=safeSessions();
    if(!sessions.length){ $('historyList').innerHTML='<div class="card"><p class="muted">No sessions saved yet.</p></div>'; return; }
    $('historyList').innerHTML=sessions.map(s=>{
      const total=sum(s.rounds.map(r=>r.roundTotal));
      const avg=total/8;
      const sync=s.sync || {status:'local'};
      const badge = sync.status==='synced' ? '<span class="sync-badge synced">Microsoft ✓</span>' : sync.status==='error' ? '<span class="sync-badge error">Sync error</span>' : '<span class="sync-badge">Local</span>';
      const action = sync.status!=='synced' && cloudState.signedIn ? `<button class="btn secondary sync-action" data-sync-id="${escapeHtml(s.sessionId)}">Sync to Microsoft</button>` : '';
      return `<article class="history-item"><div class="history-head"><strong>${formatDate(s.sessionDate)}</strong><span>${s.discipline}</span></div><div class="history-meta">${shortId(s.sessionId)} · ${badge}</div><div class="history-stats"><span>Total <strong>${total}/600</strong></span><span>Avg round <strong>${avg.toFixed(2)}</strong></span><span>Focus <strong>${s.context.focus}/5</strong></span></div>${action}</article>`;
    }).join('');
    document.querySelectorAll('[data-sync-id]').forEach(btn=>btn.addEventListener('click', async ()=>{
      btn.disabled=true; btn.textContent='Syncing…';
      await syncRecord(btn.dataset.syncId, msg=>btn.textContent=msg);
      renderHistory();
    }));
  }

  function updateHome(){
    const sessions=safeSessions();
    const count=sessions.length;
    const pending=sessions.filter(s=>s.sync?.status!=='synced').length;
    $('savedCount').textContent = count ? `${count} session${count===1?'':'s'} saved on this device.` : 'No sessions saved yet.';
    $('resumeSessionBtn').classList.toggle('hidden', !readDraft());
    if($('cloudHint')){
      if(cloudState.signedIn) $('cloudHint').textContent = pending ? `${pending} local session${pending===1?'':'s'} waiting to sync.` : 'Microsoft Lists sync is connected.';
      else $('cloudHint').textContent = 'Sessions are always saved locally first. Tap Sign in to enable Microsoft Lists sync.';
    }
  }

  function resumeDraft(){
    const d=readDraft(); if(!d) return;
    draft=d; roundIndex=Number.isInteger(d.roundIndex)?Math.max(0,Math.min(7,d.roundIndex)):0;
    loadRound(); showScreen('score');
  }

  function csvEscape(v){ const s=String(v??''); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }
  function exportScores(){
    const rows=[['Session ID','Session Date','Discipline','Walk-Back','Round','3m Score','4m Score','5m Score','6m Score','7m Score']];
    safeSessions().slice().reverse().forEach(s=>s.rounds.forEach(r=>rows.push([s.sessionId,s.sessionDate,s.discipline,r.walkBack,r.round,r.score3m,r.score4m,r.score5m,r.score6m,r.score7m])));
    downloadCsv('road-to-75-scores.csv',rows);
  }
  function exportContext(){
    const rows=[['Session ID','Session Date','Discipline','Energy','Focus','Physical Setup','Distraction Level','Notes','Achievements']];
    safeSessions().slice().reverse().forEach(s=>rows.push([s.sessionId,s.sessionDate,s.discipline,s.context.energy,s.context.focus,s.context.physicalSetup,s.context.distractionLevel,s.context.notes,s.context.achievements]));
    downloadCsv('road-to-75-session-context.csv',rows);
  }
  function downloadCsv(name, rows){
    const blob=new Blob([rows.map(r=>r.map(csvEscape).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),500);
  }

  function formatDate(s){ if(!s) return ''; const [y,m,d]=s.split('-'); return `${d}/${m}/${y}`; }
  function shortId(id){ return id ? `Session ${id.slice(0,8)}` : ''; }
  function escapeHtml(s){ return String(s).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }

  function renderCloudState(){
    const pill=$('connectionPill');
    pill.textContent=cloudState.message || 'Local';
    pill.classList.toggle('signed-in', !!cloudState.signedIn);
    pill.title = cloudState.signedIn ? `${cloudState.accountName || 'Microsoft account'} · synced via Microsoft Lists` : 'Tap to sign in with Microsoft';
    updateHome();
  }

  async function initCloud(){
    if(!window.rt75Cloud){ renderCloudState(); return; }
    try{
      cloudState = await window.rt75Cloud.init();
      renderCloudState();
    }catch(err){
      console.error(err);
      cloudState={ready:true,available:false,signedIn:false,message:'Local'};
      renderCloudState();
    }
  }

  $('sessionDate').value=todayLocal();
  $('startSessionBtn').addEventListener('click',startNewSession);
  $('resumeSessionBtn').addEventListener('click',resumeDraft);
  scoreInputs.forEach(i=>i.addEventListener('input',updateRoundTotal));
  $('nextRoundBtn').addEventListener('click',goNextRound);
  $('prevRoundBtn').addEventListener('click',goPrevRound);
  $('saveExitBtn').addEventListener('click',()=>{saveDraft();showScreen('home');updateHome();});
  ['energy','focus','physical','distraction'].forEach(id=>$(id).addEventListener('input',refreshRatings));
  $('backToScoresBtn').addEventListener('click',()=>{persistContext();roundIndex=7;loadRound();showScreen('score');});
  $('reviewBtn').addEventListener('click',()=>{buildReview();showScreen('review');});
  $('editContextBtn').addEventListener('click',()=>showScreen('context'));
  $('saveSessionBtn').addEventListener('click',()=>finalSave());
  $('newSessionBtn').addEventListener('click',()=>{showScreen('home');updateHome();});
  $('openHistoryBtn').addEventListener('click',()=>{renderHistory();showScreen('history');});
  $('successHistoryBtn').addEventListener('click',()=>{renderHistory();showScreen('history');});
  $('historyBackBtn').addEventListener('click',()=>{showScreen('home');updateHome();});
  $('exportScoresBtn').addEventListener('click',exportScores);
  $('exportContextBtn').addEventListener('click',exportContext);
  $('connectionPill').addEventListener('click', async ()=>{
    if(!window.rt75Cloud) return;
    if(cloudState.signedIn){
      const confirmed=window.confirm(`Signed in as ${cloudState.accountName || 'Microsoft account'}. Sign out?`);
      if(confirmed) await window.rt75Cloud.signOut();
      return;
    }
    try{ await window.rt75Cloud.signIn(); }
    catch(err){ window.alert(err.message || 'Microsoft sign-in is unavailable.'); }
  });

  window.addEventListener('rt75-cloud-state',e=>{
    cloudState=e.detail;
    renderCloudState();
  });

  updateHome();
  initCloud();
  if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
})();
