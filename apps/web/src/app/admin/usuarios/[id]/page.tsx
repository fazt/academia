"use client";

import type { UserRole } from "@academia/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, GraduationCap, Plus, Receipt, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { AdminPageSkeleton } from "@/components/admin/admin-shell";
import { OrderStatusBadge, StatusPill } from "@/components/admin/badges";
import { ConfirmAction } from "@/components/admin/confirm-button";
import { CopyEmail } from "@/components/admin/data-table";
import { money } from "@/components/admin/money";
import { NotFoundState } from "@/components/admin/not-found-state";
import { useAdminOptions } from "@/components/admin/use-admin-options";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, call, errorMessage } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { formatDate, formatDateTime } from "@/lib/format";

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const options = useAdminOptions();
  const [role, setRole] = useState<UserRole | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [grantCourseId, setGrantCourseId] = useState<string>("");
  const [granting, setGranting] = useState(false);

  const user = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: () => call(api.admin.users[":id"].$get({ param: { id } })),
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "user", id] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
    ]);

  if (user.isLoading) return <AdminPageSkeleton />;
  if (!user.data) {
    return <NotFoundState error={user.error} title="Usuario no encontrado" backHref="/admin/usuarios" backLabel="Volver a usuarios" />;
  }

  const data = user.data;
  const isSelf = session?.user.id === data.id;
  const selectedRole = role ?? data.role;
  const enrolledIds = new Set(data.enrollments.map((e) => e.courseId));
  const grantable = (options.data?.courses ?? []).filter((c) => !enrolledIds.has(c.id));

  const saveRole = async () => {
    setSavingRole(true);
    try {
      await call(api.admin.users[":id"].role.$patch({ param: { id }, json: { role: selectedRole } }));
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["admin", "options"] });
      setRole(null);
      toast.success("Rol actualizado");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingRole(false);
    }
  };

  const grant = async () => {
    if (!grantCourseId) return;
    setGranting(true);
    try {
      await call(api.admin.users[":id"].enrollments.$post({ param: { id }, json: { courseId: grantCourseId } }));
      await refresh();
      setGrantCourseId("");
      toast.success("Acceso concedido");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setGranting(false);
    }
  };

  const revoke = async (courseId: string) => {
    try {
      await call(api.admin.users[":id"].enrollments[":courseId"].$delete({ param: { id, courseId } }));
      await refresh();
      toast.success("Acceso revocado");
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader backHref="/admin/usuarios" backLabel="Usuarios" title="Ficha de usuario" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <Card>
          <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <UserAvatar name={data.name} image={data.image} className="size-16 text-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-xl font-bold">{data.name}</h2>
                {data.role === "admin" ? <StatusPill tone="primary">Administrador</StatusPill> : <StatusPill>Alumno</StatusPill>}
                {!data.emailVerified && <StatusPill tone="warning">Email sin verificar</StatusPill>}
              </div>
              <CopyEmail email={data.email} className="text-sm text-muted-foreground" />
              {data.headline && <p className="text-sm">{data.headline}</p>}
              {data.bio && <p className="text-sm whitespace-pre-line text-muted-foreground">{data.bio}</p>}
              <p className="text-xs text-muted-foreground">Registrado el {formatDate(data.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" /> Rol
            </CardTitle>
            <CardDescription>Los administradores acceden a este panel y pueden ser instructores.</CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="role">Rol del usuario</FieldLabel>
              <Select value={selectedRole} onValueChange={(v) => setRole(v as UserRole)} disabled={isSelf}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Alumno</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              {isSelf && <FieldDescription>No puedes cambiar tu propio rol.</FieldDescription>}
            </Field>
          </CardContent>
          <CardFooter className="justify-end border-t">
            <Button onClick={saveRole} disabled={isSelf || selectedRole === data.role || savingRole}>
              {savingRole && <Spinner />} Guardar rol
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="size-4" /> Cursos inscritos ({data.enrollments.length})
          </CardTitle>
          <CardDescription>Puedes dar acceso manual a un curso (becas, regalos, soporte) o revocarlo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={grantCourseId} onValueChange={setGrantCourseId}>
              <SelectTrigger className="w-full sm:max-w-md" aria-label="Curso para dar acceso">
                <SelectValue placeholder={grantable.length ? "Elige un curso…" : "Ya tiene todos los cursos"} />
              </SelectTrigger>
              <SelectContent>
                {grantable.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={grant} disabled={!grantCourseId || granting} variant="outline">
              {granting ? <Spinner /> : <Plus />} Dar acceso
            </Button>
          </div>
          {data.enrollments.length === 0 ? (
            <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              No está inscrito en ningún curso.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {data.enrollments.map((enrollment) => (
                <li key={enrollment.courseId} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/cursos/${enrollment.courseId}`} className="truncate font-medium hover:text-primary">
                      {enrollment.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Desde el {formatDate(enrollment.enrolledAt)} · {enrollment.orderId ? "Compra" : "Acceso manual o gratuito"}
                    </p>
                  </div>
                  <ConfirmAction
                    destructive
                    title="¿Revocar el acceso?"
                    description={`${data.name} dejará de ver «${enrollment.title}». Si lo compró, considera reembolsar la orden.`}
                    confirmLabel="Revocar"
                    onConfirm={() => revoke(enrollment.courseId)}
                    trigger={
                      <Button size="sm" variant="ghost">
                        <Trash2 /> Revocar
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 pb-0">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-4" /> Órdenes ({data.orders.length})
          </CardTitle>
        </CardHeader>
        {data.orders.length === 0 ? (
          <CardContent className="pb-6">
            <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">Sin órdenes.</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Orden</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="pr-6">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="pl-6 font-mono text-xs">
                    <Link href={`/admin/ordenes/${order.id}`} className="hover:text-primary">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(order.totalCents, order.currency)}</TableCell>
                  <TableCell className="pr-6 text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
