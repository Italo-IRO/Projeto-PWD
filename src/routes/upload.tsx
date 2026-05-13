import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { useKnownFaces } from "@/hooks/use-known-faces";
import { loadFaceModels, getAllFaceDescriptors, bestMatch } from "@/lib/face";
import { supabase } from "@/integrations/supabase/client";
import { Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/upload")({
  component: UploadPage,
});

type Result = {
  box: { x: number; y: number; width: number; height: number };
  nome: string;
  pessoaId: number | null;
  confidence: number;
};

function UploadPage() {
  const { faces } = useKnownFaces();
  const [modelsReady, setModelsReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadFaceModels().then(() => setModelsReady(true)).catch((e) => toast.error(e.message));
  }, []);

  async function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    setResults([]);
  }

  async function process() {
    if (!imgRef.current) return;
    setProcessing(true);
    try {
      const dets = await getAllFaceDescriptors(imgRef.current);
      const out: Result[] = dets.map((d) => {
        const m = bestMatch(d.descriptor, faces, 0.55);
        return {
          box: d.detection.box,
          nome: m.match?.nome ?? "Desconhecido",
          pessoaId: m.match?.pessoaId ?? null,
          confidence: m.confidence,
        };
      });
      setResults(out);
      drawBoxes(out);
      // Log
      for (const r of out) {
        await supabase.from("reconhecimentos").insert({
          pessoa_id: r.pessoaId,
          nome: r.nome,
          confianca: r.confidence,
          origem: "upload",
        });
      }
      if (out.length === 0) toast.info("Nenhum rosto detectado na imagem");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  function drawBoxes(rs: Result[]) {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const r of rs) {
      const known = r.pessoaId != null;
      ctx.strokeStyle = known ? "#5eead4" : "#fb7185";
      ctx.lineWidth = 4;
      ctx.strokeRect(r.box.x, r.box.y, r.box.width, r.box.height);
      const label = `${r.nome} ${(r.confidence * 100).toFixed(0)}%`;
      ctx.font = "bold 22px ui-sans-serif, system-ui";
      const m = ctx.measureText(label);
      ctx.fillStyle = known ? "#5eead4" : "#fb7185";
      ctx.fillRect(r.box.x, r.box.y - 30, m.width + 14, 28);
      ctx.fillStyle = "#0c1424";
      ctx.fillText(label, r.box.x + 7, r.box.y - 10);
    }
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Reconhecimento por Imagem</h1>
            <p className="text-sm text-muted-foreground">Envie uma foto e identifique todos os rostos.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={!modelsReady}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background/40 px-4 py-6 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground disabled:opacity-50"
              >
                <Upload className="h-5 w-5" /> Selecionar imagem
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files && handleFile(e.target.files[0])}
              />
            </div>

            {imgUrl && (
              <div className="overflow-hidden rounded-xl border border-border bg-black shadow-card">
                <div className="relative">
                  <img
                    ref={imgRef}
                    src={imgUrl}
                    alt="upload"
                    className="block w-full"
                    onLoad={process}
                    crossOrigin="anonymous"
                  />
                  <canvas
                    ref={canvasRef}
                    className="pointer-events-none absolute inset-0 h-full w-full"
                  />
                  {processing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-sm">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando…
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Resultados
            </h2>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {imgUrl ? "Nenhum rosto encontrado." : "Envie uma imagem para começar."}
              </p>
            ) : (
              <ul className="space-y-2">
                {results.map((r, i) => (
                  <li
                    key={i}
                    className={`rounded-lg border p-3 ${
                      r.pessoaId
                        ? "border-success/40 bg-success/5"
                        : "border-destructive/40 bg-destructive/5"
                    }`}
                  >
                    <div className="text-sm font-semibold">{r.nome}</div>
                    {r.pessoaId && <div className="text-xs text-muted-foreground">ID: {r.pessoaId}</div>}
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gradient-hero"
                        style={{ width: `${(r.confidence * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-right text-xs text-muted-foreground">
                      Confiança: {(r.confidence * 100).toFixed(1)}%
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
