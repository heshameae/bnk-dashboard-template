/* A hash router: six pages do not need a library. #/ , #/d/<id>, #/analytics[/<id>], #/catalog, #/access, #/model. */
import { useEffect, useState } from 'react';

export type Route =
  | { page: 'home' }
  | { page: 'dashboard'; id: string }
  | { page: 'analytics'; id?: string }
  | { page: 'catalog'; filter?: string }
  | { page: 'access' }
  | { page: 'model' }
  | { page: 'notfound' };

export function parse(hash: string): Route {
  const [path, query] = hash.replace(/^#/, '').split('?');
  const parts = (path || '/').split('/').filter(Boolean);
  if (parts.length === 0) return { page: 'home' };
  if (parts[0] === 'd' && parts[1]) return { page: 'dashboard', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'analytics') return { page: 'analytics', id: parts[1] ? decodeURIComponent(parts[1]) : undefined };
  if (parts[0] === 'catalog') return { page: 'catalog', filter: new URLSearchParams(query).get('show') ?? undefined };
  if (parts[0] === 'access' || parts[0] === 'model') return { page: parts[0] };
  return { page: 'notfound' };
}

export const href = {
  home: '#/',
  dashboard: (id: string) => `#/d/${encodeURIComponent(id)}`,
  analytics: (id?: string) => (id ? `#/analytics/${encodeURIComponent(id)}` : '#/analytics'),
  catalog: (show?: 'drafts') => (show ? `#/catalog?show=${show}` : '#/catalog'),
  access: '#/access',
  model: '#/model',
};

export const go = (to: string) => { window.location.hash = to; };

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
