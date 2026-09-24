// How much this device should be asked to load.
//
// The second SignCLIP view (asl3) adds two to three points of accuracy for
// 87 MB of model and 21 MB of references, and holding both SignCLIP models at
// once is what runs a phone out of memory. Phones and small machines leave it
// out; ?full in the address loads it anyway, ?light leaves it out anywhere.

export function wantsExtraViews(nav = globalThis.navigator, search = globalThis.location?.search ?? '') {
  const params = new URLSearchParams(search);
  if (params.has('full')) return true;
  if (params.has('light')) return false;
  const memory = nav?.deviceMemory;                 // Chrome and Edge only, in GB, capped at 8
  if (memory && memory < 4) return false;
  const ua = nav?.userAgent ?? '';
  // iPadOS reports itself as a Mac; its touch points give it away
  const phone = /iPhone|iPad|iPod|Android|Mobile/i.test(ua) || (/Macintosh/.test(ua) && nav?.maxTouchPoints > 1);
  return !phone || memory >= 8;
}
