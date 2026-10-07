export const commands = [
  {
    id: "split",
    title: "Split",
    egress(state) {
      const onDevice = state.onDevice
        ? "On-device mode is on. No call to api.x.ai."
        : "On-device mode is off. A live pass would send claim text only to api.x.ai. This prototype does not send it.";
      return {
        destination: "None",
        leaves: "Nothing. The split stays in this tab.",
        note: onDevice,
      };
    },
  },
  {
    id: "posts",
    title: "Posts citing this URL",
    egress() {
      return {
        destination: "api.x.com",
        leaves: "A live query would send url: plus the page address, and read post text only.",
        note: "Not sent. Likes are not a weight, and For You is not a rank.",
      };
    },
  },
  {
    id: "grokipedia",
    title: "Grokipedia",
    egress() {
      return {
        destination: "grokipedia.com, only if you open the link",
        leaves: "The shelf itself stays local. The link would request that host.",
        note: "Opening the shelf does not promote a claim. It is a reference, not a verdict.",
      };
    },
  },
  {
    id: "ledger",
    title: "Ledger",
    egress() {
      return {
        destination: "None",
        leaves: "Nothing. The estimator stays in this tab.",
        note: "Destination classes and block counts only. No identity.",
      };
    },
  },
  {
    id: "security",
    title: "Security",
    egress() {
      return {
        destination: "None",
        leaves: "Nothing.",
        note: "The only inference egress is Send pane to Grok, and only with on-device mode off.",
      };
    },
  },
];

export function filteredCommands(query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return commands;
  return commands.filter((command) => command.title.toLowerCase().includes(needle));
}
