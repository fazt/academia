/**
 * Datos de demostración: un admin (instructor), un alumno, categorías, cursos con
 * currículo, un cupón, reseñas y preguntas. Solo se ejecuta sobre una base vacía.
 *
 * Si defines SEED_STREAM_UID (uid de un video real de tu cuenta de Stream), todos los
 * capítulos lo usarán y podrás reproducirlos. Sin él, el reproductor mostrará
 * "video no disponible" pero el resto de la plataforma funciona.
 */
import { slugify } from "@academia/shared";
import { count, eq } from "drizzle-orm";
import { env } from "../env";
import { auth } from "../lib/auth";
import { recalcCourseContent, recalcCourseRating, recalcCourseStudents } from "../services/course-stats";
import { db, sqlClient } from "./index";
import {
  categories,
  chapterComments,
  chapterProgress,
  chapters,
  coupons,
  courses,
  enrollments,
  reviews,
  sections,
  user,
} from "./schema";

const STUDENT_EMAIL = "alumno@academia.test";
const STUDENT_PASSWORD = "alumno12345";

async function createUser(email: string, password: string, name: string) {
  const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (existing) return existing.id;
  const result = await auth.api.signUpEmail({ body: { email, password, name } });
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, result.user.id));
  return result.user.id;
}

type SeedCourse = {
  title: string;
  subtitle: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced" | "all";
  priceCents: number;
  category: string;
  status: "draft" | "published";
  outcomes: string[];
  requirements: string[];
  sections: { title: string; chapters: string[] }[];
};

