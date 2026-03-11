# @tokengate/cli

End-to-end encrypted environment variable sync. Each environment is locked with its own password — secrets are encrypted before they leave your machine.

## Install

```bash
# bun (recommended)
bun add -g @tokengate/cli

# npm
npm i -g @tokengate/cli
```

> Requires [Bun](https://bun.sh) runtime.

## Quick start

```bash
# 1. Sign in via browser
tokengate login

# 2. Initialize in your project (scans for .env files)
tokengate init

# 3. Push your env files
tokengate push

# 4. Pull on another machine
tokengate pull
```

## Commands

| Command | Description |
|---|---|
| `tokengate` | Smart mode — push/pull if initialized, else setup |
| `tokengate login` | Sign in via browser |
| `tokengate logout` | Clear stored credentials |
| `tokengate init` | Setup wizard — scans .env files and links to environments |
| `tokengate status` | Show config and file mappings |
| `tokengate workspaces` | List workspaces |
| `tokengate push` | Select and push env files (shows change status) |
| `tokengate pull` | Select and pull env files (shows remote status) |
| `tokengate history` | Show revision history |

## How it works

1. Run `tokengate init` in your project root
2. It scans for `.env` files and links each to a remote environment
3. Each environment is locked with its own password (PBKDF2 + AES-256-GCM)
4. `tokengate push` / `tokengate pull` shows all files with sync status
5. Project config is saved to `.tokengate.json`

## Environment variables

| Variable | Description |
|---|---|
| `TOKENGATE_APP_URL` | Override app URL (default: `https://tokengate.dev`) |

## License

MIT
