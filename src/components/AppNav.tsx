import { Link, useLocation } from "@tanstack/react-router";
import { ScanFace, UserPlus, Camera, Image as ImageIcon, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Início", icon: ScanFace },
  { to: "/cadastro", label: "Cadastro", icon: UserPlus },
  { to: "/webcam", label: "Webcam", icon: Camera },
  { to: "/upload", label: "Imagem", icon: ImageIcon },
  { to: "/pessoas", label: "Pessoas", icon: Users },
] as const;

export function AppNav() {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero shadow-glow">
            <ScanFace className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide">FaceID Security</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Reconhecimento Facial
            </div>
          </div>
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
