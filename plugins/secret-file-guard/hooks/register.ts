import type { Register } from 'claude-code'

// The gap this closes: a `Read(./.env)` deny rule covers the file-reading tools --
// Read, Grep, Glob, @-mentions -- but not a shell command that opens the same file.
// `cat .env` walks straight past it. This refuses the shell call instead.
//
// Each pattern is anchored at a path boundary rather than at the start of the word,
// so every spelling of the same file is caught alike: `.env`, `./.env`, `../.env`,
// `/workspaces/propoints/.env`.
const SECRET_PATHS: RegExp[] = [
  /(^|\/)\.env$/,
  // .env.production, .env.local -- but not the templates that are meant to be committed
  /(^|\/)\.env\.(?!example$|sample$|template$|dist$)[\w.-]+$/,
  /(^|\/)master\.key$/,
  // Rails credentials, both the single file and the per-environment ones, whose
  // names are the environment rather than anything fixed
  /\.yml\.enc$/,
  /(^|\/)config\/credentials\/[\w-]+\.key$/,
  /(^|\/)local_secret\.txt$/,
]

// Shell punctuation that ends one word and starts the next, so a file named inside
// `$(cat .env)` or `cat .env|head` is found as readily as one standing on its own.
const WORD_BREAK = /[\s'"`;|&()<>{}=,]+/

const secretsNamedIn = (command: string): string[] => {
  const found = new Set<string>()

  for (const word of command.split(WORD_BREAK)) {
    const path = word.replace(/\\/g, '/')
    if (SECRET_PATHS.some(pattern => pattern.test(path))) found.add(path)
  }

  return [...found]
}

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, ($, e, next) => {
    const named = secretsNamedIn(e.command)

    if (named.length === 0) return next(e)

    return {
      deny:
        `${$.plugin.name}: this command names ${named.join(', ')}, which holds credentials. ` +
        'A transcript is kept, so a key read into one has to be rotated afterwards. Ask the ' +
        'person for the single value needed, or read it from the running process rather than ' +
        'from the file. If the file genuinely has to be changed, say what the change is and ' +
        'let the person make it.',
    }
    // A guard that fails open is decoration: if the check itself throws before the
    // command has gone through, the command is refused rather than waved past.
  }).catch(($, e, next) =>
    next.called
      ? next(e)
      : { deny: `${$.plugin.name}: its guard failed, so the command was not run.` },
  )
}
