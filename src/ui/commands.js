import { currentOwnModel, hostOf } from "../sidecar/own-model.js";

// Commands run at once. Only a command that sends something off this device
// stops first to say where it goes.
export const commands = [
  { id: "search", title: "New search", page: false },
  { id: "reader", title: "Reader view", page: true },
  {
    id: "split",
    title: "Split this page",
    page: true,
    egress(state) {
      if (state.article?.split?.status === "done" || !state.onDevice) return null;
      const own = currentOwnModel();
      return {
        destination: own?.on ? `${hostOf(own.endpoint)}, straight from your browser` : "Grok, through Vercel",
        leaves: "The page text. No account.",
        note: "Grok sorts the claims. A first pass, not a ruling.",
      };
    },
  },
  { id: "original", title: "What this page tried to load", page: true },
  { id: "ledger", title: "Blocked list", page: false },
  { id: "sent", title: "What left this device", page: false },
  { id: "security", title: "Security", page: false },
  { id: "settings", title: "Settings", page: false },
  { id: "wallet", title: "Wallet", page: false },
];

export function filteredCommands(query, hasPage = true) {
  const needle = query.trim().toLowerCase();
  return commands.filter(
    (command) => (hasPage || !command.page) && (!needle || command.title.toLowerCase().includes(needle)),
  );
}
