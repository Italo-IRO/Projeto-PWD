
-- Pessoas table
CREATE TABLE public.pessoas (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Imagens table (stores face descriptor as JSON array of 128 floats + image url)
CREATE TABLE public.imagens (
  id BIGSERIAL PRIMARY KEY,
  pessoa_id BIGINT NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  caminho_imagem TEXT NOT NULL,
  descriptor JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reconhecimentos history
CREATE TABLE public.reconhecimentos (
  id BIGSERIAL PRIMARY KEY,
  pessoa_id BIGINT REFERENCES public.pessoas(id) ON DELETE SET NULL,
  nome TEXT,
  confianca NUMERIC,
  origem TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconhecimentos ENABLE ROW LEVEL SECURITY;

-- Public access (academic project, no auth required)
CREATE POLICY "public read pessoas" ON public.pessoas FOR SELECT USING (true);
CREATE POLICY "public insert pessoas" ON public.pessoas FOR INSERT WITH CHECK (true);
CREATE POLICY "public update pessoas" ON public.pessoas FOR UPDATE USING (true);
CREATE POLICY "public delete pessoas" ON public.pessoas FOR DELETE USING (true);

CREATE POLICY "public read imagens" ON public.imagens FOR SELECT USING (true);
CREATE POLICY "public insert imagens" ON public.imagens FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete imagens" ON public.imagens FOR DELETE USING (true);

CREATE POLICY "public read reconhecimentos" ON public.reconhecimentos FOR SELECT USING (true);
CREATE POLICY "public insert reconhecimentos" ON public.reconhecimentos FOR INSERT WITH CHECK (true);

-- Storage bucket for face images
INSERT INTO storage.buckets (id, name, public) VALUES ('faces', 'faces', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read faces" ON storage.objects FOR SELECT USING (bucket_id = 'faces');
CREATE POLICY "public upload faces" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'faces');
CREATE POLICY "public delete faces" ON storage.objects FOR DELETE USING (bucket_id = 'faces');
