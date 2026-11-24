/* Who sees what in the shell. One file, so the rules are read in one place.
   This is navigation only. Which ROWS a person sees is RLS, applied in packages/semantic-query
   and nowhere else; the shell never filters data. */
import { dashboards, recipes, type Dashboard, type Recipe } from './data';

export type Viewer = { id: string; label: string; eng: boolean };

export const ENG: Viewer = { id: 'eng', label: 'Eng. team', eng: true };

export type Page = 'home' | 'dashboard' | 'analytics' | 'catalog' | 'access' | 'model';

/** The Eng. team's tools are hidden from business viewers. Access is a placeholder, Eng. team only until its owners are named. */
export const canOpen = (v: Viewer, page: Page) => v.eng || !['access', 'model'].includes(page);

/** Which role opens which dashboard is not decided yet (no contract holds it), so every viewer sees every dashboard for now. */
export const dashboardsFor = (_v: Viewer): Dashboard[] => dashboards;

/** A business viewer sees the numbers on the dashboards they can open; the Eng. team sees every recipe. */
export const recipesFor = (v: Viewer): Recipe[] => {
  if (v.eng) return recipes;
  const open = new Set(dashboardsFor(v).map((d) => d.id));
  return recipes.filter((r) => r.dashboards.some((d) => open.has(d)));
};
