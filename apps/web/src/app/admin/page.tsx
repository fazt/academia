"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CircleDollarSign,
  MessageCircleQuestion,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/admin/badges";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className={cn("h-full gap-3 transition-colors", href && "hover:border-primary/40", highlight && "border-amber-500/40")}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardAction>
          <span className={cn("grid size-8 place-items-center rounded-lg bg-primary/10 text-primary", highlight && "bg-amber-500/10 text-amber-600 dark:text-amber-400")}>
            <Icon className="size-4" />
          </span>
        </CardAction>
        <CardTitle className="font-heading text-2xl font-bold tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint && <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>}
    </Card>
  );
  return href ? (
    <Link href={href} className="rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}

export default function AdminDashboardPage() {
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => call(api.admin.stats.$get()) });
  const data = stats.data;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Panel"
        description="Resumen de ventas, alumnos y actividad de la academia."
        actions={
          <Button asChild>
            <Link href="/admin/cursos/nuevo">Nuevo curso</Link>
          </Button>
        }
      />

      {stats.isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
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

      <Card>
        <CardHeader>
          <CardTitle>Ingresos de los últimos 30 días</CardTitle>
          <CardDescription>Importe cobrado por día (órdenes pagadas).</CardDescription>
        </CardHeader>
        <CardContent>
          {data ? <RevenueChart series={data.series} currency={data.currency} /> : <Skeleton className="h-56 w-full" />}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cursos más vendidos</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/cursos">
                  Ver cursos <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {!data ? (
              <Skeleton className="h-40 w-full" />
            ) : data.topCourses.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay ventas.</p>
            ) : (
              <ol className="space-y-3">
                {data.topCourses.map((course, index) => {
                  const maxSales = data.topCourses[0]?.sales || 1;
                  return (
                    <li key={course.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <Link href={`/admin/cursos/${course.id}`} className="min-w-0 truncate font-medium hover:text-primary">
                          <span className="mr-2 text-muted-foreground tabular-nums">{index + 1}.</span>
                          {course.title}
                        </Link>
                        <span className="shrink-0 text-muted-foreground tabular-nums">
                          {course.sales} · {money(course.revenueCents, data.currency)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-chart-1" style={{ width: `${(course.sales / maxSales) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Órdenes recientes</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/ordenes">
                  Ver órdenes <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {!data ? (
              <Skeleton className="h-40 w-full" />
            ) : data.recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay órdenes.</p>
            ) : (
              <ul className="divide-y">
                {data.recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/admin/ordenes/${order.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{order.user.name}</span>
                        <span className="block text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="tabular-nums">{money(order.totalCents, order.currency)}</span>
                        <OrderStatusBadge status={order.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
