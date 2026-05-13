import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { arrayToDescriptor, type KnownFace } from "@/lib/face";

export function useKnownFaces() {
  const [faces, setFaces] = useState<KnownFace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("imagens")
        .select("descriptor, pessoa_id, pessoas(nome)");
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      const known: KnownFace[] = (data ?? [])
        .filter((r) => r.pessoas)
        .map((r) => ({
          pessoaId: r.pessoa_id,
          nome: (r.pessoas as { nome: string }).nome,
          descriptor: arrayToDescriptor(r.descriptor),
        }));
      setFaces(known);
      setLoading(false);
    })();
  }, []);

  return { faces, loading };
}
