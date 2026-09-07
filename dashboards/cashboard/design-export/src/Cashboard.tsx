// Exported by Open Design. Kit components carry the recipe id the designer picked from the Catalog.
import { Page, Filters, KpiCard, LineChart, BarChart } from '@bank/chart-kit';

export default function Cashboard() {
  return (
    <Page title="Cash position">
      <Filters dimensions={['branch_code', 'customer_segment']} />
      <KpiCard kpi="kpi.casa_balance" show={['value', 'compare']} />
      <LineChart kpi="kpi.casa_balance" by="snapshot_date" range="last_90_business_days" />
      <BarChart kpi="kpi.casa_balance" by="customer_segment" sort="desc" onClick="filter" />
      <KpiCard kpi="kpi.casa_accounts" />
      <KpiCard label="Avg daily net inflow" />
    </Page>
  );
}
