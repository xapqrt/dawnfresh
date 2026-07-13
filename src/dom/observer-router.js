const _handlers = new Map();
let _mainObserver = null;
let _isActive = false;

const observeForElement = (selector, functionToRun, target = document.body) => {
  const observer = new MutationObserver((mutations, obs) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches(selector)) {
              functionToRun(node);
            } else {
              const inner = node.querySelector(selector);
              if (inner) functionToRun(inner);
            }
          }
        });
      }
    }
  });
  observer.observe(target, { childList: true, subtree: true });
  return observer;
};

const register = (selector, callback) => {
  if (!selector || typeof callback !== 'function') return;
  const existing = _handlers.get(selector) || [];
  existing.push(callback);
  _handlers.set(selector, existing);
};

const unregister = (selector, callback) => {
  if (!selector) return;
  if (callback) {
    const list = _handlers.get(selector);
    if (list) {
      const idx = list.indexOf(callback);
      if (idx !== -1) list.splice(idx, 1);
      if (list.length === 0) _handlers.delete(selector);
    }
  } else {
    _handlers.delete(selector);
  }
};

const start = (target = document.body) => {
  if (_mainObserver) stop();

  const observer = new MutationObserver((mutations) => {
    if (_handlers.size === 0) return;
    for (const mutation of mutations) {
      if (mutation.type !== 'childList' || !mutation.addedNodes.length) continue;
      for (let i = 0; i < mutation.addedNodes.length; i++) {
        const node = mutation.addedNodes[i];
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        for (const [selector, callbacks] of _handlers) {
          if (node.matches && node.matches(selector)) {
            for (let j = 0; j < callbacks.length; j++) callbacks[j](node);
          } else if (node.querySelector) {
            const inner = node.querySelector(selector);
            if (inner) {
              for (let j = 0; j < callbacks.length; j++) callbacks[j](inner);
            }
          }
        }
      }
    }
  });

  observer.observe(target, { childList: true, subtree: true });
  _mainObserver = observer;
  _isActive = true;
  return observer;
};

const stop = () => {
  if (_mainObserver) {
    _mainObserver.disconnect();
    _mainObserver = null;
  }
  _isActive = false;
};

const clear = () => {
  _handlers.clear();
};

module.exports = { register, unregister, start, stop, clear, observeForElement };
