/* The session: who the portal is being viewed as, the theme, and recently opened dashboards.
   "View as" stands in for sign-in until SSO is wired. It changes navigation only, never data. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ENG, type Viewer } from './access';
import { humanize, roles } from './data';

export const viewers: Viewer[] = [ENG, ...roles.map((r) => ({ id: r.id, label: humanize(r.id), eng: false }))];

type Theme = 'light' | 'dark';
type Session = {
  viewer: Viewer;
  setViewer: (id: string) => void;
  theme: Theme;
  toggleTheme: () => void;
  recent: string[];
  touch: (dashboardId: string) => void;
};

const Ctx = createContext<Session | null>(null);

// Browser storage can be missing (private windows, blocked site data); every read and write is guarded.
const load = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const save = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* not kept */ } };

export function SessionProvider({ children }: { children: ReactNode }) {
  const [viewerId, setViewerId] = useState(() => load('portal.viewAs') ?? ENG.id);
  const [theme, setTheme] = useState<Theme>(() => (load('portal.theme') === 'dark' ? 'dark' : 'light'));
  const [recent, setRecent] = useState<string[]>(() => { try { return JSON.parse(load('portal.recent') ?? '[]'); } catch { return []; } });

  useEffect(() => { document.documentElement.dataset.theme = theme; save('portal.theme', theme); }, [theme]);

  const viewer = viewers.find((v) => v.id === viewerId) ?? ENG;
  const setViewer = useCallback((id: string) => { setViewerId(id); save('portal.viewAs', id); }, []);
  const toggleTheme = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), []);
  const touch = useCallback((id: string) => {
    setRecent((r) => { const next = [id, ...r.filter((x) => x !== id)].slice(0, 5); save('portal.recent', JSON.stringify(next)); return next; });
  }, []);

  const value = useMemo(() => ({ viewer, setViewer, theme, toggleTheme, recent, touch }), [viewer, setViewer, theme, toggleTheme, recent, touch]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}
