import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionForPage } from "@/lib/auth/session";
import { getFinanceOverview } from "@/lib/db/integration-queries";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const session = await requireSessionForPage();
  const overview = await getFinanceOverview(session.orgId);

  return (
    <AppShell
      currentPath="/finance"
      title="Conciliacao financeira"
      description="Cruze pagamentos reais do Mercado Pago com listings e produtos internos para validar a margem realizada."
      userEmail={session.email}
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FinanceCard label="Bruto transacionado" value={formatCurrency(overview.totals?.transactionAmount ?? 0)} />
          <FinanceCard label="Liquido recebido" value={formatCurrency(overview.totals?.netReceivedAmount ?? 0)} />
          <FinanceCard label="Fee marketplace" value={formatCurrency(overview.totals?.marketplaceFeeAmount ?? 0)} />
          <FinanceCard label="Fee Mercado Pago" value={formatCurrency(overview.totals?.mercadopagoFeeAmount ?? 0)} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Pagamentos conciliados</CardTitle>
            <CardDescription>
              A leitura usa `payments/search` e cruza `external_reference` com listings sincronizados sempre que houver correspondencia.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden rounded-3xl border border-slate-200 p-0">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Payment</th>
                  <th className="px-5 py-4 font-medium">Listing / Produto</th>
                  <th className="px-5 py-4 font-medium">Bruto</th>
                  <th className="px-5 py-4 font-medium">Liquido</th>
                  <th className="px-5 py-4 font-medium">Fees</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {overview.payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-slate-100 text-slate-700">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-950">{payment.paymentId}</p>
                      <p className="text-xs text-slate-500">{payment.externalReference ?? "Sem external reference"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p>{payment.listingTitle ?? "Sem listing vinculado"}</p>
                      <p className="text-xs text-slate-500">{payment.productName ?? "Sem produto interno"}</p>
                    </td>
                    <td className="px-5 py-4">{formatCurrency(payment.transactionAmount)}</td>
                    <td className="px-5 py-4">{formatCurrency(payment.netReceivedAmount ?? 0)}</td>
                    <td className="px-5 py-4">
                      ML {formatCurrency(payment.marketplaceFeeAmount ?? 0)} / MP {formatCurrency(payment.mercadopagoFeeAmount ?? 0)}
                    </td>
                    <td className="px-5 py-4">{payment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function FinanceCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
