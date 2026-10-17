import { useLocalSearchParams } from 'expo-router'
import { firstParam } from '../navigation/route-param-reader'
import { shellScreenRoute, shellScreenRouteKey } from './shell-screen-route'
import { MobileWebShellScreen } from './MobileWebShellScreen'
import { PageRouteUnavailableScreen } from './PageRouteUnavailableScreen'
import { shellSwitchDecision } from './shell-switch-decision'

/**
 * Any host-scoped pathname this app has no route file for, handed to the shell.
 *
 * The only switch with no native screen behind it: a screen registered after this app shipped is in
 * the desktop's bundle and nowhere else, so `fallback` is a refusal rather than a panel. A pathname
 * the bundle does not list is the shell's desktop-too-old wall, so the refusal is reached only on a
 * native-shell build.
 *
 * Least specific of everything in its directory, so it takes only what expo-router would otherwise
 * send to Unmatched; every route that has a file keeps it, on both platforms.
 *
 * Here and not in `app/`, with a one-line re-export there, because expo-router 55 reads a file's
 * platform from the first dot of its stripped name: `[...page]` already holds three, so
 * `[...page].web.tsx` under `app/` parses as platform `''` and registers a second route rather than
 * overriding this one. Metro and the page builder both resolve a `.web.tsx` sibling under `src/` by
 * stem, so the override belongs where the stem is plain.
 *
 * Each segment is re-encoded: `page` arrives decoded and split, and a `%2F` inside one segment
 * arrives as two.
 */
export default function MobileWebPageCatchAllScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>()
  const hostId = firstParam(params.hostId)
  const segments = Array.isArray(params.page) ? params.page : params.page ? [params.page] : []
  const refusal = <PageRouteUnavailableScreen hostId={hostId} />

  /**
   * The query, carried to the page the way every named switch carries its own.
   *
   * `useLocalSearchParams` merges this route's params into the search params, so everything that
   * is not one of the two segments the pathname above is built from is the deep link's query —
   * which is the only way this switch can find it, having no screen to name the keys of. Dropped,
   * `/h/x/session/y?tab=files` opens the page on the session with no tab.
   *
   * `firstParam` per key, because `init.route.params` is one value per name: a repeated key would
   * otherwise cross as `a,b`. An empty value is kept rather than dropped — a named switch drops
   * its own because it knows what its screen makes of one, and this switch knows no screen.
   *
   * `#` is dropped with them: expo-router parks the URL fragment under that key before it reads
   * the search string, and a fragment is not a query — the route the page is given carries none.
   */
  const query = Object.fromEntries(
    Object.entries(params)
      .filter(([key]) => key !== 'hostId' && key !== 'page' && key !== '#')
      .map(([key, value]) => [key, firstParam(value)])
  )

  const route =
    hostId && segments.length > 0
      ? shellScreenRoute({
          pathname: `/h/${encodeURIComponent(hostId)}/${segments.map(encodeURIComponent).join('/')}`,
          ...(Object.keys(query).length === 0 ? {} : { params: query })
        })
      : null

  const decision = shellSwitchDecision(route)

  if (decision.kind === 'native') {
    return refusal
  }
  // Keyed on the route, as the other switches are: a host captures the grants its session opened
  // with, so a screen reused across a route change would authorise frames under grants the page has
  // left behind.
  //
  // The shell's own states, not the refusal: offline means the bundle that would serve it cannot be
  // fetched, `checking` means the answer is not in yet, and the wall means this host's page cannot
  // serve it. Absorbing those would tell someone with no connection that the screen does not exist.
  // `catch-all-page-route-states.test.tsx` drives them.
  return (
    <MobileWebShellScreen
      key={shellScreenRouteKey(decision.route)}
      hostId={hostId}
      route={decision.route}
      fallback={refusal}
    />
  )
}
