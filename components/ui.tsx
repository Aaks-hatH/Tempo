import { cn } from "@/lib/utils";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("glass rounded-[2rem] p-6", className)}>{children}</section>;
}

export function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200", className)}>{children}</span>;
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/8">
      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 shadow-[0_0_22px_rgba(59,130,246,0.7)]" style={{ width: `${value}%` }} />
    </div>
  );
}
