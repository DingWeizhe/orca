import { ptySpawnPaneFromIds, stampPtySpawnPaneEnv } from '../ipc/pty/spawn-pane-env'

/** The env a fake `ptyController.spawn` call's PTY gets once the real spawn step stamps its own pane ids. */
export function spawnedPtyEnv(call: unknown): Record<string, string> {
  const env: Record<string, string> = {}
  const ids: { tabId?: string; leafId?: string; worktreeId?: string } = {}
  if (typeof call === 'object' && call !== null) {
    if ('env' in call && typeof call.env === 'object' && call.env !== null) {
      for (const [key, value] of Object.entries(call.env)) {
        if (typeof value === 'string') {
          env[key] = value
        }
      }
    }
    if ('tabId' in call && typeof call.tabId === 'string') {
      ids.tabId = call.tabId
    }
    if ('leafId' in call && typeof call.leafId === 'string') {
      ids.leafId = call.leafId
    }
    if ('worktreeId' in call && typeof call.worktreeId === 'string') {
      ids.worktreeId = call.worktreeId
    }
  }
  stampPtySpawnPaneEnv(env, {
    pane: ptySpawnPaneFromIds(ids),
    isDaemonHostSpawn: false,
    launchAgent: undefined,
    cwd: undefined,
    prewarmsJcodeOnDaemonHost: false
  })
  return env
}
