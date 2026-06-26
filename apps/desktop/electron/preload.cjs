const { contextBridge, ipcRenderer, webUtils } = require('electron')

contextBridge.exposeInMainWorld('agentxDesktop', {
  getConnection: profile => ipcRenderer.invoke('agentx:connection', profile),
  revalidateConnection: () => ipcRenderer.invoke('agentx:connection:revalidate'),
  touchBackend: profile => ipcRenderer.invoke('agentx:backend:touch', profile),
  getGatewayWsUrl: profile => ipcRenderer.invoke('agentx:gateway:ws-url', profile),
  openSessionWindow: (sessionId, opts) => ipcRenderer.invoke('agentx:window:openSession', sessionId, opts),
  openNewSessionWindow: () => ipcRenderer.invoke('agentx:window:openNewSession'),
  petOverlay: {
    // Main renderer → main process: window lifecycle + drag. `request` is
    // `{ bounds, screen }`; resolves with the screen bounds it actually used.
    open: request => ipcRenderer.invoke('agentx:pet-overlay:open', request),
    close: () => ipcRenderer.invoke('agentx:pet-overlay:close'),
    setBounds: bounds => ipcRenderer.send('agentx:pet-overlay:set-bounds', bounds),
    setIgnoreMouse: ignore => ipcRenderer.send('agentx:pet-overlay:ignore-mouse', ignore),
    // Flip the overlay focusable (and focus it) while the composer needs keys.
    setFocusable: focusable => ipcRenderer.send('agentx:pet-overlay:set-focusable', focusable),
    // Main renderer → overlay (forwarded by main): push the latest pet state.
    pushState: payload => ipcRenderer.send('agentx:pet-overlay:state', payload),
    // Overlay → main renderer (forwarded by main): pop back in / composer submit.
    control: payload => ipcRenderer.send('agentx:pet-overlay:control', payload),
    // Overlay subscribes to state pushes.
    onState: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('agentx:pet-overlay:state', listener)
      return () => ipcRenderer.removeListener('agentx:pet-overlay:state', listener)
    },
    // Main renderer subscribes to overlay control messages.
    onControl: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('agentx:pet-overlay:control', listener)
      return () => ipcRenderer.removeListener('agentx:pet-overlay:control', listener)
    }
  },
  getBootProgress: () => ipcRenderer.invoke('agentx:boot-progress:get'),
  getConnectionConfig: profile => ipcRenderer.invoke('agentx:connection-config:get', profile),
  saveConnectionConfig: payload => ipcRenderer.invoke('agentx:connection-config:save', payload),
  applyConnectionConfig: payload => ipcRenderer.invoke('agentx:connection-config:apply', payload),
  testConnectionConfig: payload => ipcRenderer.invoke('agentx:connection-config:test', payload),
  probeConnectionConfig: remoteUrl => ipcRenderer.invoke('agentx:connection-config:probe', remoteUrl),
  oauthLoginConnectionConfig: remoteUrl => ipcRenderer.invoke('agentx:connection-config:oauth-login', remoteUrl),
  oauthLogoutConnectionConfig: remoteUrl => ipcRenderer.invoke('agentx:connection-config:oauth-logout', remoteUrl),
  profile: {
    get: () => ipcRenderer.invoke('agentx:profile:get'),
    set: name => ipcRenderer.invoke('agentx:profile:set', name)
  },
  api: request => ipcRenderer.invoke('agentx:api', request),
  notify: payload => ipcRenderer.invoke('agentx:notify', payload),
  requestMicrophoneAccess: () => ipcRenderer.invoke('agentx:requestMicrophoneAccess'),
  readFileDataUrl: filePath => ipcRenderer.invoke('agentx:readFileDataUrl', filePath),
  readFileText: filePath => ipcRenderer.invoke('agentx:readFileText', filePath),
  selectPaths: options => ipcRenderer.invoke('agentx:selectPaths', options),
  writeClipboard: text => ipcRenderer.invoke('agentx:writeClipboard', text),
  saveImageFromUrl: url => ipcRenderer.invoke('agentx:saveImageFromUrl', url),
  saveImageBuffer: (data, ext) => ipcRenderer.invoke('agentx:saveImageBuffer', { data, ext }),
  saveClipboardImage: () => ipcRenderer.invoke('agentx:saveClipboardImage'),
  getPathForFile: file => {
    try {
      return webUtils.getPathForFile(file) || ''
    } catch {
      return ''
    }
  },
  normalizePreviewTarget: (target, baseDir) => ipcRenderer.invoke('agentx:normalizePreviewTarget', target, baseDir),
  watchPreviewFile: url => ipcRenderer.invoke('agentx:watchPreviewFile', url),
  stopPreviewFileWatch: id => ipcRenderer.invoke('agentx:stopPreviewFileWatch', id),
  setTitleBarTheme: payload => ipcRenderer.send('agentx:titlebar-theme', payload),
  setNativeTheme: mode => ipcRenderer.send('agentx:native-theme', mode),
  setTranslucency: payload => ipcRenderer.send('agentx:translucency', payload),
  setPreviewShortcutActive: active => ipcRenderer.send('agentx:previewShortcutActive', Boolean(active)),
  openExternal: url => ipcRenderer.invoke('agentx:openExternal', url),
  openPreviewInBrowser: url => ipcRenderer.invoke('agentx:openPreviewInBrowser', url),
  fetchLinkTitle: url => ipcRenderer.invoke('agentx:fetchLinkTitle', url),
  sanitizeWorkspaceCwd: cwd => ipcRenderer.invoke('agentx:workspace:sanitize', cwd),
  settings: {
    getDefaultProjectDir: () => ipcRenderer.invoke('agentx:setting:defaultProjectDir:get'),
    setDefaultProjectDir: dir => ipcRenderer.invoke('agentx:setting:defaultProjectDir:set', dir),
    pickDefaultProjectDir: () => ipcRenderer.invoke('agentx:setting:defaultProjectDir:pick')
  },
  revealLogs: () => ipcRenderer.invoke('agentx:logs:reveal'),
  getRecentLogs: () => ipcRenderer.invoke('agentx:logs:recent'),
  readDir: dirPath => ipcRenderer.invoke('agentx:fs:readDir', dirPath),
  gitRoot: startPath => ipcRenderer.invoke('agentx:fs:gitRoot', startPath),
  revealPath: targetPath => ipcRenderer.invoke('agentx:fs:reveal', targetPath),
  renamePath: (targetPath, newName) => ipcRenderer.invoke('agentx:fs:rename', targetPath, newName),
  writeTextFile: (filePath, content) => ipcRenderer.invoke('agentx:fs:writeText', filePath, content),
  trashPath: targetPath => ipcRenderer.invoke('agentx:fs:trash', targetPath),
  git: {
    worktreeList: repoPath => ipcRenderer.invoke('agentx:git:worktreeList', repoPath),
    worktreeAdd: (repoPath, options) => ipcRenderer.invoke('agentx:git:worktreeAdd', repoPath, options),
    worktreeRemove: (repoPath, worktreePath, options) =>
      ipcRenderer.invoke('agentx:git:worktreeRemove', repoPath, worktreePath, options),
    branchSwitch: (repoPath, branch) => ipcRenderer.invoke('agentx:git:branchSwitch', repoPath, branch),
    branchList: repoPath => ipcRenderer.invoke('agentx:git:branchList', repoPath),
    repoStatus: repoPath => ipcRenderer.invoke('agentx:git:repoStatus', repoPath),
    fileDiff: (repoPath, filePath) => ipcRenderer.invoke('agentx:git:fileDiff', repoPath, filePath),
    scanRepos: (roots, options) => ipcRenderer.invoke('agentx:git:scanRepos', roots, options),
    review: {
      list: (repoPath, scope, baseRef) => ipcRenderer.invoke('agentx:git:review:list', repoPath, scope, baseRef),
      diff: (repoPath, filePath, scope, baseRef, staged) =>
        ipcRenderer.invoke('agentx:git:review:diff', repoPath, filePath, scope, baseRef, staged),
      stage: (repoPath, filePath) => ipcRenderer.invoke('agentx:git:review:stage', repoPath, filePath),
      unstage: (repoPath, filePath) => ipcRenderer.invoke('agentx:git:review:unstage', repoPath, filePath),
      revert: (repoPath, filePath) => ipcRenderer.invoke('agentx:git:review:revert', repoPath, filePath),
      revParse: (repoPath, ref) => ipcRenderer.invoke('agentx:git:review:revParse', repoPath, ref),
      commit: (repoPath, message, push) => ipcRenderer.invoke('agentx:git:review:commit', repoPath, message, push),
      commitContext: repoPath => ipcRenderer.invoke('agentx:git:review:commitContext', repoPath),
      push: repoPath => ipcRenderer.invoke('agentx:git:review:push', repoPath),
      shipInfo: repoPath => ipcRenderer.invoke('agentx:git:review:shipInfo', repoPath),
      createPr: repoPath => ipcRenderer.invoke('agentx:git:review:createPr', repoPath)
    }
  },
  terminal: {
    dispose: id => ipcRenderer.invoke('agentx:terminal:dispose', id),
    resize: (id, size) => ipcRenderer.invoke('agentx:terminal:resize', id, size),
    start: options => ipcRenderer.invoke('agentx:terminal:start', options),
    write: (id, data) => ipcRenderer.invoke('agentx:terminal:write', id, data),
    onData: (id, callback) => {
      const channel = `agentx:terminal:${id}:data`
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener)
    },
    onExit: (id, callback) => {
      const channel = `agentx:terminal:${id}:exit`
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener)
    }
  },
  onClosePreviewRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('agentx:close-preview-requested', listener)
    return () => ipcRenderer.removeListener('agentx:close-preview-requested', listener)
  },
  onOpenUpdatesRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('agentx:open-updates', listener)
    return () => ipcRenderer.removeListener('agentx:open-updates', listener)
  },
  onDeepLink: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('agentx:deep-link', listener)
    return () => ipcRenderer.removeListener('agentx:deep-link', listener)
  },
  signalDeepLinkReady: () => ipcRenderer.invoke('agentx:deep-link-ready'),
  onWindowStateChanged: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('agentx:window-state-changed', listener)
    return () => ipcRenderer.removeListener('agentx:window-state-changed', listener)
  },
  onFocusSession: callback => {
    const listener = (_event, sessionId) => callback(sessionId)
    ipcRenderer.on('agentx:focus-session', listener)
    return () => ipcRenderer.removeListener('agentx:focus-session', listener)
  },
  onNotificationAction: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('agentx:notification-action', listener)
    return () => ipcRenderer.removeListener('agentx:notification-action', listener)
  },
  onPreviewFileChanged: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('agentx:preview-file-changed', listener)
    return () => ipcRenderer.removeListener('agentx:preview-file-changed', listener)
  },
  onBackendExit: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('agentx:backend-exit', listener)
    return () => ipcRenderer.removeListener('agentx:backend-exit', listener)
  },
  onPowerResume: callback => {
    const listener = () => callback()
    ipcRenderer.on('agentx:power-resume', listener)
    return () => ipcRenderer.removeListener('agentx:power-resume', listener)
  },
  onBootProgress: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('agentx:boot-progress', listener)
    return () => ipcRenderer.removeListener('agentx:boot-progress', listener)
  },
  // First-launch bootstrap progress -- emitted by the install.ps1 stage
  // runner in main.cjs (apps/desktop/electron/bootstrap-runner.cjs).
  // Renderer's install overlay subscribes to live events and queries the
  // current snapshot via getBootstrapState() to recover after a devtools
  // reload mid-bootstrap.
  getBootstrapState: () => ipcRenderer.invoke('agentx:bootstrap:get'),
  resetBootstrap: () => ipcRenderer.invoke('agentx:bootstrap:reset'),
  repairBootstrap: () => ipcRenderer.invoke('agentx:bootstrap:repair'),
  cancelBootstrap: () => ipcRenderer.invoke('agentx:bootstrap:cancel'),
  onBootstrapEvent: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('agentx:bootstrap:event', listener)
    return () => ipcRenderer.removeListener('agentx:bootstrap:event', listener)
  },
  getVersion: () => ipcRenderer.invoke('agentx:version'),
  getRemoteDisplayReason: () => ipcRenderer.invoke('agentx:get-remote-display-reason'),
  uninstall: {
    summary: () => ipcRenderer.invoke('agentx:uninstall:summary'),
    run: mode => ipcRenderer.invoke('agentx:uninstall:run', { mode })
  },
  updates: {
    check: () => ipcRenderer.invoke('agentx:updates:check'),
    apply: opts => ipcRenderer.invoke('agentx:updates:apply', opts),
    getBranch: () => ipcRenderer.invoke('agentx:updates:branch:get'),
    setBranch: name => ipcRenderer.invoke('agentx:updates:branch:set', name),
    onProgress: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('agentx:updates:progress', listener)
      return () => ipcRenderer.removeListener('agentx:updates:progress', listener)
    }
  },
  themes: {
    fetchMarketplace: id => ipcRenderer.invoke('agentx:vscode-theme:fetch', id),
    searchMarketplace: query => ipcRenderer.invoke('agentx:vscode-theme:search', query)
  }
})
