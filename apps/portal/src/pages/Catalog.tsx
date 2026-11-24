/* The catalog: every number the viewer can reach, in the owner's words. Drafts wait for the business. */
import { useMemo, useState } from 'react';
import { Button, Card, Dialog, EmptyState, Field, Icon, PageHeader, Tabs } from '../ds';
import { recipesFor } from '../shell/access';
import { dashboardById, humanize, type Recipe } from '../shell/data';
import { href } from '../shell/router';
import { useSession } from '../shell/session';
import { RecipeBadge } from './status';

export function Catalog({ show }: { show?: string }) {
  const { viewer } = useSession();
  const [tab, setTab] = useState<'all' | 'drafts'>(show === 'drafts' ? 'drafts' : 'all');
  const [q, setQ] = useState('');
  const [confirming, setConfirming] = useState<Recipe | null>(null);

  const all = recipesFor(viewer);
  const drafts = all.filter((r) => r.status === 'DRAFT');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (tab === 'drafts' ? drafts : all).filter((r) => !s || `${r.meaning} ${r.id} ${r.owner ?? ''}`.toLowerCase().includes(s));
  }, [all, drafts, tab, q]);

  return (
    <div className="shell-page" data-narrow>
      <PageHeader
        title="Catalog"
        description={viewer.eng ? 'Every number, in the words of the person who owns it.' : 'Every number on the dashboards you can open, in the words of the person who owns it.'}
      />

      <div className="cat-bar">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { key: 'all', label: <>All <span className="ds-faint">{all.length}</span></> },
            { key: 'drafts', label: <>Needs confirming <span className="ds-faint">{drafts.length}</span></> },
          ]}
        />
        <Field fieldSize="md" icon={<Icon.Search size={16} />} placeholder="Search numbers" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search numbers" className="cat-search" />
      </div>

      <Card>
        {all.length === 0 ? (
          <EmptyState icon={<Icon.BookOpen size={18} />} title="No numbers yet">Numbers show here once they are drafted in step 3.</EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState title={tab === 'drafts' ? 'Nothing needs confirming' : 'No numbers match'} />
        ) : (
          <div className="home-list">
            {shown.map((r) => (
              <div key={r.id} className="cat-row">
                <div className="cat-row__main">
                  <div className="cat-row__meaning">{r.meaning || <span className="ds-faint">Meaning not given</span>}</div>
                  <div className="cat-row__meta ds-small ds-muted">
                    <span className="ds-mono">{r.id}</span>
                    <span>Owner: {r.owner ? humanize(r.owner) : 'not given'}</span>
                    {r.excludes && <span>Leaves out: {r.excludes}</span>}
                    <span>
                      Used on:{' '}
                      {r.dashboards.length === 0
                        ? 'no dashboard yet'
                        : r.dashboards.map((id, i) => (
                            <span key={id}>{i > 0 && ', '}<a className="dash-link" href={href.dashboard(id)}>{dashboardById(id)?.title ?? id}</a></span>
                          ))}
                    </span>
                  </div>
                </div>
                <div className="cat-row__side">
                  <RecipeBadge r={r} />
                  {r.status === 'DRAFT' && !viewer.eng && <Button size="sm" onClick={() => setConfirming(r)}>Review</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        title="Confirm this number"
        footer={<Button variant="primary" onClick={() => setConfirming(null)}>Close</Button>}
      >
        <blockquote className="cat-quote">{confirming?.meaning}</blockquote>
        <p className="ds-muted" style={{ margin: 0 }}>
          Confirming records your name against this meaning. You can’t confirm from the portal yet. For now, reply on the pull request the Eng. team sends you.
        </p>
      </Dialog>
    </div>
  );
}
