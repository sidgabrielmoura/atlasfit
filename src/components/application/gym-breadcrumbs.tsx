"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const ROUTE_LABELS: Record<string, string> = {
  gym: "Academia",
  dashboard: "Visão Geral",
  reception: "Recepção Rápida",
  students: "Alunos",
  enrollments: "Matrículas & Contratos",
  plans: "Catálogo de Planos",
  workouts: "Treinos",
  staff: "Equipe",
  finance: "Financeiro & Métricas",
  import: "Importação Assistida",
  settings: "Configurações",
};

export function GymBreadcrumbs() {
  const pathname = usePathname();

  if (!pathname) return null;

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || segments[0] !== "gym") return null;

  return (
    <Breadcrumb className="hidden sm:flex">
      <BreadcrumbList className="text-xs font-semibold">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/gym/dashboard" className="text-primary hover:text-primary/80 transition-colors">
              Academia
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {segments.slice(1).map((seg, idx) => {
          const isLast = idx === segments.length - 2;
          const href = "/" + segments.slice(0, idx + 2).join("/");
          const label = ROUTE_LABELS[seg] || (seg.length > 15 ? "Detalhes" : seg.replace(/-/g, " "));

          return (
            <div key={href} className="inline-flex items-center gap-1.5 sm:gap-2.5">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-bold text-foreground">
                    {label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href} className="text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
