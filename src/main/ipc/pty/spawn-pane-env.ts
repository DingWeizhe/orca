// The pane identity a new PTY's env carries, stamped from the spawn's own ids, for both spawn lanes.

import { mkdirSync } from 'node:fs'
import { buildJcodeRuntimeDirEnv, JCODE_RUNTIME_DIR_ENV_KEY } from '../../../shared/jcode-runtime-dir'
import { isTerminalLeafId, makePaneKey } from '../../../shared/stable-pane-id'
import { isValidTerminalTabId } from '../../../shared/terminal-tab-id'
import type { TuiAgent } from '../../../shared/tui-agent'
import { prewarmJcodeDaemon } from '../../jcode/daemon-prewarm'

export type PtySpawnPane = {
  paneKey: string
  tabId: string | undefined
  worktreeId: string | undefined
}

/** The pane a host spawn's own ids name, or null when they name none. */
export function ptySpawnPaneFromIds(ids: {
  tabId?: string
  leafId?: string
  worktreeId?: string
}): PtySpawnPane | null {
  const { tabId, leafId } = ids
  if (
    typeof tabId !== 'string' ||
    !isValidTerminalTabId(tabId) ||
    typeof leafId !== 'string' ||
    !isTerminalLeafId(leafId)
  ) {
    return null
  }
  return { paneKey: makePaneKey(tabId, leafId), tabId, worktreeId: ids.worktreeId }
}

type PtySpawnPaneEnvArgs = {
  /** Null when the spawn's own tab+leaf ids don't name a valid pane. */
  pane: PtySpawnPane | null
  isDaemonHostSpawn: boolean
  launchAgent: TuiAgent | undefined
  cwd: string | undefined
  /** TEMPORARY (its own stacked PR removes it): only window daemon spawns pre-warm jcode. */
  prewarmsJcodeOnDaemonHost: boolean
}

export function stampPtySpawnPaneEnv(
  env: Record<string, string> | undefined,
  args: PtySpawnPaneEnvArgs
): void {
  if (!env) {
    return
  }
  const { pane } = args
  if (!pane) {
    // Why: ORCA_PANE_KEY crosses into shells/hook registries; only a key naming this spawn's own pane may reach it.
    delete env.ORCA_PANE_KEY
    delete env.ORCA_TAB_ID
    delete env.ORCA_WORKTREE_ID
    delete env.ORCA_AGENT_LAUNCH_TOKEN
    return
  }
  env.ORCA_PANE_KEY = pane.paneKey
  if (pane.tabId !== undefined) {
    env.ORCA_TAB_ID = pane.tabId
  } else {
    delete env.ORCA_TAB_ID
  }
  if (pane.worktreeId !== undefined) {
    env.ORCA_WORKTREE_ID = pane.worktreeId
  } else {
    delete env.ORCA_WORKTREE_ID
  }
  // Why: jcode runs one server/client daemon per runtime dir, so a per-pane
  // dir keeps every PTY on its own daemon (hooks inherit the pane key instead
  // of the first pane's). Local unix sockets only.
  const jcodeEnv = buildJcodeRuntimeDirEnv(pane.paneKey)
  if (!jcodeEnv) {
    return
  }
  // Why: LocalPtyProvider.spawn creates the dir async; daemon-host spawns
  // skip that provider, so ensure sync here — an extra await before
  // provider.spawn would reorder the pane-spawn reservation race.
  if (args.isDaemonHostSpawn) {
    try {
      mkdirSync(jcodeEnv[JCODE_RUNTIME_DIR_ENV_KEY], { recursive: true })
    } catch {
      // Why non-fatal: this dir is stamped on every local pane, so an EACCES on
      // a shared /tmp/orca-jcode or a read-only TMPDIR would stop a plain shell
      // from opening. Without it jcode falls back to its own default daemon.
      return
    }
  }
  Object.assign(env, jcodeEnv)
  // Why here too: daemon-host spawns never reach LocalPtyProvider.spawn, so
  // without this the pre-warm — the whole point of which is to beat jcode's
  // 5s socket budget on a cold runtime dir — would not fire for those panes.
  if (args.isDaemonHostSpawn && args.prewarmsJcodeOnDaemonHost) {
    prewarmJcodeDaemon({
      launchAgent: args.launchAgent,
      runtimeDir: jcodeEnv[JCODE_RUNTIME_DIR_ENV_KEY],
      cwd: args.cwd,
      env
    })
  }
}
