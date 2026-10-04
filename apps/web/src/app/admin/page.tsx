"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CircleDollarSign,
  MessageCircleQuestion,
  Plus,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/admin/badges";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { TermPanel } from "@/components/layout/term";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, call } from "@/lib/api";
import { money } from "@/components/admin/money";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  href,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  highlight?: boolean;
}) {
  const body = (
    <div
      className={cn(
        "flex h-full flex-col gap-3 rounded-[14px] border border-term-border bg-term-surface p-5 transition-colors",
        href && "group-hover:border-term-border-strong group-hover:bg-term-raised",
        highlight && "border-term-num/50 group-hover:border-term-num",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-term text-xs text-term-muted">{label}</span>
        <Icon className={cn("size-4 text-term-muted", highlight && "text-term-num")} />
      </div>
      <span className="font-term text-[28px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">{value}</span>
      {hint && <span className={cn("font-term text-xs text-term-muted", highlight && "text-term-num")}>{hint}</span>}
    </div>
  );
  return href ? (
    <Link href={href} className="group rounded-[14px] focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Enlace "ver todo →" de la barra de un panel. */
function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="shrink-0 text-term-accent hover:underline">
      {children} →
    </Link>
  );
}

export default function AdminDashboardPage() {
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => call(api.admin.stats.$get()) });
  const data = stats.data;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Panel"
        command="academia status"
        description="Resumen de ventas, alumnos y actividad de la academia."
        actions={
          <Button asChild>
            <Link href="/admin/cursos/nuevo">
              <Plus /> nuevo curso
            </Link>
          </Button>
        }
      />

      {stats.isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-[14px]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Kpi
            label="Ingresos totales"
            value={money(data.revenueCents, data.currency)}
            hint={`${formatNumber(data.sales)} ventas desde el inicio`}
            icon={CircleDollarSign}
          />
          <Kpi
            label="Ingresos últimos 30 días"
            value={money(data.revenue30Cents, data.currency)}
            hint={`${formatNumber(data.sales30)} ventas en 30 días`}
            icon={TrendingUp}
          />
          <Kpi label="Ventas" value={formatNumber(data.sales)} hint="Órdenes pagadas" icon={ShoppingBag} href="/admin/ordenes?status=paid" />
          <Kpi label="Alumnos" value={formatNumber(data.students)} hint="Con al menos un curso activo" icon={Users} href="/admin/usuarios" />
          <Kpi label="Cursos publicados" value={formatNumber(data.publishedCourses)} icon={BookOpen} href="/admin/cursos?status=published" />
          <Kpi
            label="Preguntas sin responder"
            value={formatNumber(data.unansweredQuestions)}
            hint={data.unansweredQuestions > 0 ? "Responde a tus alumnos" : "¡Todo al día!"}
            icon={MessageCircleQuestion}
            href="/admin/comentarios?status=unanswered"
            highlight={data.unansweredQuestions > 0}
          />
        </div>
      )}

      <TermPanel title="ingresos --dias=30">
        <div className="flex flex-col gap-4 p-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Ingresos de los últimos 30 días</h2>
            <p className="text-sm text-term-muted">Importe cobrado por día (órdenes pagadas).</p>
          </div>
          {data ? <RevenueChart series={data.series} currency={data.currency} /> : <Skeleton className="h-56 w-full" />}
        </div>
      </TermPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <TermPanel title="cursos --top" aside={<PanelLink href="/admin/cursos">ver cursos</PanelLink>}>
          <div className="flex flex-col gap-4 p-5">
            <h2 className="text-lg font-semibold">Cursos más vendidos</h2>
            {!data ? (
              <Skeleton className="h-40 w-full" />
            ) : data.topCourses.length === 0 ? (
              <p className="py-8 text-center text-sm text-term-muted">Aún no hay ventas.</p>
            ) : (
              <ol className="space-y-3.5">
                {data.topCourses.map((course, index) => {
                  const maxSales = data.topCourses[0]?.sales || 1;
                  return (
                    <li key={course.id} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <Link
                          href={`/admin/cursos/${course.id}`}
                          className="min-w-0 truncate font-medium transition-colors hover:text-term-accent"
                        >
                          <span className="mr-2 font-term text-[13px] text-term-num tabular-nums">{index + 1}.</span>
                          {course.title}
                        </Link>
                        <span className="shrink-0 font-term text-[13px] text-term-muted tabular-nums">
                          {course.sales} · {money(course.revenueCents, data.currency)}
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded bg-term-raised">
                        <div className="h-full rounded bg-chart-1" style={{ width: `${(course.sales / maxSales) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </TermPanel>

        <TermPanel title="ordenes --recientes" aside={<PanelLink href="/admin/ordenes">ver órdenes</PanelLink>}>
          <div className="flex flex-col gap-2 p-5">
            <h2 className="text-lg font-semibold">Órdenes recientes</h2>
            {!data ? (
              <Skeleton className="h-40 w-full" />
            ) : data.recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-term-muted">Aún no hay órdenes.</p>
            ) : (
              <ul className="divide-y divide-term-border">
                {data.recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/admin/ordenes/${order.id}`}
                      className="group flex items-center justify-between gap-3 py-2.5 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium transition-colors group-hover:text-term-accent">
                          {order.user.name}
                        </span>
                        <span className="block font-term text-xs text-term-muted">{formatDateTime(order.createdAt)}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="font-term text-[13px] tabular-nums">{money(order.totalCents, order.currency)}</span>
                        <OrderStatusBadge status={order.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TermPanel>
      </div>
    </div>
  );
}
