/* How a dashboard's and a number's state reads on screen. One place, so every page agrees. */
import { Badge } from '../ds';
import type { Dashboard, Recipe } from '../shell/data';

export function DashboardBadge({ d }: { d: Dashboard }) {
  if (d.status === 'BLOCKED') return <Badge tone="amber" title="A widget has no recipe yet">Blocked</Badge>;
  if (d.status === 'IN_PROGRESS') return <Badge title="No spec yet: somewhere in steps 2 to 8">In progress</Badge>;
  return d.verified ? <Badge tone="green">Live</Badge> : <Badge tone="blue" title="Spec ready, not verified yet">In review</Badge>;
}

export function RecipeBadge({ r }: { r: Recipe }) {
  return r.status === 'DRAFT'
    ? <Badge tone="blue" title="The business has not confirmed this meaning yet">Draft</Badge>
    : <Badge tone="green">Confirmed</Badge>;
}
