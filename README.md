# claude-plugins

AHEAD Automotive's Claude Code plugins. The repository is a plugin **marketplace**:
`.claude-plugin/marketplace.json` lists what it offers, and each plugin lives under `plugins/`.

| Plugin | What it does |
|---|---|
| [`secret-file-guard`](plugins/secret-file-guard) | Refuses shell commands that would read a credential file (`.env`, `config/master.key`, `*.yml.enc`) into a Claude Code transcript. |

## Deploying to everyone

The intended route. In **Organization settings → Claude Code → Managed settings** on
claude.ai (Owner or Primary Owner role), register the marketplace and enable the plugin:

```json
{
  "extraKnownMarketplaces": {
    "ahead": { "source": { "source": "github", "repo": "AHEAD-Automotive/claude-plugins" } }
  },
  "enabledPlugins": { "secret-file-guard@ahead": true }
}
```

Managed settings sit at the top of the precedence stack, so nobody can override them in their
own files, and they reach every repository on every machine — not only the one that holds the
secrets. Each person confirms it arrived with `/status`, which names the managed source under
`Setting sources`.

Because this repository is **private**, installing from it needs a GitHub credential on the
machine: an SSH key, or `gh auth login` followed by `gh auth setup-git`. The install never
prompts for one — it simply fails to fetch. Everyone here already has `gh` set up for the
propoints repository, so this should be a non-issue; it is the first thing to check if a
plugin does not appear.

## Installing one by hand

For trying a plugin before it goes out to everyone. At the prompt of a terminal session:

```
/plugin install secret-file-guard --marketplace AHEAD-Automotive/claude-plugins
```

From a shell:

```
claude plugin install secret-file-guard --marketplace AHEAD-Automotive/claude-plugins
```

You are asked `Add marketplace?` — answer `y` — then for a scope; Enter takes the user scope,
which applies in every project on that machine.

In the desktop app, where `/plugin` does not run: **+** next to the prompt box → Plugins → Add
marketplace with `AHEAD-Automotive/claude-plugins` → Add plugin.

## Working on a plugin

```bash
claude plugin validate plugins/<name>        # manifest and hooks module, as the engine reads them
claude plugin test plugins/<name>            # its *.test.ts files, against the real engine
claude --plugin-dir "$PWD/plugins/<name>"    # a session with it loaded from disk
```

A change reaches people through a new commit on `main`: they pick it up with
`claude plugin update`, or at the next fetch of the marketplace for a managed install. Bump
`version` in both the plugin's `.claude-plugin/plugin.json` and this repository's
`.claude-plugin/marketplace.json` in the same commit — they are read from different places and
a mismatch is confusing to debug.