const COURSES: SeedCourse[] = [
  {
    title: "Next.js desde cero: aplicaciones full stack",
    subtitle: "Construye y despliega una aplicación real con App Router, Server Components y base de datos.",
    description:
      "En este curso construirás una aplicación completa paso a paso.\n\nEmpezamos por los fundamentos del App Router, seguimos con la obtención de datos en el servidor, formularios con Server Actions y autenticación, y terminamos desplegando a producción.\n\nCada sección incluye ejercicios y el código fuente para descargar.",
    level: "beginner",
    priceCents: 4999,
    category: "Desarrollo Web",
    status: "published",
    outcomes: [
      "Crear rutas, layouts y páginas dinámicas con el App Router",
      "Obtener datos en el servidor y cachearlos correctamente",
      "Manejar formularios con Server Actions y validación",
      "Desplegar una aplicación Next.js a producción",
    ],
    requirements: ["Conocimientos básicos de JavaScript", "Haber usado React alguna vez (no imprescindible)"],
    sections: [
      { title: "Introducción", chapters: ["Bienvenida al curso", "Qué es Next.js y cuándo usarlo", "Preparando el entorno"] },
      { title: "Rutas y layouts", chapters: ["El sistema de archivos como router", "Layouts anidados", "Rutas dinámicas y parámetros"] },
      { title: "Datos y servidor", chapters: ["Server Components", "Obtener datos con fetch", "Server Actions y formularios"] },
      { title: "Despliegue", chapters: ["Variables de entorno", "Publicar la aplicación"] },
    ],
  },
  {
    title: "TypeScript profesional",
    subtitle: "Tipos avanzados, genéricos y patrones para escribir código mantenible a gran escala.",
    description:
      "Lleva tu TypeScript al siguiente nivel. Veremos el sistema de tipos en profundidad, genéricos, tipos condicionales y mapeados, y cómo modelar dominios reales sin pelearte con el compilador.",
    level: "intermediate",
    priceCents: 3999,
    category: "Programación",
    status: "published",
    outcomes: [
      "Dominar genéricos y restricciones",
      "Usar tipos condicionales, mapeados y de plantilla",
      "Modelar estados con uniones discriminadas",
      "Configurar proyectos TypeScript estrictos",
    ],
    requirements: ["Experiencia con JavaScript moderno", "Conocer lo básico de TypeScript"],
    sections: [
      { title: "Repaso del sistema de tipos", chapters: ["Inferencia y anotaciones", "Uniones e intersecciones"] },
      { title: "Genéricos", chapters: ["Funciones genéricas", "Restricciones con extends", "Genéricos en la práctica"] },
      { title: "Tipos avanzados", chapters: ["Tipos condicionales", "Tipos mapeados", "Uniones discriminadas"] },
    ],
  },
  {
    title: "Docker y despliegues para desarrolladores",
    subtitle: "Contenedores, Docker Compose y despliegue de aplicaciones sin dolores de cabeza.",
    description:
      "Aprende a empaquetar tus aplicaciones en contenedores, orquestar servicios con Docker Compose y desplegarlas en la nube con confianza.",
    level: "intermediate",
    priceCents: 2999,
    category: "DevOps",
    status: "published",
    outcomes: ["Escribir Dockerfiles eficientes", "Orquestar servicios con Compose", "Desplegar contenedores en la nube"],
    requirements: ["Saber usar la terminal", "Tener una aplicación propia para practicar (opcional)"],
    sections: [
      { title: "Fundamentos", chapters: ["Qué es un contenedor", "Imágenes y capas", "Tu primer Dockerfile"] },
      { title: "Docker Compose", chapters: ["Servicios y redes", "Bases de datos en desarrollo"] },
      { title: "Producción", chapters: ["Imágenes multi-stage", "Desplegar en la nube"] },
    ],
  },
  {
    title: "Git y GitHub para principiantes",
    subtitle: "Control de versiones desde cero: commits, ramas y colaboración.",
    description: "Un curso gratuito para perderle el miedo a Git y empezar a colaborar en GitHub.",
    level: "beginner",
    priceCents: 0,
    category: "Herramientas",
    status: "published",
    outcomes: ["Guardar y recuperar versiones de tu código", "Trabajar con ramas", "Colaborar con pull requests"],
    requirements: ["Ninguno"],
    sections: [
      { title: "Primeros pasos", chapters: ["Instalar y configurar Git", "Commits y el historial"] },
      { title: "Ramas y colaboración", chapters: ["Ramas y merges", "GitHub y pull requests"] },
    ],
  },
  {
    title: "Python para análisis de datos",
    subtitle: "Pandas, visualización y limpieza de datos con proyectos reales.",
    description:
      "Aprende a analizar datos con Python: carga, limpieza, transformación y visualización con pandas y matplotlib, trabajando con conjuntos de datos reales.",
    level: "beginner",
    priceCents: 5999,
    category: "Datos e IA",
    status: "published",
    outcomes: ["Manipular datos con pandas", "Limpiar datos reales", "Crear visualizaciones claras"],
    requirements: ["Ninguno: empezamos desde cero"],
    sections: [
      { title: "Python esencial", chapters: ["Variables y tipos", "Listas y diccionarios", "Funciones"] },
      { title: "Pandas", chapters: ["DataFrames", "Filtrar y agrupar", "Limpieza de datos"] },
      { title: "Visualización", chapters: ["Gráficos con matplotlib", "Proyecto final"] },
    ],
  },
  {
    title: "Diseño de interfaces con Figma",
    subtitle: "Del boceto al prototipo: diseña interfaces claras y consistentes.",
    description: "Curso en preparación sobre diseño de interfaces con Figma.",
    level: "all",
    priceCents: 3499,
    category: "Diseño",
    status: "draft",
    outcomes: ["Usar componentes y variantes", "Crear prototipos interactivos"],
    requirements: ["Ninguno"],
    sections: [{ title: "Introducción", chapters: ["Conociendo Figma", "Frames y auto layout"] }],
  },
];

const durationFor = (seed: number) => 180 + ((seed * 7919) % 900);

