// Throwaway harness: the real pages inside one of four shells, switched by the picker. Imported by nothing.
import { StrictMode, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { EmptyState, Icon, LinkButton } from '../../src/ds';
import { canOpen, type Page } from '../../src/shell/access';
import { dashboardById } from '../../src/shell/data';
import { href, useRoute, type Route } from '../../src/shell/router';
import { SessionProvider, useSession } from '../../src/shell/session';
import { Shell, type Top } from '../../src/shell/Shell';
import { Access } from '../../src/pages/Access';
import { AnalyticsPage, AnalyticsPicker, DashboardSwitch } from '../../src/pages/Analytics';
import { Catalog } from '../../src/pages/Catalog';
import { DashboardPage } from '../../src/pages/DashboardPage';
import { Home } from '../../src/pages/Home';
import { ModelExplorer } from '../../src/ModelExplorer';
import '../../src/pages/pages.css';
import type { ShellProps } from './common';
import { Inset } from './Inset';
import { Masthead } from './Masthead';
import { Rail } from './Rail';
import './picker.css';
import './tint.css';

const VARIANTS: { key: string; name: string; Shell: ComponentType<ShellProps> }[] = [
  { key: 'current', name: 'Current', Shell },
  { key: 'inset', name: 'Inset', Shell: Inset },
  { key: 'rail', name: 'Rail', Shell: Rail },
  { key: 'masthead', name: 'Masthead', Shell: Masthead },
];

const scope = (label: string, to?: string) =>
  to ? <a className="shell-scope ds-label" href={to}><Icon.ArrowLeft size={16} />{label}</a> : <span className="shell-scope ds-label">{label}</span>;

function view(route: Route): { active: Page | null; top: Top; body: React.ReactNode; full?: boolean } {
  switch (route.page) {
    case 'home':
      return { active: 'home', top: { scope: scope('All dashboards'), title: 'Overview' }, body: <Home /> };
    case 'dashboard': {
      const d = dashboardById(route.id);
      if (!d) return notFound();
      return { active: 'home', top: { scope: scope('Dashboards', href.home), title: d.title }, body: <DashboardPage key={d.id} d={d} /> };
    }
    case 'analytics': {
      if (!route.id) return { active: 'analytics', top: { scope: scope('All dashboards'), title: 'Analytics' }, body: <AnalyticsPicker /> };
      const d = dashboardById(route.id);
      if (!d) return notFound();
      return { active: 'analytics', top: { scope: <DashboardSwitch d={d} />, title: 'Analytics' }, body: <AnalyticsPage key={d.id} d={d} /> };
    }
    case 'catalog':
      return { active: 'catalog', top: { title: 'Catalog' }, body: <Catalog show={route.filter} /> };
    case 'access':
      return { active: 'access', top: { title: 'Access' }, body: <Access /> };
    case 'model':
      return { active: 'model', top: { title: 'Model Explorer' }, body: <ModelExplorer />, full: true };
    default:
      return notFound();
  }
}
const notFound = () => ({
  active: null,
  top: { title: 'Not found' },
  body: (
    <div className="shell-page">
      <EmptyState icon={<Icon.SearchX size={18} />} title="Nothing lives at this address" action={<LinkButton href={href.home}>Back to dashboards</LinkButton>} />
    </div>
  ),
});

function Portal({ Frame }: { Frame: ComponentType<ShellProps> }) {
  const route = useRoute();
  const { viewer } = useSession();
  const { active, top, body, full } = view(route);
  const blocked = active && !canOpen(viewer, active);
  return (
    <Frame active={active} top={top} full={full && !blocked}>
      {blocked ? (
        <div className="shell-page">
          <EmptyState icon={<Icon.Lock size={18} />} title="Eng. team only" action={<LinkButton href={href.home}>Back to dashboards</LinkButton>}>
            Switch “view as” to Eng. team to open this page.
          </EmptyState>
        </div>
      ) : body}
    </Frame>
  );
}

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

function Harness() {
  const [current, setCurrent] = useState(() => {
    const v = parseInt(new URLSearchParams(location.search).get('v') ?? '', 10);
    return v >= 1 && v <= VARIANTS.length ? v - 1 : 0;
  });
  const [ready, setReady] = useState(false);
  const [phone, setPhone] = useState(() => matchMedia('(max-width: 860px)').matches);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const highlight = useRef<HTMLSpanElement>(null);

  const setActive = (i: number) => {
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
    const url = new URL(location.href);
    url.searchParams.set('v', String(i + 1));
    history.replaceState(null, '', url);
  };

  useLayoutEffect(() => { document.documentElement.dataset.proto = VARIANTS[current]!.key; }, [current]);

  useLayoutEffect(() => {
    const move = () => {
      const el = items.current[current];
      if (!el || !highlight.current) return;
      highlight.current.style.width = `${el.offsetWidth}px`;
      highlight.current.style.transform = `translateX(${el.offsetLeft}px)`;
    };
    move();
    window.addEventListener('resize', move);
    return () => window.removeEventListener('resize', move);
  }, [current]);

  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => setReady(true))); }, []);

  useEffect(() => {
    const mq = matchMedia('(max-width: 860px)');
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= VARIANTS.length) setActive(n - 1);
      else if (e.key === 'ArrowRight') setActive((current + 1) % VARIANTS.length);
      else if (e.key === 'ArrowLeft') setActive((current - 1 + VARIANTS.length) % VARIANTS.length);
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [current]);

  const V = VARIANTS[current]!;
  // The Rail turns into a bottom tab bar on a phone, so the picker moves to the top there.
  const top = V.key === 'rail' && phone;
  return (
    <>
      <Portal key={V.key} Frame={V.Shell} />
      <nav className="proto-picker" aria-label="Prototype variants" data-ready={ready || undefined} data-position={top ? 'top' : undefined}>
        <span className="proto-picker-highlight" aria-hidden="true" ref={highlight} />
        {VARIANTS.map((v, i) => (
          <button
            key={v.key}
            ref={(el) => { items.current[i] = el; }}
            className="proto-picker-item"
            data-active={i === current || undefined}
            aria-current={i === current ? 'true' : undefined}
            onClick={() => setActive(i)}
          >
            {v.name}
          </button>
        ))}
      </nav>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <Harness />
    </SessionProvider>
  </StrictMode>
);
