"use client";

import { AdminPageHeader } from "@/components/admin/admin-page";
import { CourseForm } from "@/components/admin/course-form";

export default function NewCoursePage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Nuevo curso"
        description="Empieza por la información básica. Después podrás añadir secciones, capítulos y videos."
        backHref="/admin/cursos"
        backLabel="Cursos"
      />
      <CourseForm />
    </div>
  );
}
