import { expect, test } from 'claude-code/testing'

// Nothing sits beneath the mod in a test, so this hook stands for the engine:
// every command the guard lets through resolves here as if it had run.
const theCommandRan = () => ({ result: { stdout: '', stderr: '' } })

const REFUSED = [
  'cat .env',
  // the one that actually happened: a window of lines, not the whole file
  "sed -n '25,45p' .env",
  'grep DATABASE_URL .env',
  'cat ./.env',
  'cat ../.env',
  'cat /Users/someone/projects/ahead/propoints/.env',
  // the bind-mounted copy inside the devcontainer is the same file
  'docker exec propoints_devcontainer-app-1 bash -lc "cat /workspaces/propoints/.env"',
  // naming it in an assignment is still naming it
  'f=.env; cat $f',
  'echo $(cat .env)',
  'cat .env.production',
  'cat .devcontainer/.env',
  'cat config/master.key',
  'cat config/credentials.yml.enc',
  'cat config/credentials/production.yml.enc',
  'cat config/credentials/production.key',
  'cat tmp/local_secret.txt',
]

const ALLOWED = [
  'ls -la',
  'git status',
  'bundle exec rspec spec/models',
  // the committed template carries no secrets and is read all the time
  'cat .env.example',
  'cat .env.sample',
  'cat config/database.yml',
  "grep -rn 'DATABASE_URL' config/",
  // a bare `env`, and a word that merely starts the same way
  'env | sort',
  'cat environment.md',
]

test('it refuses a shell command that would read a credential file', async ($, on) => {
  on('tool.call', theCommandRan)

  for (const command of REFUSED) {
    const answer = await $.tool.call({ tool: 'Bash', command })

    expect(answer.deny).toBeDefined()
    expect(answer.result).toBeUndefined()
  }
})

test('it leaves every other command alone', async ($, on) => {
  on('tool.call', theCommandRan)

  for (const command of ALLOWED) {
    const answer = await $.tool.call({ tool: 'Bash', command })

    expect(answer.deny).toBeUndefined()
    expect(answer.result).toBeDefined()
  }
})

test('the refusal says which file it is about', async ($, on) => {
  on('tool.call', theCommandRan)

  const answer = await $.tool.call({ tool: 'Bash', command: 'cat config/master.key' })

  expect(answer.deny).toContain('master.key')
  expect(answer.deny).toContain('secret-file-guard')
})
