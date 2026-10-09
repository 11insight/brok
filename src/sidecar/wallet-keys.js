import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  isAddress,
  parseEther,
  toHex,
} from "viem";
import { validateMnemonic } from "@scure/bip39";
import { english, generateMnemonic, mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

export const RPC_HOST = "ethereum-sepolia-rpc.publicnode.com";
const RPC_URL = `https://${RPC_HOST}`;

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

// Session only. The phrase and key are never written to storage.
let account = null;
let phraseWords = null;
let pending = null;

function accountFromPhrase(phrase) {
  if (!validateMnemonic(phrase, english)) throw new Error("invalid");
  const hd = mnemonicToAccount(phrase);
  const key = hd.getHdKey().privateKey;
  if (!key) throw new Error("invalid");
  return privateKeyToAccount(toHex(key));
}

export function hasAccount() {
  return Boolean(account);
}

export function getPhraseWords() {
  return phraseWords ? phraseWords.slice() : null;
}

export function getAddress() {
  return account ? account.address : "";
}

export function createWallet() {
  const phrase = generateMnemonic(english, 128);
  account = accountFromPhrase(phrase);
  pending = null;
  phraseWords = phrase.split(" ");
  return { address: account.address, words: phraseWords.slice() };
}

export function forgetPhrase() {
  if (!phraseWords) return;
  for (let i = 0; i < phraseWords.length; i += 1) phraseWords[i] = "";
  phraseWords = null;
}

export function dropAccount() {
  forgetPhrase();
  account = null;
  pending = null;
}

export function importPhrase(raw) {
  const phrase = String(raw || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!phrase) return { ok: false, error: "Enter a recovery phrase." };
  try {
    account = accountFromPhrase(phrase);
  } catch {
    return { ok: false, error: "That phrase is not a valid recovery phrase." };
  }
  pending = null;
  forgetPhrase();
  return { ok: true, address: account.address };
}

async function assertSepolia() {
  const id = await publicClient.getChainId();
  if (id !== sepolia.id) throw new Error("This endpoint is not Sepolia. Nothing was signed.");
}

export async function readBalance() {
  if (!account) throw new Error("No wallet.");
  await assertSepolia();
  return publicClient.getBalance({ address: account.address });
}

export function formatEth(value) {
  return formatEther(value);
}

export function formatSepolia(value) {
  return `${formatEther(value)} Sepolia ETH`;
}

export async function inspectSend({ to, amount }) {
  if (!account) return { ok: false, error: "Create or import a wallet first." };
  const dest = String(to || "").trim();
  if (!isAddress(dest)) return { ok: false, error: "Enter a destination address." };
  let value;
  try {
    value = parseEther(String(amount || "").trim());
  } catch {
    return { ok: false, error: "Enter an amount in ETH." };
  }
  if (value <= 0n) return { ok: false, error: "Enter an amount greater than zero." };
  let balance;
  let code;
  try {
    await assertSepolia();
    balance = await publicClient.getBalance({ address: account.address });
    code = await publicClient.getCode({ address: dest });
  } catch (error) {
    const message =
      error?.message === "This endpoint is not Sepolia. Nothing was signed."
        ? error.message
        : "Sepolia did not answer. Nothing was signed.";
    return { ok: false, error: message };
  }
  const contract = Boolean(code && code !== "0x");
  const over = value > balance;
  let title = "Review send";
  let reason = "Nothing on this send was flagged. It still waits for you.";
  if (contract && over) {
    title = "Contract destination";
    reason =
      "This address has contract code, and the amount is larger than the Sepolia balance. Cancel stays the default.";
  } else if (contract) {
    title = "Contract destination";
    reason = "This address has contract code. Cancel stays the default.";
  } else if (over) {
    title = "Larger than the balance";
    reason = "This send is larger than the Sepolia balance. Cancel stays the default.";
  }
  pending = { to: dest, value };
  return {
    ok: true,
    pause: {
      title,
      reason,
      to: dest,
      amount: formatEther(value),
      balance: formatEther(balance),
    },
  };
}

export function clearSend() {
  pending = null;
}

export async function broadcastSend() {
  if (!account || !pending) throw new Error("Nothing is waiting to send.");
  await assertSepolia();
  const job = pending;
  pending = null;
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC_URL),
  });
  return walletClient.sendTransaction({
    account,
    chain: sepolia,
    to: job.to,
    value: job.value,
  });
}
