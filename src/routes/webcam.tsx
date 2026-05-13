import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { useKnownFaces } from "@/hooks/use-known-faces";
import { loadFaceModels, getAllFaceDescriptors, bestMatch } from "@/lib/face";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Loader2, Play, Square } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/webcam")({
  component: WebcamPage,
});

type Detection = {
  box: { x: number; y: number; width: number; height: number };
  nome: string;
  pessoaId: number | null;
  confidence: number;
};

function WebcamPage() {
  const { faces, loading: loadingFaces } = useKnownFaces();
  const [modelsReady, setModelsReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastLogRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    loadFaceModels().then(() => setModelsReady(true)).catch((e) => toast.error(e.message));
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 720, height: 540 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setRunning(true);
      loop();
    } catch (e) {
      toast.error("Não foi possível acessar a webcam");
      console.error(e);
    }
  }

  function stop() {
    setRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setDetections([]);
  }

  async function loop() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    const results = await getAllFaceDescriptors(video);
    const next: Detection[] = results.map((r) => {
      const m = bestMatch(r.descriptor, faces, 0.55);
      return {
        box: r.detection.box,
        nome: m.match?.nome ?? "Desconhecido",
        pessoaId: m.match?.pessoaId ?? null,
        confidence: m.confidence,
      };
    });
    setDetections(next);
    drawOverlay(next);

    // Log recognitions (rate-limited per person to once every 5s)
    const now = Date.now();
    for (const d of next) {
      if (d.pessoaId == null) continue;
      const last = lastLogRef.current.get(d.pessoaId) ?? 0;
      if (now - last > 5000) {
        lastLogRef.current.set(d.pessoaId, now);
        supabase.from("reconhecimentos").insert({
          pessoa_id: d.pessoaId,
          nome: d.nome,
          confianca: d.confidence,
          origem: "webcam",
        });
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  function drawOverlay(dets: Detection[]) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const d of dets) {
      const known = d.pessoaId != null;
      ctx.strokeStyle = known ? "#5eead4" : "#fb7185";
      ctx.lineWidth = 3;
      ctx.strokeRect(d.box.x, d.box.y, d.box.width, d.box.height);
      const label = `${d.nome} ${(d.confidence * 100).toFixed(0)}%`;
      ctx.font = "bold 18px ui-sans-serif, system-ui";
      const metrics = ctx.measureText(label);
      ctx.fillStyle = known ? "#5eead4" : "#fb7185";
      ctx.fillRect(d.box.x, d.box.y - 26, metrics.width + 12, 24);
      ctx.fillStyle = "#0c1424";
      ctx.fillText(label, d.box.x + 6, d.box.y - 8);
    }
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Reconhecimento por Webcam</h1>
            <p className="text-sm text-muted-foreground">
              Detecção em tempo real comparando com {faces.length} face(s) cadastrada(s).
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-xl border border-border bg-black shadow-card">
            <div className="relative aspect-video">
              <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
              {!running && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  Câmera desligada
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border bg-card p-3">
              {!running ? (
                <button
                  onClick={start}
                  disabled={!modelsReady || loadingFaces}
                  className="inline-flex items-center gap-2 rounded-md bg-gradient-hero px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-50"
                >
                  {!modelsReady ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Iniciar câmera
                </button>
              ) : (
                <button
                  onClick={stop}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
                >
                  <Square className="h-4 w-4" /> Parar
                </button>
              )}
              <div className="text-xs text-muted-foreground">
                {modelsReady ? "Modelos carregados" : "Carregando modelos…"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Pessoas detectadas
            </h2>
            {detections.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum rosto no quadro.</p>
            ) : (
              <ul className="space-y-2">
                {detections.map((d, i) => (
                  <li
                    key={i}
                    className={`rounded-lg border p-3 ${
                      d.pessoaId
                        ? "border-success/40 bg-success/5"
                        : "border-destructive/40 bg-destructive/5"
                    }`}
                  >
                    <div className="text-sm font-semibold">{d.nome}</div>
                    {d.pessoaId && <div className="text-xs text-muted-foreground">ID: {d.pessoaId}</div>}
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gradient-hero"
                        style={{ width: `${(d.confidence * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-right text-xs text-muted-foreground">
                      Confiança: {(d.confidence * 100).toFixed(1)}%
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
