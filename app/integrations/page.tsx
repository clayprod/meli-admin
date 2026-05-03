import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { SyncButton } from "@/components/integrations/sync-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionForPage } from "@/lib/auth/session";
import { getIntegrationOverview } from "@/lib/db/integration-queries";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const session = await requireSessionForPage();
  const overview = await getIntegrationOverview(session.orgId);
  const meliConnections = overview.connections.filter((connection) => connection.provider === "MERCADO_LIVRE");
  const mpConnections = overview.connections.filter((connection) => connection.provider === "MERCADO_PAGO");

  return (
    <AppShell
      currentPath="/integrations"
      title="Integracoes e sincronizacao"
      description="Centro de conexao OAuth, sincronizacao de listings reais, promocoes, ads e conciliacao do Mercado Pago."
      userEmail={session.email}
    >
      <div className="grid gap-6">
        <section className="grid gap-4 xl:grid-cols-4">
          <StatusCard label="Listings reais" value={String(overview.listingCount)} helper="Itens sincronizados do seller" />
          <StatusCard label="Promocoes" value={String(overview.promotionCount)} helper="Campanhas e ofertas mapeadas" />
          <StatusCard label="Metricas de ads" value={String(overview.adMetricCount)} helper="Linhas diarias de performance" />
          <StatusCard label="Pagamentos" value={String(overview.paymentCount)} helper="Lancamentos conciliados do MP" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Checklist de ambiente</CardTitle>
              <CardDescription>
                O app suporta OAuth real e, no caso do Mercado Pago, tambem modo direto via access token da conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <EnvRow label="PUBLIC_APP_URL" ok={overview.envStatus.publicAppUrl} />
              <EnvRow label="INTEGRATIONS_SECRET" ok={overview.envStatus.integrationSecret} />
              <EnvRow label="Mercado Livre OAuth" ok={overview.envStatus.mercadoLivre} />
              <EnvRow label="Mercado Pago (OAuth ou token)" ok={overview.envStatus.mercadoPago} />
              <EnvRow label="Mercado Pago token direto" ok={overview.envStatus.mercadoPagoDirectToken} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conexoes ativas</CardTitle>
              <CardDescription>
                Cada conexao guarda token criptografado, refresh token, status e ultimo sync para leitura da operacao real.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <ProviderCard
                title="Mercado Livre"
                description="Itens, fotos, video, estoque, promocoes e Product Ads."
                connections={meliConnections}
                connectHref="/api/integrations/mercadolivre/connect"
                syncButtons={[
                  <SyncButton key="meli-listings" endpoint="/api/integrations/mercadolivre/sync" payload={{ resource: "listings" }} label="Sincronizar listings" />,
                  <SyncButton key="meli-promotions" endpoint="/api/integrations/mercadolivre/sync" payload={{ resource: "promotions" }} label="Sincronizar promocoes" />,
                  <SyncButton key="meli-ads" endpoint="/api/integrations/mercadolivre/sync" payload={{ resource: "ads", days: 14 }} label="Sincronizar Product Ads" />,
                ]}
              />
              <ProviderCard
                title="Mercado Pago"
                description="Pagamentos, fees, net received, chargebacks e conciliacao. Pode funcionar por OAuth ou access token direto."
                connections={mpConnections}
                connectHref="/api/integrations/mercadopago/connect"
                syncButtons={[
                  <SyncButton key="mp-payments" endpoint="/api/integrations/mercadopago/sync" payload={{ days: 30 }} label="Sincronizar pagamentos" />,
                ]}
              />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks configuraveis</CardTitle>
              <CardDescription>Use estes endpoints nas apps oficiais para acompanhamento quase em tempo real.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p><code>/api/webhooks/mercadolivre</code> para items, orders, shipments e questions.</p>
              <p><code>/api/webhooks/mercadopago</code> para payments, merchant_orders e chargebacks.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Leituras suportadas</CardTitle>
              <CardDescription>O app ja esta preparado para preencher a camada de decisao comercial.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>- itens reais e metadata de listing</p>
              <p>- promocoes seller / coupons / ofertas</p>
              <p>- metricas de Product Ads: clicks, prints, cost, ACOS, ROAS</p>
              <p>- pagamentos e valor liquido recebido</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Proximas ligacoes</CardTitle>
              <CardDescription>Navegue para os modulos especializados e trabalhe em cima dos dados reais.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild variant="secondary"><Link href="/listings">Abrir listings</Link></Button>
              <Button asChild variant="outline"><Link href="/promotions">Ver promocoes</Link></Button>
              <Button asChild variant="outline"><Link href="/advertising">Ver ads</Link></Button>
              <Button asChild variant="outline"><Link href="/finance">Ver financeiro</Link></Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}

function StatusCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500">{helper}</p>
      </CardContent>
    </Card>
  );
}

function EnvRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="font-medium text-slate-700">{label}</span>
      <Badge tone={ok ? "success" : "warning"}>{ok ? "ok" : "pendente"}</Badge>
    </div>
  );
}

function ProviderCard({
  title,
  description,
  connections,
  connectHref,
  syncButtons,
}: {
  title: string;
  description: string;
  connections: Array<{ id: string; accountLabel: string; status: string; lastSyncedAt: Date | null; lastSyncStatus: string | null }>;
  connectHref: string;
  syncButtons: React.ReactNode[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-slate-950">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <Button asChild size="sm">
          <Link href={connectHref}>Conectar</Link>
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {connections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
            Nenhuma conta conectada ainda.
          </div>
        ) : (
          connections.map((connection) => (
            <div key={connection.id} className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{connection.accountLabel}</p>
                  <p className="text-xs text-slate-500">
                    Ultimo sync: {connection.lastSyncedAt ? connection.lastSyncedAt.toLocaleString("pt-BR") : "nunca"}
                  </p>
                </div>
                <Badge tone={connection.status === "ACTIVE" ? "success" : "warning"}>{connection.status}</Badge>
              </div>
              {connection.lastSyncStatus ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  {connection.lastSyncStatus === "success" ? <CheckCircle2 className="size-3.5 text-green-600" /> : <CircleAlert className="size-3.5 text-amber-600" />}
                  <span>Ultimo resultado: {connection.lastSyncStatus}</span>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">{syncButtons}</div>
    </div>
  );
}
