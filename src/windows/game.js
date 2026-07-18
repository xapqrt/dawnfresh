const { BrowserWindow, ipcMain, app, shell, session, protocol } = require("electron");
const { default_settings, allowed_urls } = require("../util/defaults.json");
const { initResourceSwapper } = require('../addons/swapper.js');
const path = require("path");
const Store = require("electron-store");
const fs = require("fs");
const https = require("https");

const fetchText = (url) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      reject(new Error(`fetchText: ${url} returned ${res.statusCode}`));
      return;
    }
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    res.on('error', reject);
  }).on('error', reject);
});

const store = new Store();
if (!store.has("settings")) {
  store.set("settings", default_settings);
}

const settings = store.get("settings");

for (const key in default_settings) {
  if (
    !settings.hasOwnProperty(key) ||
    typeof settings[key] !== typeof default_settings[key]
  ) {
    settings[key] = default_settings[key];
    store.set("settings", settings);
  }
}

if (!allowed_urls.includes(settings.base_url)) {
  settings.base_url = default_settings.base_url;
  store.set("settings", settings);
}

ipcMain.on("get-settings", (e) => {
  e.returnValue = settings;
});

const _writeSettings = () => {
  const configPath = path.join(app.getPath("userData"), "config.json");
  fs.writeFile(configPath, JSON.stringify({ settings }), () => {});
};

let _storeTimer = null;
ipcMain.on("update-setting", (e, key, value) => {
  settings[key] = value;
  if (_storeTimer) clearTimeout(_storeTimer);
  _storeTimer = setTimeout(() => {
    _storeTimer = null;
    _writeSettings();
  }, 1000);
});

ipcMain.on("navigate", (_, url) => {
  gameWindow.loadURL(url);
});

ipcMain.on("save-recording", (_, buf) => {
  const clipsDir = path.join(app.getPath("documents"), "DawnClient", "clips");
  if (!fs.existsSync(clipsDir)) { fs.mkdirSync(clipsDir, { recursive: true }); }
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(clipsDir, `clip-${ts}.webm`);
  fs.writeFile(filePath, Buffer.from(buf), () => {});
});

ipcMain.on("reset-juice-settings", () => {
  store.set("settings", default_settings);
  app.relaunch();
  app.quit();
});

ipcMain.on("open-swapper-folder", () => {
  const swapperPath = path.join(
    app.getPath("documents"),
    "DawnClient/swapper/assets"
  );

  if (!fs.existsSync(swapperPath)) {
    fs.mkdirSync(swapperPath, { recursive: true });
    shell.openPath(swapperPath);
  } else {
    shell.openPath(swapperPath);
  }
});

ipcMain.on('dawn-bhop-key', (_, { type, keyCode, code, key }) => {
  if (_bhopDebugger) {
    try {
      _bhopDebugger.sendCommand('Input.dispatchKeyEvent', {
        type,
        key,
        code,
        keyCode,
        windowsVirtualKeyCode: keyCode,
      });
    } catch (e) {
      console.warn('[bhop] CDP sendCommand failed:', e.message);
    }
  } else {
    const _key = key || code.toLowerCase().replace(/^key/, '');
    const _type = type === 'keyDown' ? 'keydown' : 'keyup';
    gameWindow.webContents.executeJavaScript(`(function(){var e=new KeyboardEvent('${_type}',{key:'${_key}',code:'${code}',keyCode:${keyCode},which:${keyCode},bubbles:true,cancelable:true});document.dispatchEvent(e);})()`);
  }
});

let gameWindow = null;
let _bhopDebugger = null;

app.on('before-quit', () => {
  if (_bhopDebugger) {
    try { _bhopDebugger.detach(); } catch (e) {}
    _bhopDebugger = null;
  }
});

