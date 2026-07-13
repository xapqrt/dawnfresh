const { app } = require("electron");
const { initSplash } = require("./windows/splash");
const dns = require("dns");
const os = require("os");
const { execSync } = require("child_process");

// Boost process priority to reduce input/render latency
try { execSync(`renice -20 ${process.pid} 2>/dev/null`); } catch (e) {}
try { os.setPriority(process.pid, -20); } catch (e) {}
if (process.platform === "darwin") {
  try { execSync(`taskpolicy -N -p ${process.pid} 2>/dev/null || true`); } catch (e) {}
}

// Pre-resolve game/CDN domains to cut DNS latency
const preResolve = [
  "kirka.io", "snipers.io", "ask101math.com", "fpsiogame.com",
  "cloudconverts.com", "discord.com", "cdn.discordapp.com",
  "cdn.kirka.io", "fonts.googleapis.com",
];
for (const d of preResolve) {
  dns.resolve(d, () => {});
  dns.resolve4(d, () => {});
  dns.resolve6(d, () => {});
}

app.on("ready", async () => {
  initSplash();
});

app.on("window-all-closed", () => app.quit());
