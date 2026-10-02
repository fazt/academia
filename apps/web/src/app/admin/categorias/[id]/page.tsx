"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { AdminPageSkeleton } from "@/components/admin/admin-shell";
import { CategoryForm } from "@/components/admin/category-form";
import { NotFoundState } from "@/components/admin/not-found-state";
import { api, call } from "@/lib/api";

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>();
  const category = useQuery({
    queryKey: ["admin", "category", id],
    queryFn: () => call(api.admin.categories[":id"].$get({ param: { id } })),
  });

  if (category.isLoading) return <AdminPageSkeleton />;
  if (!category.data) {
    return <NotFoundState error={category.error} title="Categoría no encontrada" backHref="/admin/categorias" backLabel="Volver a categorías" />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Editar categoría" description={category.data.name} backHref="/admin/categorias" backLabel="Categorías" />
      <CategoryForm categoryId={id} initial={{ name: category.data.name, slug: category.data.slug }} />
    </div>
  );
}
