import { CheckCircle2, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkPasswordParts } from "@/lib/password";

type Props = {
  password: string;
  minLength?: number;
  className?: string;
  theme?: "light" | "dark";
};

// no helpers here; imported from lib to keep fast refresh happy

export default function PasswordRequirements({ password, minLength = 8, className, theme = "light" }: Props) {
  const parts = checkPasswordParts(password, minLength);
  const items = [
    { ok: parts.length, label: `At least ${minLength} characters` },
    { ok: parts.lower, label: "Contains lowercase letter" },
    { ok: parts.upper, label: "Contains uppercase letter" },
    { ok: parts.digit, label: "Contains a number" },
    { ok: parts.symbol, label: "Contains a symbol" },
  ];

  const allOk = items.every(i => i.ok);

  const baseStyles =
    theme === "dark"
      ? "rounded-md border p-3 text-xs border-white/15 bg-white/5 text-slate-200"
      : "rounded-md border p-3 text-xs border-slate-200 bg-slate-50 text-slate-600";

  const successStyles =
    theme === "dark"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
      : "border-green-200 bg-green-50 text-green-700";

  return (
    <div
      className={cn(
        baseStyles,
        allOk && successStyles,
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {allOk ? (
          <CheckCircle2 className={cn("w-4 h-4", theme === "dark" ? "text-emerald-300" : "text-green-600")} />
        ) : (
          <CircleAlert className={cn("w-4 h-4", theme === "dark" ? "text-slate-300" : "text-slate-500")} />
        )}
        <span>Password must include:</span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4">
        {items.map((it, idx) => (
          <li
            key={idx}
            className={cn(
              it.ok
                ? theme === "dark"
                  ? "text-emerald-200"
                  : "text-green-700"
                : theme === "dark"
                  ? "text-slate-300"
                  : "text-slate-600"
            )}
          >
            {it.ok ? "•" : "○"} {it.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
