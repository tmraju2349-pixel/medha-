export type AppMode = 'production' | 'demo';

export function getAppMode(pathname: string = typeof window !== 'undefined' ? window.location.pathname : '/'): AppMode {
  return pathname === '/demo' || pathname.startsWith('/demo/') ? 'demo' : 'production';
}

export function isDemoRoute(): boolean {
  return getAppMode() === 'demo';
}
