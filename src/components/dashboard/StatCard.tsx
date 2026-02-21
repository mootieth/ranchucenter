import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning" | "accent";
  linkTo?: string;
}

const variantStyles = {
  default: "bg-card border border-border",
  primary: "bg-gradient-to-br from-[hsl(210,60%,55%)] to-[hsl(210,70%,45%)] text-white",
  success: "bg-gradient-to-br from-[hsl(168,60%,38%)] to-[hsl(168,76%,30%)] text-white",
  warning: "bg-gradient-to-br from-[hsl(190,65%,48%)] to-[hsl(195,70%,38%)] text-white",
  accent: "bg-gradient-to-br from-[hsl(230,55%,58%)] to-[hsl(235,55%,48%)] text-white",
};

const iconVariantStyles = {
  default: "bg-[hsl(210,60%,55%)]/10 text-[hsl(210,60%,55%)]",
  primary: "bg-white/20 text-white",
  success: "bg-white/20 text-white",
  warning: "bg-white/20 text-white",
  accent: "bg-white/20 text-white",
};

const StatCard = ({ title, value, subtitle, icon: Icon, trend, variant = "default", linkTo }: StatCardProps) => {
  const content = (
    <div className={cn("stat-card", variantStyles[variant], linkTo && "hover:scale-[1.02] transition-transform cursor-pointer")}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className={cn(
            "text-sm font-medium",
            variant === "default" ? "text-muted-foreground" : "text-white/80"
          )}>
            {title}
          </p>
          <p className="text-3xl font-bold">{value}</p>
          {subtitle && (
            <p className={cn(
              "text-sm",
              variant === "default" ? "text-muted-foreground" : "text-white/70"
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded",
                trend.isPositive 
                  ? "bg-success/20 text-success" 
                  : "bg-destructive/20 text-destructive"
              )}>
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
              <span className={cn(
                "text-xs",
                variant === "default" ? "text-muted-foreground" : "text-white/60"
              )}>
                จากเดือนก่อน
              </span>
            </div>
          )}
        </div>
        <div className={cn(
          "flex items-center justify-center w-12 h-12 rounded-xl",
          iconVariantStyles[variant]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>;
  }

  return content;
};

export default StatCard;
