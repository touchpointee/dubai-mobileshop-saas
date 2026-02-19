import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  className,
  href,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  href?: string;
}) {
  const Wrapper = href ? "a" : "div";
  return (
    <Wrapper
      href={href}
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition",
        href && "hover:border-teal-200 hover:shadow-md cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
            {icon}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
