/* Access: a placeholder. The roles table is real (security/rls-policies.yaml); granting is not built.
   The rule it will follow: roles come from directory groups, people get values, custom groups grant nothing. */
import { useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, Icon, Notice, PageHeader, Tabs } from '../ds';
import { humanize, roles } from '../shell/data';

type Tab = 'roles' | 'people' | 'requests' | 'audit';

export function Access() {
  const [tab, setTab] = useState<Tab>('roles');
  return (
    <div className="shell-page" data-narrow>
      <PageHeader title="Access" description="Who can open what, and which rows they see." />

      <Notice icon={<Icon.Construction size={16} />}>
        <strong className="ds-label">Placeholder.</strong> The roles below are real. Granting access comes next.
      </Notice>

      <Card className="acc-grant">
        <div className="ds-card__body acc-grant__body">
          <div>
            <h2 className="ds-h2">Grant access</h2>
            <p className="ds-muted" style={{ margin: '4px 0 0' }}>Give a person the values they may see, such as a branch or a region. Their role comes from their directory group.</p>
          </div>
          <div className="acc-grant__fields">
            <Field id="acc-person" label="Person" filled disabled placeholder="name@bank" />
            <Field id="acc-values" label="Values" filled disabled placeholder="Pick from the list" />
          </div>
        </div>
        <div className="ds-card__footer ds-small">
          <span style={{ flex: 1 }}>A second person approves every grant before it takes effect.</span>
          <Button variant="primary" disabled>Grant</Button>
        </div>
      </Card>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { key: 'roles', label: <>Roles <span className="ds-faint">{roles.length}</span></> },
          { key: 'people', label: 'People' },
          { key: 'requests', label: 'Requests' },
          { key: 'audit', label: 'Audit log' },
        ]}
      />

      <Card className="acc-panel">
        {tab === 'roles' ? (
          roles.length === 0 ? (
            <EmptyState icon={<Icon.ShieldCheck size={18} />} title="No roles yet">Roles show here once security/rls-policies.yaml exists.</EmptyState>
          ) : (
            <div className="acc-table-wrap">
              <table className="ds-table">
                <thead><tr><th>Role</th><th>Directory groups</th><th>Sees</th></tr></thead>
                <tbody>
                  {roles.map((r) => (
                    <tr key={r.id}>
                      <td className="ds-label">{humanize(r.id)}</td>
                      <td><span className="acc-groups">{r.groups.map((g) => <Badge key={g}><span className="ds-mono">{g}</span></Badge>)}</span></td>
                      <td className="ds-muted">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <EmptyState icon={<Icon.Clock size={18} />} title="Comes with access management">
            {tab === 'people' && 'Everyone with access, their role and the values they were granted.'}
            {tab === 'requests' && 'Grants waiting for a second approver.'}
            {tab === 'audit' && 'Every grant and revoke: who, what, when, and who approved it.'}
          </EmptyState>
        )}
      </Card>
    </div>
  );
}
