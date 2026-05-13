import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { supabase } from "@/integrations/supabase/client";
import { loadFaceModels, getFaceDescriptor, descriptorToArray } from "@/lib/face";
import { toast } from "sonner";
import { Loader2, UserPlus, Upload, X } from "lucide-react";

export const Route = createFileRoute("/cadastro")({
  component: CadastroPage,
});

type ImgItem = { file: File; url: string; descriptor: number[] | null; status: "idle" | "ok" | "err"; error?: string };

function CadastroPage() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [items, setItems] = useState<ImgItem[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFaceModels()
      .then(() => setLoadingModels(false))
      .catch((e) => {
        console.error(e);
        toast.error("Falha ao carregar modelos de IA");
      });
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files);
    const next: ImgItem[] = list.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      descriptor: null,
      status: "idle",
    }));
    setItems((prev) => [...prev, ...next]);
    // Process each
    for (const item of next) {
      try {
        const img = await loadImage(item.url);
        const res = await getFaceDescriptor(img);
        if (!res) {
          updateItem(item, { status: "err", error: "Nenhum rosto detectado" });
        } else {
          updateItem(item, { status: "ok", descriptor: descriptorToArray(res.descriptor) });
        }
      } catch (e) {
        updateItem(item, { status: "err", error: (e as Error).message });
      }
    }
  }

  function updateItem(target: ImgItem, patch: Partial<ImgItem>) {
    setItems((prev) => prev.map((it) => (it === target ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !cpf.trim()) {
      toast.error("Preencha nome e CPF");
      return;
    }
    const valid = items.filter((i) => i.status === "ok" && i.descriptor);
    if (valid.length === 0) {
      toast.error("Adicione ao menos uma imagem com rosto detectado");
      return;
    }
    setSubmitting(true);
    try {
      const { data: pessoa, error: pErr } = await supabase
        .from("pessoas")
        .insert({ nome: nome.trim(), cpf: cpf.trim() })
        .select()
        .single();
      if (pErr) throw pErr;

      for (const item of valid) {
        const ext = item.file.name.split(".").pop() ?? "jpg";
        const path = `${pessoa.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("faces").upload(path, item.file, {
          contentType: item.file.type,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("faces").getPublicUrl(path);
        const { error: iErr } = await supabase.from("imagens").insert({
          pessoa_id: pessoa.id,
          caminho_imagem: pub.publicUrl,
          descriptor: item.descriptor as never,
        });
        if (iErr) throw iErr;
      }
      toast.success(`${pessoa.nome} cadastrado(a) com sucesso!`);
      navigate({ to: "/pessoas" });
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Cadastro de Pessoa</h1>
            <p className="text-sm text-muted-foreground">
              Adicione nome, CPF e ao menos uma foto com rosto visível.
            </p>
          </div>
        </div>

        {loadingModels && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando modelos de IA…
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Nome
              </label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="João Silva"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                CPF
              </label>
              <input
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Fotos faciais (múltiplas permitidas)
            </label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loadingModels}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background/50 px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
            >
              <Upload className="h-5 w-5" />
              Clique para selecionar imagens
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />

            {items.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {items.map((it, idx) => (
                  <div key={idx} className="group relative overflow-hidden rounded-lg border border-border bg-background">
                    <img src={it.url} alt="" className="h-32 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="absolute right-1 top-1 rounded-md bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div
                      className={`absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] font-medium ${
                        it.status === "ok"
                          ? "bg-success/90 text-success-foreground"
                          : it.status === "err"
                            ? "bg-destructive/90 text-destructive-foreground"
                            : "bg-muted/90 text-muted-foreground"
                      }`}
                    >
                      {it.status === "ok"
                        ? "✓ Rosto detectado"
                        : it.status === "err"
                          ? it.error
                          : "Processando…"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || loadingModels}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Cadastrar pessoa
          </button>
        </form>
      </main>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