const createWindow = () => {
  gameWindow = new BrowserWindow({
    fullscreen: settings.auto_fullscreen,
    titleBarStyle: 'hidden',
    fullscreenable: true,
    simpleFullscreen: true,
    icon: path.join(__dirname, "../assets/img/icon.ico"),
    title: "Dawn Client",
    width: 1280,
    height: 720,
    show: false,
    backgroundColor: "#141414",
    backgroundThrottling: false,
    autoHideMenuBar: true,
    webPreferences: {
      scrollBounce: false,
      pinchZoom: false,
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      sandbox: false,
      webSecurity: false,
      nativeWindowOpen: true,
      preload: path.join(__dirname, "../preload/game.js"),
    },
  });

  gameWindow.webContents.setUserAgent(
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.7204.296 Safari/537.36 Electron/10.4.7 DawnClient/${app.getVersion()}`
  );

  // Google / OAuth popups (window.open) must open IN-APP as real child windows
  // so the window.opener relationship + postMessage round-trip works and the
  // login callback returns to the game. Routing them to the system browser
  // (shell.openExternal) breaks OAuth because the redirect can't come back.
  // nativeWindowOpen:true makes Electron create native child popups when we
  // return action:'allow'.
  gameWindow.webContents.setWindowOpenHandler(({ url, frameName, features }) => {
    const u = String(url || "");
    const isAuth = /(accounts\.google\.com|googleapis\.com|oauth|login|auth|signin|facebook|discord|appleid\.com)/i.test(u);
    if (isAuth) {
      // Open as an in-app child window so the OAuth flow completes and posts
      // the result back to the parent game window.
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          titleBarStyle: "hidden",
          fullscreenable: false,
          width: 480,
          height: 640,
          backgroundColor: "#141414",
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
          },
        },
      };
    }
    // Non-auth links: open in the default browser.
    if (u && /^https?:\/\//.test(u)) require("electron").shell.openExternal(u);
    return { action: "deny" };
  });

  gameWindow.webContents.on("did-navigate-in-page", (e, url) => {
    gameWindow.webContents.send("url-change", url);
  });

  gameWindow.removeMenu();
  gameWindow.loadURL(settings.base_url);
  gameWindow.maximize();

  const showFallback = setTimeout(() => {
    if (gameWindow && !gameWindow.isVisible()) {
      if (process.platform === "darwin" && settings.auto_fullscreen) {
        gameWindow.setFullScreen(true);
      }
      gameWindow.show();
    }
  }, 10000);

  gameWindow.once("ready-to-show", () => {
    clearTimeout(showFallback);
    try { require("os").setPriority(gameWindow.webContents.getProcessId(), -10); } catch (e) {}
    if (process.platform === "darwin" && settings.auto_fullscreen) {
      gameWindow.setFullScreen(true);
    }
    try {
      var dbg = gameWindow.webContents.debugger;
      dbg.attach('1.3');
      _bhopDebugger = dbg;
    } catch (e) {
      console.warn('[bhop] CDP attach failed, using synthetic fallback:', e.message);
      _bhopDebugger = null;
    }
    gameWindow.show();
  });

  gameWindow.on("page-title-updated", (e) => e.preventDefault());

  gameWindow.on("closed", () => {
    if (_bhopDebugger) {
      try { _bhopDebugger.detach(); } catch (e) {}
      _bhopDebugger = null;
    }
    ipcMain.removeAllListeners("get-settings");
    ipcMain.removeAllListeners("update-setting");
    ipcMain.removeAllListeners("dawn-bhop-key");
    ipcMain.removeAllListeners("save-recording");
    gameWindow = null;
  });
};

const initGame = () => {
  protocol.registerBufferProtocol('dawn-patch', (request, callback) => {
    const urlParams = new URL(request.url);
    const targetScriptUrl = urlParams.searchParams.get('url');
    fetchText(targetScriptUrl).then((code) => {
      const target = "f5['a'][hF]";
      if (code.includes(target)) {
        code = code.replace(target, "(window.__f5=f5,window.__zoomInstance=this,f5['a'][hF])");
      }
      code += `\n//# sourceURL=${targetScriptUrl}`;
      callback({ mimeType: 'text/javascript', data: Buffer.from(code) });
    }).catch((err) => {
      console.error('dawn-patch fetch failed:', err);
      callback({ statusCode: 500 });
    });
  });

  const swap = initResourceSwapper();

  const bundleFilter = { urls: ['*://kirka.io/assets/js/app.*.js'] };
  const allUrls = swap.filter.urls.length
    ? [...bundleFilter.urls, ...swap.filter.urls]
    : bundleFilter.urls;

  session.defaultSession.webRequest.onBeforeRequest(
    { urls: allUrls },
    (details, callback) => {
      if (/kirka\.io\/assets\/js\/app\.\w+\.js/.test(details.url)) {
        return callback({ redirectURL: 'dawn-patch://bundle/app.js?url=' + encodeURIComponent(details.url) });
      }

      if (swap.filter.urls.length) {
        const cleaned = details.url.replace(/https?:\/\//, '').replace(/\?.*/, '').replace(/#.*/, '').replace(/_/g, '');
        const redirect = 'dawnclient://' + (swap.files[cleaned] || details.url);
        return callback({ cancel: false, redirectURL: redirect });
      }

      callback({ cancel: false });
    }
  );

  createWindow();
};

module.exports = {
  initGame,
  getGameWindow: () => gameWindow,
};
