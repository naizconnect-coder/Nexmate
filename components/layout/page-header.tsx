import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  backHref?: string
  backLabel?: string
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  backHref,
  backLabel = "Back",
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
            {breadcrumbs.map((item, index) => (
              <span key={`${item.label}-${index}`}>
                {index > 0 ? (
                  <span className="text-muted-foreground/60" aria-hidden="true">
                    {" "}
                    /{" "}
                  </span>
                ) : null}
                {item.href ? (
                  <Link href={item.href} className="hover:text-foreground">
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1
          className={cn(
            "text-2xl font-bold tracking-tight text-balance md:text-3xl",
            breadcrumbs && breadcrumbs.length > 0 && "mt-2"
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {backHref ? (
        <Button type="button" variant="outline" asChild className="shrink-0">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      ) : null}
    </header>
  )
}
