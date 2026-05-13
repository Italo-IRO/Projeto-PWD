import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Users, History } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pessoas")({
  component: PessoasPage,
});

type Pessoa = {
  id: number;
  nome: string;
  cpf: string;
  data_cadastro: string;
  imagens: { id: number; caminho_imagem: string }[];
};

type Reconhecimento = {
  id: number;
  nome: string | null;
  confianca: number | null;
  origem: string;
  created_at: string;
};

function PessoasPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [hist, setHist] = useState<Reconhecimento[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: ps }, { data: rs }] = await Promise.all([
      supabase
        .from("pessoas")
        .select("id, nome, cpf, data_cadastro, imagens(id, caminho_imagem)")
        .order("data_cadastro", { ascending: false }),
      supabase
        .from("reconhecimentos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setPessoas((ps as Pessoa[]) ?? []);
    setHist((rs as Reconhecimento[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(p: Pessoa) {
    if (!confirm(`Remover ${p.nome}?`)) return;
    const { error } = await supabase.from("pessoas").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Pessoa removida");
      load();
    }
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Pessoas Cadastradas</h1>
            <p className="text-sm text-muted-foreground">{pessoas.length} pessoa(s) no sistema.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section>
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando…</div>
            ) : pessoas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                Nenhuma pessoa cadastrada ainda.
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {pessoas.map((p) => (
                  <li key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-start gap-3">
                      <div className="h-16 w-16 overflow-hidden rounded-lg border border-border bg-muted">
                        {p.imagens[0] ? (
                          <img src={p.imagens[0].caminho_imagem} alt={p.nome} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate font-semibold">{p.nome}</h3>
                          <button
                            onClick={() => remove(p)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-xs text-muted-foreground">ID: {p.id} · CPF: {p.cpf}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {p.imagens.length} foto(s) · {new Date(p.data_cadastro).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </div>
                    {p.imagens.length > 1 && (
                      <div className="mt-3 flex gap-1.5 overflow-x-auto">
                        {p.imagens.slice(1).map((img) => (
                          <img
                            key={img.id}
                            src={img.caminho_imagem}
                            alt=""
                            className="h-12 w-12 flex-none rounded border border-border object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="rounded-xl border border-border bg-card p-4 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <History className="h-4 w-4" /> Histórico recente
            </h2>
            {hist.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem reconhecimentos ainda.</p>
            ) : (
              <ul className="space-y-2">
                {hist.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border bg-background/40 p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{r.nome ?? "Desconhecido"}</span>
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase">{r.origem}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {r.confianca != null && `${(r.confianca * 100).toFixed(0)}% · `}
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
