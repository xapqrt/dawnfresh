const { app } = require("electron");

function applySwitches(settings) {
  // Cap is set in game.js (currently 450 — stable below shooting drop range)
  app.commandLine.appendSwitch("disable-frame-rate-limit");
  app.commandLine.appendSwitch("disable-gpu-vsync");

  // ANGLE Metal backend — native arm64 draw calls
  app.commandLine.appendSwitch("use-angle", "metal");

  // Force GPU rendering everywhere
  app.commandLine.appendSwitch("ignore-gpu-blacklist");
  app.commandLine.appendSwitch("enable-gpu-rasterization");
  app.commandLine.appendSwitch("force-gpu-rasterization");
  // enable-oop-rasterization intentionally omitted — IPC overhead on unified memory
  app.commandLine.appendSwitch("enable-accelerated-2d-canvas");
  app.commandLine.appendSwitch("num-raster-threads", "4");
  app.commandLine.appendSwitch("enable-native-gpu-memory-buffers");
  app.commandLine.appendSwitch("enable-gpu-memory-buffer-compositor-resources");
  app.commandLine.appendSwitch("enable-webgl-draft-extensions");

  app.commandLine.appendSwitch("enable-webgl");
  app.commandLine.appendSwitch("enable-accelerated-jpeg-decoding");
  app.commandLine.appendSwitch("enable-accelerated-webp-decoding");
  // Remove throttling
  app.commandLine.appendSwitch("disable-renderer-backgrounding");
  app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
  app.commandLine.appendSwitch("disable-background-timer-throttling");

  // Remove safety overhead
  app.commandLine.appendSwitch("no-sandbox");
  app.commandLine.appendSwitch("disable-software-rasterizer");
  app.commandLine.appendSwitch("disable-gpu-driver-bug-workarounds");
  app.commandLine.appendSwitch("disable-breakpad");
  app.commandLine.appendSwitch("disable-crash-reporter");

  // V8 — Apple Silicon (16KB pages): semi-space=512 for adequate page count
  // max-old-space-size=4096: generous old gen for game heap
  // No optimize_for_size — M4 has ample headroom for aggressive optimization
  app.commandLine.appendSwitch("js-flags", "--expose-gc --max-semi-space-size=512 --max-old-space-size=4096 --concurrent_marking --concurrent_sweeping");

  // Kill all non-essential browser features
  app.commandLine.appendSwitch("disable-logging");
  app.commandLine.appendSwitch("disable-smooth-scrolling");
  app.commandLine.appendSwitch("force-device-scale-factor", "1");
  app.commandLine.appendSwitch("disable-sync");
  app.commandLine.appendSwitch("disable-domain-reliability");
  app.commandLine.appendSwitch("disable-component-update");
  app.commandLine.appendSwitch("disable-background-networking");
  app.commandLine.appendSwitch("disable-default-apps");
  app.commandLine.appendSwitch("disable-print-preview");
  app.commandLine.appendSwitch("disable-reading-list");
  app.commandLine.appendSwitch("enable-quic");
  app.commandLine.appendSwitch("enable-tcp-fast-open");
  app.commandLine.appendSwitch("enable-features", "DefaultTileWidth:512/DefaultTileHeight:512");
  app.commandLine.appendSwitch("disable-features", "ChromeWhatsNewUI,MediaRouter,PasswordManager,SignInPromo,Autofill,TranslateUI,NetworkTimeService,BackgroundTracing,OptimizationHints,InterestFeedContentSuggestions,WebRTC-H264WithOpenH264FFmpeg");

  // Remove IPC overhead
  app.commandLine.appendSwitch("disable-ipc-flooding-protection");

  app.allowRendererProcessReuse = true;
}

module.exports = {
  applySwitches,
};
