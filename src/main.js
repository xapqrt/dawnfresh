const { app } = require("electron");
const { initSplash } = require("./windows/splash");
const { applySwitches } = require("./util/switches");

applySwitches();

app.on("ready", async () => {
  initSplash();
  try { require("os").setPriority(process.pid, -10); } catch (e) {}
});

app.on("window-all-closed", () => app.quit());