async function main() {
  const [existing] = await db.select({ value: count() }).from(courses);
  if (existing?.value) {
    console.log("La base de datos ya tiene cursos: no se ejecuta el seed.");
    return;
  }

  const streamUid = process.env.SEED_STREAM_UID || null;

  const adminId = await createUser(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD, "Fazt");
  await db
    .update(user)
    .set({
      role: "admin",
      headline: "Desarrollador de software y educador",
      bio: "Llevo más de diez años creando software y enseñando programación a cientos de miles de estudiantes en español.",
    })
    .where(eq(user.id, adminId));
  const studentId = await createUser(STUDENT_EMAIL, STUDENT_PASSWORD, "Ana Martínez");

  const categoryNames = [...new Set(COURSES.map((c) => c.category))];
  const categoryRows = await db
    .insert(categories)
    .values(categoryNames.map((name) => ({ name, slug: slugify(name) })))
    .returning();

  let chapterSeed = 1;
  const created: { id: string; firstChapterIds: string[]; allChapterIds: string[] }[] = [];

  for (const [index, def] of COURSES.entries()) {
    const [course] = await db
      .insert(courses)
      .values({
        slug: slugify(def.title),
        title: def.title,
        subtitle: def.subtitle,
        description: def.description,
        learningOutcomes: def.outcomes,
        requirements: def.requirements,
        level: def.level,
        priceCents: def.priceCents,
        currency: env.CURRENCY,
        status: def.status,
        categoryId: categoryRows.find((c) => c.name === def.category)!.id,
        instructorId: adminId,
        publishedAt: def.status === "published" ? new Date(Date.now() - (COURSES.length - index) * 86_400_000) : null,
      })
      .returning();

    const allChapterIds: string[] = [];
    for (const [sIndex, sectionDef] of def.sections.entries()) {
      const [section] = await db
        .insert(sections)
        .values({ courseId: course!.id, title: sectionDef.title, position: sIndex })
        .returning();
      for (const [cIndex, title] of sectionDef.chapters.entries()) {
        const [chapter] = await db
          .insert(chapters)
          .values({
            courseId: course!.id,
            sectionId: section!.id,
            title,
            description: `En esta clase veremos: ${title.toLowerCase()}.`,
            position: cIndex,
            isFreePreview: sIndex === 0 && cIndex < 2,
            videoStatus: def.status === "published" ? "ready" : "none",
            streamUid: def.status === "published" ? streamUid : null,
            durationSec: def.status === "published" ? durationFor(chapterSeed++) : 0,
          })
          .returning();
        allChapterIds.push(chapter!.id);
      }
    }
    await recalcCourseContent(db, course!.id);
    created.push({ id: course!.id, firstChapterIds: allChapterIds.slice(0, 3), allChapterIds });
  }

  // El alumno tiene el primer curso (con algo de progreso) y el gratuito.
  const [first, , , free] = created;
  await db.insert(enrollments).values([
    { userId: studentId, courseId: first!.id },
    { userId: studentId, courseId: free!.id },
  ]);
  await db.insert(chapterProgress).values(
    first!.firstChapterIds.slice(0, 2).map((chapterId) => ({
      userId: studentId,
      chapterId,
      courseId: first!.id,
      positionSec: 120,
      maxPositionSec: 600,
      firstSeenAt: new Date(Date.now() - 3 * 86_400_000),
      completedAt: new Date(Date.now() - 2 * 86_400_000),
    })),
  );

  await db.insert(reviews).values({
    userId: studentId,
    courseId: first!.id,
    rating: 5,
    body: "Muy bien explicado, por fin entiendo el App Router. Los ejercicios ayudan mucho.",
  });

  const [question] = await db
    .insert(chapterComments)
    .values({
      chapterId: first!.firstChapterIds[2]!,
      courseId: first!.id,
      userId: studentId,
      kind: "question",
      body: "¿Qué versión de Node.js recomiendas para seguir el curso?",
    })
    .returning();
  await db.insert(chapterComments).values([
    {
      chapterId: first!.firstChapterIds[2]!,
      courseId: first!.id,
      userId: adminId,
      parentId: question!.id,
      kind: "question",
      body: "Cualquier versión LTS reciente funciona. Yo uso la última LTS en todo el curso.",
    },
    {
      chapterId: first!.firstChapterIds[0]!,
      courseId: first!.id,
      userId: studentId,
      kind: "comment",
      body: "¡Empezando con muchas ganas!",
    },
  ]);

  await db.insert(coupons).values({
    code: "BIENVENIDA20",
    type: "percent",
    value: 20,
    appliesToAll: true,
    active: true,
  });

  for (const course of created) {
    await recalcCourseRating(db, course.id);
    await recalcCourseStudents(db, course.id);
  }

  console.log("\nSeed completado:");
  console.log(`  Admin:  ${env.SEED_ADMIN_EMAIL} / ${env.SEED_ADMIN_PASSWORD}`);
  console.log(`  Alumno: ${STUDENT_EMAIL} / ${STUDENT_PASSWORD}`);
  console.log("  Cupón:  BIENVENIDA20 (20 % en todos los cursos)");
  if (!streamUid) console.log("  Aviso: sin SEED_STREAM_UID los capítulos de muestra no tienen video reproducible.");
}

try {
  await main();
} finally {
  await sqlClient.end();
}
