// Tags that only tell a site or ad network where you came from. Brok drops
// them before it fetches a page or shows its address.
const EXACT = new Set([
  "fbclid", "gclid", "gclsrc", "dclid", "gbraid", "wbraid", "msclkid", "yclid", "twclid", "ttclid",
  "li_fat_id", "igshid", "mc_cid", "mc_eid", "_hsenc", "_hsmi", "mkt_tok", "oly_anon_id", "oly_enc_id",
  "vero_id", "rb_clickid", "s_cid", "ncid", "cmpid", "ref_src", "ref_url", "spm", "si",
]);
const PREFIXES = ["utm_", "pk_", "mtm_", "hsa_", "__hs"];

export function cleanUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || ""));
  } catch {
    return String(raw || "");
  }
  for (const key of [...url.searchParams.keys()]) {
    const low = key.toLowerCase();
    if (EXACT.has(low) || PREFIXES.some((prefix) => low.startsWith(prefix))) url.searchParams.delete(key);
  }
  return url.href;
}
