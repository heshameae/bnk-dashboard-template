/* One dashboard. The portal draws only the frame: its title, state and freshness, and the slot the
   dashboard's own app loads into. Dashboards are separate apps; their pages are not designed here. */
import { useEffect } from 'react';
import { Card, EmptyState, Icon, Notice } from '../ds';
import { humanize, recipeById, type Dashboard } from '../shell/data';
import { href } from '../shell/router';
import { useSession } from '../shell/session';
import { DashboardBadge, RecipeBadge } from './status';

export function DashboardPage({ d }: { d: Dashboard }) {
  const { touch } = useSession();
  useEffect(() => touch(d.id), [d.id, touch]);

  const meta: [string, string][] = [
    ['Owner', d.owner ?? 'not given'],
    ['For', d.audience ? humanize(d.audience) : 'not given'],
    ['Refreshes', d.refresh ?? 'not given'],
    ['Data as of', 'not connected'],
  ];

  return (
    <div className="shell-page">
      <div className="dash-head">
        <h1 className="ds-h1">{d.title}</h1>
        <DashboardBadge d={d} />
      </div>
      <dl className="dash-meta">
        {meta.map(([k, v]) => (
          <div key={k}><dt className="ds-small ds-muted">{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>

      <div className="dash-notices">
        {d.blocked.length > 0 && (
          <Notice tone="amber" icon={<Icon.TriangleAlert size={16} />}>
            <strong className="ds-label">{d.blocked.length === 1 ? 'One widget is' : `${d.blocked.length} widgets are`} blocked.</strong>{' '}
            {d.blocked.map((b) => `${b.widget} needs ${b.needs}`).join(' ')}
          </Notice>
        )}
        {d.drafts.length > 0 && (
          <Notice tone="blue" icon={<Icon.Info size={16} />}>
            {d.drafts.length === 1 ? 'One number is' : `${d.drafts.length} numbers are`} still a draft. Its values are a preview until the business confirms the meaning in the <a href={href.catalog('drafts')} className="dash-link">catalog</a>.
          </Notice>
        )}
      </div>

      <Card className="dash-frame">
        <EmptyState icon={<Icon.AppWindow size={18} />} title="The dashboard app loads here">
          Each dashboard is its own app. The portal signs you in, checks you can open it, and passes on who you are. The app draws the page, and every number comes from the query service.
        </EmptyState>
      </Card>

      {d.numbers.length > 0 && (
        <section className="dash-numbers">
          <h2 className="ds-section-title ds-label">Numbers on this dashboard</h2>
          <Card>
            <div className="home-list">
              {d.numbers.map((id) => {
                const r = recipeById(id);
                return (
                  <a key={id} href={href.catalog()} className="home-row home-row--link home-row--wide">
                    <Icon.Hash size={16} className="ds-faint" />
                    <span className="home-row__text">
                      <span className="ds-truncate">{r?.meaning ?? id}</span>
                      <span className="ds-caption ds-faint ds-mono">{id}</span>
                    </span>
                    {r && <RecipeBadge r={r} />}
                  </a>
                );
              })}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
