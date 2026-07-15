const SCALE = 100;

const packSig = (s0, s1, s2) =>
  (Math.round(s0 * SCALE) << 20) | (Math.round(s1 * SCALE) << 10) | Math.round(s2 * SCALE);

const ARM_SIGS = new Uint32Array([
  packSig(1.40, 1.40, 1.40),
  packSig(1.99, 1.68, 2.11),
  packSig(1.88, 1.40, 1.88),
  packSig(1.11, 1.11, 1.77),
  packSig(1.50, 1.40, 1.76),
  packSig(1.13, 0.85, 1.77),
  packSig(0.81, 1.08, 1.38),
  packSig(1.52, 1.15, 1.61),
  packSig(1.16, 1.48, 0.94),
  packSig(1.08, 1.10, 1.77),
  packSig(1.54, 0.92, 2.24),
]);

const _armSigSet = new Set(ARM_SIGS);
const isArmSig = (sig) => _armSigSet.has(sig);

const TOMAHAWK_SIG = packSig(1.54, 0.92, 2.24);
const DEFAULT_RIGHT_SIG = packSig(1.40, 1.40, 1.40);

const ARM_SIG_TO_TYPE = {
  1169203540: 1,
  1663951371: 0,
  1557199896: 0,
  1176968373: 1,
  1517324444: 1,
  1131219501: 0,
  812941478: 0,
  1494200573: 1,
  1196249432: 1,
  1091020973: 0,
  1629485608: 1,
};

const getArmType = (sig, weaponId, tx) => {
  if (sig === DEFAULT_RIGHT_SIG && weaponId === 'tomahawk') {
    return tx > 0 ? 1 : 0;
  }
  return ARM_SIG_TO_TYPE[sig] ?? 0;
};

module.exports = { isArmSig, getArmType, TOMAHAWK_SIG, packSig };
