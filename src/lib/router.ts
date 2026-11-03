import { useSyncExternalStore } from 'react'

// Hash routing (#/configure) so the app works on GitHub Pages without server rewrites.
export const ROUTES = [
  '/',
  '/configure',
  '/inspiration',
  '/guide',
  '/my-designs',
] as const

export type Route = (typeof ROUTES)[number]

function readRoute(): Route {
  // Ignore any query part, e.g. #/configure?c=... from a share link
  const path = window.location.hash.replace(/^#/, '').split('?')[0] || '/'
  return (ROUTES as readonly string[]).includes(path) ? (path as Route) : '/'
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, readRoute)
}

export function href(route: Route) {
  return `#${route}`
}
