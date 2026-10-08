// Invalid on purpose. Hyphenated tokens are not BIP-39 words.
// A copy of this list is not a wallet. The runtime copy is cleared after display.
export const fixturePhrase = Object.freeze([
  "brok-fixture",
  "not-bip39",
  "testnet-only",
  "do-not-import",
  "invalid-word",
  "cleared-after",
  "no-custody",
  "never-stored",
  "checksum-bad",
  "demo-phrase",
  "wipe-on-hide",
  "not-a-seed",
]);

export const transactions = [
  {
    id: "scam",
    title: "Swap to NS14.claim",
    reasonTitle: "Known scam token",
    reason:
      "NS14.claim is on the fixture scam list. Signing would approve a contract flagged as a scam.",
    token: "NS14.claim",
    amount: "1.2 testnet units",
    contract: "fixture-contract-not-an-address",
    destination: "fixture-sink-not-an-address",
  },
  {
    id: "drain",
    title: "Set approval for all",
    reasonTitle: "Drain pattern",
    reason:
      "This contract asks for unlimited approval, then a transfer to a second destination. That pattern is used to empty a wallet. Cancel stays the default.",
    token: "NS-14",
    amount: "Unlimited approval",
    contract: "fixture-drain-not-an-address",
    destination: "fixture-second-hop-not-an-address",
  },
  {
    id: "cap",
    title: "Buy NORSPN",
    reasonTitle: "Market-cap mismatch",
    reason:
      "This token has a $12M market cap. Another with a near-identical name has $260M. Are you sure this is the one you meant?",
    token: "NORSPN",
    amount: "400 testnet units",
    contract: "fixture-name-not-an-address",
    destination: "fixture-pool-not-an-address",
  },
];
