# secret-file-guard

Refuses shell commands that would read a credential file into a Claude Code transcript.

## Install

At the prompt of a terminal session:

```
/plugin install secret-file-guard --marketplace AHEAD-Automotive/claude-plugins
```

Answer `y` to `Add marketplace?`, then Enter for the user scope. For the whole team at once,
see "Deploying it to everyone" below.

## Why it exists

A `permissions.deny` rule such as `Read(./.env)` covers the file-reading tools — `Read`,
`Grep`, `Glob`, `@file` mentions and the context an IDE shares — but it does **not** cover a
shell command that opens the same file. `cat .env` walks straight past it, and the contents
land in a transcript that is kept. A credential read into a transcript has to be rotated,
which is slow, visible and entirely avoidable.

This plugin closes that one gap. It inspects every `Bash` call before it runs and refuses the
ones that name a credential file, with a message telling Claude what to do instead: ask the
person for the single value it needs, or read it from the running process.

## What it refuses

Any shell command naming one of these, at any path and in any spelling (`.env`, `./.env`,
`../.env`, `/workspaces/propoints/.env`, or inside `$(…)`):

| File | Note |
|---|---|
| `.env` | and `.env.production`, `.env.local`, and the rest |
| `.env.example`, `.env.sample`, `.env.template`, `.env.dist` | **allowed** — committed templates hold no secrets |
| `config/master.key` | |
| `*.yml.enc` | Rails credentials, single-file and per-environment |
| `config/credentials/<env>.key` | the per-environment keys |
| `tmp/local_secret.txt` | |

It is deliberately blunt: a command naming one of these is refused whether it reads, copies or
writes. `cp .env.example .env` is refused along with `cat .env`. Narrowing that to reads only
is where this kind of guard goes soft, so the person does those by hand.

## What it does not do

It reads the command as **text**. It will catch the careless case — which is the case that
actually happens — but not a determined one:

- `cat .e*`, or any other glob
- a path built at runtime from something the command fetches
- `python3 -c "print(open('.en'+'v').read())"`
- a secret read inside a script whose body the guard never sees

For a boundary rather than a speed bump, use the sandbox: `sandbox.filesystem.denyRead`
merges with your `Read(...)` deny rules and is applied at the filesystem layer, so the read
fails at the OS whatever the command looks like. `sandbox.credentials.files` with
`mode: "mask"` goes further and hands the command a sentinel while the real value is injected
at the network proxy, so a tool that genuinely needs the key keeps working.

Treat this plugin as the cheap layer that costs nothing and catches the common mistake.

## Deploying it to everyone

Register the marketplace and enable the plugin in
**Organization settings → Claude Code → Managed settings** on claude.ai:

```json
{
  "extraKnownMarketplaces": {
    "ahead": { "source": { "source": "github", "repo": "AHEAD-Automotive/claude-plugins" } }
  },
  "enabledPlugins": { "secret-file-guard@ahead": true }
}
```

Managed settings sit at the top of the precedence stack, so nobody can override it in their own
files, and they reach every repository on every machine — not only the one that holds the
secrets.

Two further keys, once you are happy with it:

- `allowManagedHooksOnly: true` — only hooks from managed settings and managed-enabled plugins
  run, so the guard cannot be switched off locally. **Note:** this also stops any hook a
  repository's own `.claude/settings.json` declares, so check nothing else depends on one first.
- `strictKnownMarketplaces` — pins the marketplaces that may be added at all.

## Working on it

```bash
claude plugin validate <this folder>   # manifest and module, read as the engine reads them
claude plugin test <this folder>       # the cases in hooks/register.test.ts
claude --plugin-dir <this folder>      # a session with it loaded
```

`hooks/register.test.ts` holds the refused and allowed commands as a table. Add a case there
before changing the patterns — both defects found while this was written were found by it.
