const { createThrottledObserver } = require("./raf-throttle");

const _handlers = new Map();
let _mainObserver = null;
let _isActive = false;

let _rafBatchQueued = false;
let _rafBatchPending = null;

const _rafBatch = (fn) => {
  if (_rafBatchQueued) { _rafBatchPending = fn; return; }
  _rafBatchQueued = true;
  requestAnimationFrame(() => {
    _rafBatchQueued = false;
    fn();
    if (_rafBatchPending) {
      const next = _rafBatchPending;
      _rafBatchPending = null;
      next();
    }
  });
};

const observeForElement = (selector, functionToRun, target = document.body) => {
  const observer = createThrottledObserver((mutations, obs) => {
    _rafBatch(() => {
      for (const mutation of mutations) {
        if (mutation.type !== 'childList' || !mutation.addedNodes.length) continue;
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches && node.matches(selector)) { functionToRun(node); continue; }
          if (node.querySelector) {
            const inner = node.querySelector(selector);
            if (inner) functionToRun(inner);
          }
        }
      }
    });
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

const dispatchNode = (node) => {
  for (const [selector, callbacks] of _handlers) {
    if (node.matches && node.matches(selector)) {
      for (let j = 0; j < callbacks.length; j++) callbacks[j](node);
    }
  }
};

const start = (target = document.body) => {
  if (_mainObserver) stop();

  const observer = createThrottledObserver((mutations) => {
    if (_handlers.size === 0) return;
    _rafBatch(() => {
      const selectors = [..._handlers.keys()];
      const selectorStr = selectors.join(',');
      if (!selectorStr) return;
      const seen = new Set();
      for (const mutation of mutations) {
        if (mutation.type !== 'childList' || !mutation.addedNodes.length) continue;
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches && node.matches(selectorStr)) {
            if (!seen.has(node)) { seen.add(node); dispatchNode(node); }
          }
          if (node.querySelectorAll) {
            const matches = node.querySelectorAll(selectorStr);
            for (let m = 0; m < matches.length; m++) {
              if (!seen.has(matches[m])) { seen.add(matches[m]); dispatchNode(matches[m]); }
            }
          }
        }
      }
    });
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
