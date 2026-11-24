// Throwaway harness: the real portal, with the Analytics page swapped for one of two variants by the picker.
// Wide was chosen. What is left to settle is its second card: a weekday-by-hour heatmap, or the weekday bars it had.
// (The other variants from both rounds are still in this folder, unused.)
// Every other page is the real one, so each variant is judged inside the real shell. Imported by nothing.
import { Fragment, StrictMode, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { EmptyState, Icon, LinkButton } from '../../src/ds';
import { canOpen, dashboardsFor, type Page } from '../../src/shell/access';
import { dashboardById, type Dashboard } from '../../src/shell/data';
import { href, useRoute, type Route } from '../../src/shell/router';
import { SessionProvider, useSession } from '../../src/shell/session';
import { Shell, type Top } from '../../src/shell/Shell';
import { Access } from '../../src/pages/Access';
import { Catalog } from '../../src/pages/Catalog';
import { DashboardInfo, DashboardPage } from '../../src/pages/DashboardPage';
import { Home } from '../../src/pages/Home';
import { ModelExplorer } from '../../src/ModelExplorer';
import '../../src/pages/pages.css';
import './picker.css';
import './analytics.css';
import { NoDashboards, ProtoCtx, type Proto } from './parts';
import { extras, marksFor, personsFor, statsFor, todayFor, type Range } from './usage';
import { Wide } from './Wide';

const WithHeatmap = ({ d }: { d: Dashboard }) => <Wide d={d} when="heat" />;
const WithBars = ({ d }: { d: Dashboard }) => <Wide d={d} when="bars" />;
const VARIANTS = [
  { key: 'heat', name: 'Heatmap', Page: WithHeatmap },
  { key: 'bars', name: 'Bars', Page: WithBars },
] as const;
type Variant = (typeof VARIANTS)[number]['key'];

type View = { active: Page | null; top: Top; body: ReactNode; full?: boolean };
const scope = (label: string, to?: string) =>
  to ? <a className="shell-scope ds-label" href={to}><Icon.ArrowLeft size={16} />{label}</a> : <span className="shell-scope ds-label">{label}</span>;
const notFound = (): View => ({
  active: null,
  top: { title: 'Not found' },
  body: (
    <div className="shell-page">
      <EmptyState icon={<Icon.SearchX size={18} />} title="Nothing lives at this address" action={<LinkButton href={href.analytics()}>Back to Analytics</LinkButton>} />
    </div>
  ),
});

/** The Analytics route. Every variant is one page about one dashboard: the one in the address, else the last one this viewer opened, else the first. */
function analytics(v: Variant, id: string | undefined, p: Proto, recent: string[]): View {
  const d = id ? p.list.find((x) => x.id === id) : undefined;
  if (id && !d) return notFound();
  const on = d ?? recent.map((r) => p.list.find((x) => x.id === r)).find(Boolean) ?? p.list[0];
  if (!on) return { active: 'analytics', top: { title: 'Analytics' }, body: <div className="shell-page pa-narrow"><NoDashboards /></div> };
  const { Page } = VARIANTS.find((x) => x.key === v)!;
  const open = <LinkButton variant="tertiary" href={href.dashboard(on.id)}>Open dashboard<Icon.ArrowUpRight size={14} /></LinkButton>;
  return { active: 'analytics', top: { title: 'Analytics', actions: p.recorded ? open : undefined }, body: <Page key={on.id} d={on} /> };
}

/** Every other route: the real pages, as src/App.tsx maps them. */
function real(route: Exclude<Route, { page: 'analytics' }>): View {
  switch (route.page) {
    case 'home':
      return { active: 'home', top: { scope: scope('All dashboards'), title: 'Overview' }, body: <Home /> };
    case 'dashboard': {
      const d = dashboardById(route.id);
      if (!d) return notFound();
      return { active: 'home', top: { scope: scope('Dashboards', href.home), title: d.title, actions: <DashboardInfo key={d.id} d={d} /> }, body: <DashboardPage key={d.id} d={d} />, full: true };
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

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

function Harness() {
  const route = useRoute();
  const { viewer, recent } = useSession();
  const [current, setCurrent] = useState(() => {
    const v = parseInt(new URLSearchParams(location.search).get('v') ?? '', 10);
    return v >= 1 && v <= VARIANTS.length ? v - 1 : 0;
  });
  const [ready, setReady] = useState(false);
  const [range, setRange] = useState<Range>(30);
  const [recorded, setRecorded] = useState(true);
  const [many, setMany] = useState(false);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const highlight = useRef<HTMLSpanElement>(null);

  const setActive = (i: number) => {
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
    const url = new URL(location.href);
    url.searchParams.set('v', String(i + 1));
    history.replaceState(null, '', url);
  };

  // The portal's real dashboards. "Many" adds made-up ones, to see each design at sixty.
  const list = useMemo<Dashboard[]>(() => {
    const mine = dashboardsFor(viewer);
    return many ? [...mine, ...extras(mine, 60 - mine.length)] : mine;
  }, [viewer, many]);
  const place = useMemo(() => new Map(list.map((d, i) => [d.id, i])), [list]);
  const proto = useMemo<Proto>(() => {
    const at = (id: string) => { const i = place.get(id)!; return [list[i]!, i] as const; };
    return {
      list, range, setRange, recorded,
      stat: (id) => statsFor(...at(id), range),
      persons: (id) => personsFor(...at(id), range),
      today: (id) => todayFor(...at(id)),
      marks: (id) => marksFor(...at(id), range),
    };
  }, [list, place, range, recorded]);

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

  // Today's page puts the cursor in its search field. Let go of it, so the number keys keep flipping variants.
  useEffect(() => { const t = setTimeout(() => (document.activeElement as HTMLElement | null)?.blur?.()); return () => clearTimeout(t); }, [current]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= VARIANTS.length) setActive(n - 1);
      else if (e.key === 'ArrowRight') setActive((current + 1) % VARIANTS.length);
      else if (e.key === 'ArrowLeft') setActive((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (e.key === 'e' || e.key === 'E') setRecorded((r) => !r);
      else if (e.key === 'm' || e.key === 'M') setMany((m) => !m);
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [current]);

  const v = VARIANTS[current]!;
  const { active, top, body, full } = route.page === 'analytics' ? analytics(v.key, route.id, proto, recent) : real(route);
  const blocked = active && !canOpen(viewer, active);

  return (
    <ProtoCtx.Provider value={proto}>
      <Shell active={active} top={top} full={full && !blocked}>
        {blocked ? (
          <div className="shell-page">
            <EmptyState icon={<Icon.Lock size={18} />} title="Eng. team only" action={<LinkButton href={href.home}>Back to dashboards</LinkButton>}>
              Switch “view as” to Eng. team to open this page.
            </EmptyState>
          </div>
        ) : (
          <Fragment key={v.key}>{body}</Fragment>
        )}
      </Shell>

      <div className="pa-harness">
        <button onClick={() => setMany((m) => !m)}>{many ? 'Show the 12 real dashboards' : 'Show 60 dashboards'} <kbd>M</kbd></button>
        <button onClick={() => setRecorded((r) => !r)}>{recorded ? 'Show today: nothing recorded' : 'Show made-up usage'} <kbd>E</kbd></button>
      </div>

      <nav className="proto-picker" aria-label="Prototype variants" data-ready={ready || undefined}>
        <span className="proto-picker-highlight" aria-hidden="true" ref={highlight} />
        {VARIANTS.map((x, i) => (
          <button
            key={x.key}
            ref={(el) => { items.current[i] = el; }}
            className="proto-picker-item"
            data-active={i === current || undefined}
            aria-current={i === current ? 'true' : undefined}
            onClick={() => setActive(i)}
          >
            {x.name}
          </button>
        ))}
      </nav>
    </ProtoCtx.Provider>
  );
}

// The harness is about Analytics, so it opens there whatever address it was given.
if (!location.hash.startsWith('#/analytics')) history.replaceState(null, '', `${location.pathname}${location.search}#/analytics`);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <Harness />
    </SessionProvider>
  </StrictMode>
);
