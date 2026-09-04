(() => {
  'use strict';

  const cfg = window.ROAD_TO_75_CONFIG?.graph || {};
  let msalApp = null;
  let account = null;
  let initPromise = null;
  let library = null;

  const state = {
    ready: false,
    available: false,
    signedIn: false,
    accountName: '',
    message: 'Local'
  };

  function emit() {
    window.dispatchEvent(new CustomEvent('rt75-cloud-state', { detail: { ...state } }));
  }

  async function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (window.ROAD_TO_75_CONFIG?.syncMode !== 'microsoft-graph') {
        state.ready = true;
        state.message = 'Local';
        emit();
        return { ...state };
      }

      try {
        // jsDelivr's ESM transformer is used only to deliver the official npm package
        // to this no-build static PWA. The app remains fully usable offline/local-first
        // if the authentication library cannot be loaded.
        library = await import('https://cdn.jsdelivr.net/npm/@azure/msal-browser@5.21.0/+esm');
        const { PublicClientApplication } = library;
        msalApp = new PublicClientApplication({
          auth: {
            clientId: cfg.clientId,
            authority: `https://login.microsoftonline.com/${cfg.tenantId}`,
            redirectUri: cfg.redirectUri,
            postLogoutRedirectUri: cfg.redirectUri,
            navigateToLoginRequestUrl: false
          },
          cache: {
            cacheLocation: 'localStorage'
          }
        });

        await msalApp.initialize();
        const redirectResult = await msalApp.handleRedirectPromise();
        if (redirectResult?.account) {
          account = redirectResult.account;
          msalApp.setActiveAccount(account);
        } else {
          account = msalApp.getActiveAccount() || msalApp.getAllAccounts()[0] || null;
          if (account) msalApp.setActiveAccount(account);
        }

        state.ready = true;
        state.available = true;
        state.signedIn = !!account;
        state.accountName = account?.name || account?.username || '';
        state.message = account ? 'Microsoft ✓' : 'Sign in';
      } catch (err) {
        console.error('Road to 75 cloud init failed', err);
        state.ready = true;
        state.available = false;
        state.signedIn = false;
        state.message = 'Local';
      }
      emit();
      return { ...state };
    })();
    return initPromise;
  }

  async function signIn() {
    await init();
    if (!msalApp) throw new Error('Microsoft sign-in is unavailable. The app remains saved locally.');
    await msalApp.loginRedirect({
      scopes: cfg.scopes,
      redirectUri: cfg.redirectUri
    });
  }

  async function signOut() {
    await init();
    if (!msalApp || !account) return;
    await msalApp.logoutRedirect({ account, postLogoutRedirectUri: cfg.redirectUri });
  }

  async function accessToken() {
    await init();
    account = msalApp?.getActiveAccount() || msalApp?.getAllAccounts()[0] || null;
    if (!msalApp || !account) throw new Error('Sign in with Microsoft before syncing.');

    try {
      const result = await msalApp.acquireTokenSilent({ scopes: cfg.scopes, account });
      return result.accessToken;
    } catch (err) {
      const InteractionRequiredAuthError = library?.InteractionRequiredAuthError;
      if (InteractionRequiredAuthError && err instanceof InteractionRequiredAuthError) {
        await msalApp.acquireTokenRedirect({ scopes: cfg.scopes, account, redirectUri: cfg.redirectUri });
        throw new Error('Microsoft sign-in is being refreshed. Try Sync again when you return.');
      }
      throw err;
    }
  }

  function graphBase(listId) {
    return `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(cfg.siteId)}/lists/${listId}`;
  }

  async function graphFetch(url, options = {}) {
    const token = await accessToken();
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (options.body) headers.set('Content-Type', 'application/json');
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.json();
        detail = body?.error?.message || JSON.stringify(body);
      } catch {
        detail = await response.text();
      }
      throw new Error(`Microsoft Graph ${response.status}: ${detail || response.statusText}`);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  function odataString(value) {
    return String(value).replace(/'/g, "''");
  }

  async function existingScoreKeys(sessionId) {
    const filter = encodeURIComponent(`fields/Title eq '${odataString(sessionId)}'`);
    const url = `${graphBase(cfg.scoresListId)}/items?$expand=fields($select=Title,Walk_x002d_Back,Round)&$filter=${filter}`;
    const data = await graphFetch(url, { headers: { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' } });
    const keys = new Set();
    for (const item of data?.value || []) {
      const f = item.fields || {};
      if (f.Walk_x002d_Back && f.Round != null) keys.add(`${f.Walk_x002d_Back}${Number(f.Round)}`);
    }
    return keys;
  }

  async function contextExists(sessionId) {
    const filter = encodeURIComponent(`fields/Title eq '${odataString(sessionId)}'`);
    const url = `${graphBase(cfg.contextListId)}/items?$expand=fields($select=Title)&$filter=${filter}`;
    const data = await graphFetch(url, { headers: { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' } });
    return (data?.value || []).length > 0;
  }

  async function createListItem(listId, fields) {
    return graphFetch(`${graphBase(listId)}/items`, {
      method: 'POST',
      body: JSON.stringify({ fields })
    });
  }

  function sharePointDate(dateOnly) {
    return `${dateOnly}T00:00:00Z`;
  }

  async function syncSession(session, progress = () => {}) {
    await init();
    if (!state.signedIn) throw new Error('Sign in with Microsoft before syncing.');

    progress('Checking Microsoft Lists…');
    const existing = await existingScoreKeys(session.sessionId);
    let createdScores = 0;

    for (let i = 0; i < session.rounds.length; i += 1) {
      const r = session.rounds[i];
      const key = `${r.walkBack}${r.round}`;
      if (existing.has(key)) continue;
      progress(`Syncing score ${i + 1} of 8…`);
      await createListItem(cfg.scoresListId, {
        Title: session.sessionId,
        SessionDate: sharePointDate(session.sessionDate),
        Disipline: session.discipline,
        Walk_x002d_Back: r.walkBack,
        Round: r.round,
        _x0033_mScore: r.score3m,
        _x0034_mScore: r.score4m,
        _x0035_mScore: r.score5m,
        _x0036_mScore: r.score6m,
        _x0037_mScore: r.score7m
      });
      createdScores += 1;
    }

    const hasContext = await contextExists(session.sessionId);
    if (!hasContext) {
      progress('Syncing session context…');
      await createListItem(cfg.contextListId, {
        Title: session.sessionId,
        SessionDate: sharePointDate(session.sessionDate),
        Disipline: session.discipline,
        Energy: session.context.energy,
        Focus: session.context.focus,
        PhysicalSetup: session.context.physicalSetup,
        DistractionLevel: session.context.distractionLevel,
        Notes: session.context.notes || '',
        Achivements: session.context.achievements || ''
      });
    }

    progress('Synced');
    return { createdScores, contextCreated: !hasContext };
  }

  window.rt75Cloud = {
    init,
    signIn,
    signOut,
    syncSession,
    state: () => ({ ...state })
  };
})();
