const _entries = [];

const add = (target, type, listener, options) => {
  target.addEventListener(type, listener, options);
  _entries.push({ target, type, listener, options });
  return () => remove(target, type, listener);
};

const remove = (target, type, listener) => {
  for (let i = _entries.length - 1; i >= 0; i--) {
    const e = _entries[i];
    if (e.target === target && e.type === type && (!listener || e.listener === listener)) {
      e.target.removeEventListener(e.type, e.listener, e.options);
      _entries.splice(i, 1);
    }
  }
};

const removeAll = (target) => {
  for (let i = _entries.length - 1; i >= 0; i--) {
    const e = _entries[i];
    if (e.target === target) {
      e.target.removeEventListener(e.type, e.listener, e.options);
      _entries.splice(i, 1);
    }
  }
};

const removeByType = (type) => {
  for (let i = _entries.length - 1; i >= 0; i--) {
    const e = _entries[i];
    if (e.type === type) {
      e.target.removeEventListener(e.type, e.listener, e.options);
      _entries.splice(i, 1);
    }
  }
};

const flush = () => {
  for (let i = _entries.length - 1; i >= 0; i--) {
    const e = _entries[i];
    e.target.removeEventListener(e.type, e.listener, e.options);
  }
  _entries.length = 0;
};

const count = () => _entries.length;

module.exports = { add, remove, removeAll, removeByType, flush, count };
