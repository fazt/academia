"use client";

import { AdminPageHeader } from "@/components/admin/admin-page";
import { CategoryForm } from "@/components/admin/category-form";

export default function NewCategoryPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Nueva categoría" command="touch categorias/nueva" backHref="/admin/categorias" backLabel="Categorías" />
      <CategoryForm />
    </div>
  );
}
