import { createFileRoute, Link } from "@tanstack/react-router";
import { UserPlus, Camera, Image as ImageIcon, Users, ShieldCheck, Zap, Database } from "lucide-react";
import { AppNav } from "@/components/AppNav";

export const Route = createFileRoute("/")({
  component: Index,
});

const features = [
  {
    to: "/cadastro",
    icon: UserPlus,
    title: "Cadastro de Pessoas",
    desc: "Registre nome, CPF e múltiplas fotos faciais. Os encodings são extraídos automaticamente.",
  },
  {
    to: "/webcam",
    icon: Camera,
    title: "Reconhecimento por Webcam",
    desc: "Detecção em tempo real com marcação facial e percentual de confiança.",
  },
  {
    to: "/upload",
    icon: ImageIcon,
    title: "Reconhecimento por Imagem",
    desc: "Envie uma foto e identifique todas as pessoas conhecidas presentes.",
  },
  {
    to: "/pessoas",
    icon: Users,
    title: "Lista de Pessoas",
    desc: "Consulte cadastros, fotos e histórico de reconhecimentos.",
  },
] as const;

const stats = [
  { icon: ShieldCheck, label: "Privacidade", value: "100% local" },
  { icon: Zap, label: "Latência", value: "Tempo real" },
  { icon: Database, label: "Persistência", value: "Banco em nuvem" },
];

function Index() {
  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 pb-20">
        <section className="py-16 text-center sm:py-24">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            FaceID Security · v1.0
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Reconhecimento facial <span className="text-gradient">em tempo real</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Cadastre pessoas, treine seus rostos e identifique automaticamente por webcam ou upload
            de imagem. Tudo direto no navegador.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
            >
              <UserPlus className="h-4 w-4" /> Cadastrar pessoa
            </Link>
            <Link
              to="/webcam"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Camera className="h-4 w-4" /> Abrir webcam
            </Link>
          </div>

          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-3">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg border border-border/60 bg-card/60 p-3">
                <Icon className="mx-auto h-4 w-4 text-primary" />
                <div className="mt-1 text-sm font-semibold">{value}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {features.map(({ to, icon: Icon, title, desc }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-xl border border-border/60 bg-card p-6 shadow-card transition-all hover:border-primary/40 hover:shadow-glow"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
