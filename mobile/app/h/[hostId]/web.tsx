import { useLocalSearchParams } from 'expo-router'
import { MobileWebShellScreen } from '../../../src/mobile-web-shell/MobileWebShellScreen'
import { PageRouteUnavailableScreen } from '../../../src/mobile-web-shell/PageRouteUnavailableScreen'

/**
 * The hybrid shell route. It sits under `app/h/[hostId]` so `HostProtocolGate` in that group's
 * layout still owns the `desktop-too-old` wall above it.
 *
 * Reachable by deep link only; no screen links here.
 */
export default function MobileWebShellRoute() {
  const { hostId } = useLocalSearchParams<{ hostId: string }>()
  if (!hostId) {
    return <PageRouteUnavailableScreen hostId="" />
  }
  // The screen the page stands in for. The document is served at `/`, which matches no route in
  // the tree the page carries, so this is the only thing that tells it which one to open.
  return (
    <MobileWebShellScreen
      // Same reason as the agent-history route: a host holds the grants its session opened with,
      // so a host id change must be a remount rather than a prop update.
      key={hostId}
      hostId={hostId}
      // Encoded: `hostId` arrives decoded, and one carrying `?`, `#` or whitespace would build a
      // pathname the page refuses.
      route={{ pathname: `/h/${encodeURIComponent(hostId)}` }}
    />
  )
}
