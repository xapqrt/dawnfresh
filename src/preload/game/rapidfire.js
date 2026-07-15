function installRapidFire(settings) {
  var _active = false;
  var _rafId = null;

  var _downEvt = new MouseEvent("mousedown", {
    button: 0, buttons: 1, clientX: 0, clientY: 0,
    bubbles: true, cancelable: true,
  });
  var _upEvt = new MouseEvent("mouseup", {
    button: 0, buttons: 0, clientX: 0, clientY: 0,
    bubbles: true, cancelable: true,
  });

  function sendMouse(down) {
    var canvas = document.querySelector("#game");
    if (!canvas) return;
    canvas.dispatchEvent(down ? _downEvt : _upEvt);
  }

  function loop() {
    if (!_active) return;
    if (document.hidden) { _rafId = requestAnimationFrame(loop); return; }
    sendMouse(false);
    sendMouse(true);
    _rafId = requestAnimationFrame(loop);
  }

  function stop() {
    if (!_active) return;
    _active = false;
    if (_rafId !== null) { cancelAnimationFrame(_rafId); _rafId = null; }
    sendMouse(false);
  }

  document.addEventListener("mousedown", function (e) {
    if (!e.isTrusted) return;
    if (!settings.rapid_fire) return;
    if (e.button !== 0) return;
    if (!document.pointerLockElement) return;
    if (_active) return;
    _active = true;
    _rafId = requestAnimationFrame(loop);
  }, true);

  document.addEventListener("mouseup", function (e) {
    if (e.button !== 0) return;
    if (!_active) return;
    stop();
  }, true);

  window.addEventListener("blur", stop);
}

module.exports = { installRapidFire };
