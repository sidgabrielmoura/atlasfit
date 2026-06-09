"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function SuperAdminBreadcrumbs() {
  const pathname = usePathname();
  
  if (!pathname) return null;

  const paths = pathname.split("/").filter(Boolean);
  
  // Se não estiver dentro do superadmin, ou só na raiz do superadmin
  if (paths.length < 2 || paths[0] !== "superadmin") {
    return (
      <div className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
        <span className="text-primary font-black">SuperAdmin</span>
        <span className="opacity-50">/</span>
        <span>AtlasFit Platform</span>
      </div>
    );
  }

  // Gera os breadcrumbs dinamicamente
  return (
    <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
      <Link href="/superadmin/dashboard" className="text-primary font-black hover:underline">
        SuperAdmin
      </Link>
      
      {paths.slice(1).map((segment, index) => {
        const href = "/" + paths.slice(0, index + 2).join("/");
        const isLast = index === paths.length - 2;
        
        // Formata o texto
        let text = segment.replace(/-/g, " ");
        
        // Se for um ID (muito longo), mostra "Detalhes"
        if (text.length > 20) {
          text = "Detalhes";
        }
        
        return (
          <div key={href} className="flex items-center gap-2">
            <ChevronRight className="size-3 opacity-50" />
            {isLast ? (
              <span className="text-foreground">{text}</span>
            ) : (
              <Link href={href} className="hover:text-primary transition-colors">
                {text}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
