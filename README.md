# Brok

A browser powered by Grok. Search, read any page with no ads or trackers, and
sort what it says into fact, opinion and not fact.

Live at https://brok-olive.vercel.app. Free and open source under the
[AGPL 3.0](LICENSE).

## Run it at home

Then nothing goes through our server. You need [Node](https://nodejs.org) 20 or newer.

```sh
git clone https://github.com/11insight/brok.git
cd brok
npm install
npm start
```

Open http://127.0.0.1:5190. Search and the page reader now run on your computer.

## Split with your own model

In Settings, under Split with, pick **Your own**. The page text then goes
straight from your browser to the model you pick. Brok's server never sees the
text or your key. Your key stays in the tab unless you tick Remember.

- **xAI:** tap xAI, paste a key from https://console.x.ai, tap Check, pick a model, tap Use it.
- **A model on your computer:** install [Ollama](https://ollama.com), then let Brok talk to it:

  ```sh
  ollama pull llama3.2
  OLLAMA_ORIGINS="https://brok-olive.vercel.app,http://127.0.0.1:5190" ollama serve
  ```

  In Settings tap Ollama, then Check, then Use it. LM Studio works the same way.

Running at home with Brok's own Grok instead needs an `AI_GATEWAY_API_KEY` from Vercel.

## Set up search and X (for whoever runs Brok)

- **Search:** set `BRAVE_API_KEY` (from https://api-dashboard.search.brave.com). Without it Brok falls back to Bing's public feed.
- **Sign in with X:** make an app at https://developer.x.com with OAuth 2.0 on, callback `https://<your domain>/auth/x/callback`, then set `X_CLIENT_ID` (and `X_CLIENT_SECRET` if X marks the app confidential). Post search needs paid X API access. Extra domains go in `BROK_ORIGINS`, comma separated.

## Who sees what

| When you | Who gets it | What they get |
|---|---|---|
| Search | Brok's server, then Brave Search | Your search words. Brave sees Brok, not you. |
| Open a page | Brok's server, then the site | The page address. The site sees Brok, not you. Its trackers never load. |
| Split with Brok's Grok | Brok's server, Vercel AI Gateway, xAI | The page text. No name, no account. |
| Split with your own model | Only that model | The page text, straight from your browser. |
| Sign in with X, then Show posts | Brok's server, then X | Your X sign-in and the page address. Brok keeps neither. |
| Use the wallet | publicnode.com | Your wallet address. Never the phrase. |
| Load Brok | Vercel, our host | Your internet address. Not your searches or pages. |

Brok keeps nothing: no accounts, no logs of what you search or read. Searches
and page addresses travel in request bodies and after the `#`, so they never
land in a server log. Your browser keeps only your color and view choice.

In the app, open Blocked, then Sent, to see every request as it leaves.

## How Brok treats sites

The reader says who it is (`BrokReader`, with a link here) and follows each
site's `robots.txt`. To keep Brok out:

```
User-agent: BrokReader
Disallow: /
```

## How Brok sorts claims

The exact prompt is in [`src/prompts/claims.js`](src/prompts/claims.js), with a
version number. Every split shows the model and prompt version that made it. A
"fact" with no named source is moved to Not fact, whatever the model said.

## Check the live site

Settings shows the commit the live site was built from, linked to that exact code.

## Brok, the character

Settings, Brok: **Drawn** (animated in code, the default) or **3D** (three.js, loads only when picked). A hand-made Rive version shows up as **Animated** once `public/brok.riv` exists; see the [brief for animators](docs/brok-rive-brief.md).
