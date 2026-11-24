/* How a number's state reads on screen. One place, so every page agrees.
   Dashboards carry no state badge: the portal shows only published ones. */
import { Badge } from '../ds';
import type { Recipe } from '../shell/data';

export function RecipeBadge({ r }: { r: Recipe }) {
  return r.status === 'DRAFT'
    ? <Badge tone="blue" title="The business has not confirmed this meaning yet">Draft</Badge>
    : <Badge tone="green">Confirmed</Badge>;
}
