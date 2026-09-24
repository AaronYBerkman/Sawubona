// One automatic attempt per lift/rest cycle. No video or landmarks are stored here.
export function createAutoCapture({ settleMs = 250 } = {}) {
  let since = null;
  let armed = true;
  return {
    get armed() { return armed; },
    observe(raised, time) {
      if (!raised) { since = null; armed = true; return false; }
      if (!armed) return false;
      since ??= time;
      if (time - since < settleMs) return false;
      armed = false;
      since = null;
      return true;
    },
    finish(rested = false) { since = null; armed = rested; },
    reset() { since = null; armed = true; },
  };
}
