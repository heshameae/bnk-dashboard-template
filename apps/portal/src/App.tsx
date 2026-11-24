/* The portal: the shell, and one page per route. */
import { EmptyState, Icon, LinkButton } from './ds';
import { canOpen, type Page } from './shell/access';
import { dashboardById } from './shell/data';
import { href, useRoute, type Route } from './shell/router';
import { SessionProvider, useSession } from './shell/session';
import { Shell, type Top } from './shell/Shell';
import { Access } from './pages/Access';
import { AnalyticsPage, AnalyticsPicker, DashboardSwitch } from './pages/Analytics';
import { Catalog } from './pages/Catalog';
import { DashboardInfo, DashboardPage } from './pages/DashboardPage';
import { Home } from './pages/Home';
import { ModelExplorer } from './ModelExplorer';
import './pages/pages.css';

export default function App() {
  return (
    <SessionProvider>
      <Portal />
    </SessionProvider>
  );
}

const scope = (label: string, to?: string) =>
  to ? <a className="shell-scope ds-label" href={to}><Icon.ArrowLeft size={16} />{label}</a> : <span className="shell-scope ds-label">{label}</span>;

function Portal() {
  const route = useRoute();
  const { viewer } = useSession();
  const { active, top, body, full } = view(route);

  // The Eng. team's pages say so to anyone else, rather than pretending not to exist.
  const blocked = active && !canOpen(viewer, active);
  return (
    <Shell active={active} top={top} full={full && !blocked}>
      {blocked ? (
        <div className="shell-page">
          <EmptyState icon={<Icon.Lock size={18} />} title="Eng. team only" action={<LinkButton href={href.home}>Back to dashboards</LinkButton>}>
            Switch “view as” to Eng. team to open this page.
          </EmptyState>
        </div>
      ) : body}
    </Shell>
  );
}

function view(route: Route): { active: Page | null; top: Top; body: React.ReactNode; full?: boolean } {
  switch (route.page) {
    case 'home':
      return { active: 'home', top: { scope: scope('All dashboards'), title: 'Overview' }, body: <Home /> };
    case 'dashboard': {
      const d = dashboardById(route.id);
      if (!d) return notFound();
      return { active: 'home', top: { scope: scope('Dashboards', href.home), title: d.title, actions: <DashboardInfo key={d.id} d={d} /> }, body: <DashboardPage key={d.id} d={d} />, full: true };
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
