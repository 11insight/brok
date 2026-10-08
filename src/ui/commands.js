export const commands = [
  {
    id: "split",
    title: "Split",
    egress(state) {
      const onDevice = state.onDevice
        ? "On device. Nothing goes to api.x.ai."
        : "A live pass would send claim text to api.x.ai. This build does not.";
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
        leaves: "The page address. Only post text comes back.",
        note: "Not sent yet. Likes do not change the order.",
      };
    },
  },
  {
    id: "grokipedia",
    title: "Grokipedia",
    egress() {
      return {
        destination: "grokipedia.com, if you open the link",
        leaves: "Nothing until you open the link.",
        note: "A reference, not a verdict.",
      };
    },
  },
  {
    id: "ledger",
    title: "Blocked list",
    egress() {
      return {
        destination: "None",
        leaves: "Nothing. The list stays in this tab.",
        note: "Counts and kinds only. No identity.",
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
        note: "Only Send pane to Grok can leave, and only when you allow it.",
      };
    },
  },
];

export function filteredCommands(query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return commands;
  return commands.filter((command) => command.title.toLowerCase().includes(needle));
}
