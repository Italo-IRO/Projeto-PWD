Sistema de Reconhecimento Facial 
Documentação Técnica do Projeto 

Como Usar:
I. Pré-requisitos
Instale o Bun (gerenciador/runtime usado pelo projeto):

Windows (PowerShell):
powershell -c "irm bun.sh/install.ps1 | iex"
macOS / Linux:
curl -fsSL https://bun.sh/install | bash
Verifique:

bun --version
II. Abrir o terminal na pasta do projeto
Descompacte faceid-security.zip em uma pasta (ex.: Documentos/faceid-security).
Abra um terminal:
Windows: clique com o botão direito dentro da pasta → "Abrir no Terminal" (ou abra o PowerShell e use cd C:\Users\SeuNome\Documentos\faceid-security)
macOS: arraste a pasta para o ícone do Terminal, ou cd ~/Documentos/faceid-security
VS Code: abra a pasta no VS Code → menu Terminal → New Terminal (já abre na pasta certa)
Confirme que está no lugar certo (deve listar package.json):

ls        # macOS/Linux
dir       # Windows

III. Rodar os comandos
bun install
(baixa as dependências — cria a pasta node_modules)

bun dev
(inicia o servidor local — vai mostrar algo como Local: http://localhost:3000)

IV. Abrir no navegador
Acesse a URL exibida no terminal (geralmente http://localhost:3000).
Para parar o servidor: pressione Ctrl + C no terminal.


1. Introdução 
Quando começamos a pensar neste projeto, o objetivo era simples de enunciar, mas desafiador de implementar: construir um sistema web capaz de cadastrar pessoas, armazenar fotos do rosto delas e, posteriormente, reconhecer essas pessoas a partir de uma nova imagem ou de um vídeo capturado pela webcam, em tempo real, dentro do próprio navegador. 
A proposta foi pensada como uma aplicação completa, que integra três pilares fundamentais da computação moderna: visão computacional, persistência de dados em nuvem e desenvolvimento web reativo. Optamos por construir tudo isso em uma stack JavaScript/TypeScript, justamente porque ela permite unir o frontend, a lógica de processamento de imagens e a comunicação com o backend dentro de um mesmo ecossistema. 

2. Concepção Inicial 
A primeira pergunta que precisávamos responder era: como reconhecer um rosto dentro de uma imagem? Existem basicamente dois caminhos. O primeiro seria enviar a imagem para um serviço externo, como AWS Rekognition ou Azure Face API, e receber a resposta pronta. O segundo, mais interessante do ponto de vista didático, seria executar o reconhecimento diretamente no navegador, usando uma rede neural pré-treinada. 

Escolhemos o segundo caminho, utilizando a biblioteca face-api.js, que é um wrapper sobre o TensorFlow.js. Essa decisão tem implicações importantes que serão discutidas mais à frente: ela é justamente o motivo pelo qual o site não pode ser uma página estática simples. 

2.1. Funcionalidades planejadas 
Cadastro de pessoas com nome e CPF. 
Upload de uma foto do rosto e cálculo automático do descritor facial. 
Reconhecimento por upload de imagem (verificar se o rosto já está cadastrado). 
Reconhecimento ao vivo pela webcam, com detecção contínua e exibição do nome sobre o rosto. 
Listagem e exclusão de pessoas cadastradas. 
Histórico das tentativas de reconhecimento. 
3. Arquitetura Geral 
A arquitetura escolhida segue o padrão de uma aplicação web full stack moderna. No lado do cliente, temos uma SPA (Single Page Application) construída em React, com roteamento por arquivos, que se comunica com um backend gerenciado para armazenar dados estruturados (pessoas, descritores faciais e histórico) e arquivos binários (as próprias fotos). 

O fluxo, em termos gerais, é o seguinte: o navegador carrega a aplicação, baixa os modelos de rede neural, abre a webcam ou recebe um upload, calcula localmente o descritor facial — um vetor numérico de 128 posições que representa matematicamente o rosto — e envia esse vetor para o backend. Quando uma nova imagem precisa ser reconhecida, comparamos seu descritor com os já armazenados usando distância euclidiana. 

3.1. Stack tecnológica 

TanStack Start (React 19 + Vite 7) — framework full stack com SSR e roteamento por arquivos. 

TypeScript — para garantir tipagem em todo o projeto. 

Tailwind CSS v4 — estilização com tokens semânticos. 

shadcn/ui — biblioteca de componentes acessíveis. 

face-api.js — detecção e reconhecimento facial direto no navegador. 

Lovable Cloud (Supabase por baixo dos panos) — banco PostgreSQL, storage de arquivos e autenticação. 

Bun — runtime e gerenciador de pacotes. 

4. Modelagem do Banco de Dados 

O modelo de dados foi pensado para ser o mais enxuto possível, mas suficiente para representar todas as funcionalidades. Foram criadas três tabelas no PostgreSQL gerenciado pelo Lovable Cloud: 
pessoas — armazena id, nome, cpf (único) e data_cadastro. 
imagens — relaciona-se com pessoas via pessoa_id, guarda o caminho da imagem no storage e o descritor facial em formato JSONB (um array de 128 floats). 
reconhecimentos — registra o histórico das tentativas de reconhecimento, com nome detectado, confiança e origem (upload ou webcam). 
Além das tabelas, foi configurado um bucket público chamado faces dentro do storage, onde as fotos enviadas são salvas. Cada tabela tem RLS (Row Level Security) habilitado com políticas de acesso público, já que se trata de um projeto acadêmico sem sistema de login. 

CREATE TABLE public.pessoas ( 

  id BIGSERIAL PRIMARY KEY, 

  nome TEXT NOT NULL, 

  cpf TEXT NOT NULL UNIQUE, 

  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT now() 

); 

5. Estrutura de Pastas e Roteamento 

O projeto adota o roteamento baseado em arquivos do TanStack Router. Cada arquivo dentro de src/routes/ vira automaticamente uma rota da aplicação, sem necessidade de configuração manual de um array de rotas. 
src/routes/index.tsx — página inicial com navegação para as funcionalidades. 
src/routes/cadastro.tsx — formulário de cadastro de uma nova pessoa, com upload da foto. 
src/routes/upload.tsx — reconhecimento por imagem enviada. 
src/routes/webcam.tsx — reconhecimento ao vivo pela câmera. 
src/routes/pessoas.tsx — listagem e gerenciamento das pessoas cadastradas. 
A organização do código segue uma separação clara: lógica de negócio em src/lib/, hooks reutilizáveis em src/hooks/, componentes de interface em src/components/ e a integração com o Supabase em src/integrations/supabase/. 
6. Implementação do Reconhecimento Facial 
Toda a lógica de visão computacional vive em src/lib/face.ts e no hook src/hooks/use-known-faces.ts. O processo se divide em três etapas: 

6.1. Carregamento dos modelos 
Antes de qualquer detecção, é preciso baixar três redes neurais: o detector de rostos (TinyFaceDetector), o extrator de pontos faciais (FaceLandmark68Net) e o gerador de descritores (FaceRecognitionNet). Esses modelos somam alguns megabytes e são servidos a partir da pasta /public/models. 

await faceapi.nets.tinyFaceDetector.loadFromUri('/models'); 
await faceapi.nets.faceLandmark68Net.loadFromUri('/models'); 
await faceapi.nets.faceRecognitionNet.loadFromUri('/models'); 
6.2. Extração do descritor 
Quando uma imagem é fornecida — seja por upload ou por um frame da webcam — passamos ela pelas três redes em sequência. O resultado final é um vetor de 128 números float que representa de forma compacta as características do rosto. Dois rostos da mesma pessoa produzem vetores próximos; rostos de pessoas diferentes produzem vetores distantes. 

6.3. Comparação 
Para reconhecer um rosto, calculamos a distância euclidiana entre o descritor da imagem nova e cada descritor armazenado no banco. Se a menor distância for inferior a um limiar (tipicamente 0.6), consideramos que houve match. A confiança é calculada como (1 - distância). 

7. Por Que o Site NÃO É Estático 
Esta é, talvez, a parte mais importante da apresentação, porque toca em um conceito fundamental da arquitetura web moderna: a diferença entre um site estático e uma aplicação dinâmica. 
7.1. O que seria um site estático 
Um site estático é composto apenas por arquivos HTML, CSS, JavaScript e imagens, servidos diretamente por um servidor de arquivos como GitHub Pages, Netlify ou um simples Nginx. Não há banco de dados conectado, não há lógica rodando no servidor, não há estado persistente compartilhado entre usuários. Cada visitante recebe exatamente os mesmos arquivos. 

7.2. Por que este projeto não se encaixa 
Embora boa parte da lógica de reconhecimento facial rode dentro do navegador (e isso, isoladamente, poderia ser estático), o projeto depende de funcionalidades que exigem um backend de verdade: 
Persistência de dados: as pessoas cadastradas precisam ficar salvas em um banco de dados PostgreSQL. Um site estático não tem onde guardar isso de forma compartilhada e segura. 
Storage de arquivos: as fotos enviadas precisam ser armazenadas em um bucket de objetos, com URLs públicas e controle de acesso. 
Compartilhamento entre usuários: se a Pessoa A cadastra um rosto, a Pessoa B em outro computador precisa conseguir reconhecê-lo. Isso só é possível se houver um servidor central. 
Server functions: o projeto utiliza createServerFn do TanStack Start para encapsular operações sensíveis. Essas funções rodam em um runtime de servidor (Node/Bun ou Cloudflare Workers), nunca no navegador. 
Middleware de autenticação: o helper requireSupabaseAuth valida tokens JWT no servidor antes de permitir o acesso a determinados recursos. Em um site estático, qualquer validação seria facilmente burlada pelo cliente.
Variáveis de ambiente sensíveis: chaves como SUPABASE_SERVICE_ROLE_KEY existem apenas no servidor e jamais são enviadas ao navegador.

7.3. SSR e hidratação 
O TanStack Start gera HTML no servidor a cada requisição (Server-Side Rendering). Isso melhora o tempo de carregamento inicial e o SEO, mas exige um runtime JavaScript ativo no servidor para interpretar as rotas e executar os loaders. Um servidor de arquivos estático simplesmente não consegue fazer isso. 

- Considerações Finais 
Este projeto demonstra como tecnologias que antes exigiriam infraestrutura pesada — reconhecimento facial, banco de dados gerenciado, storage em nuvem — hoje podem ser combinadas em uma aplicação web em poucas semanas, graças à maturidade do ecossistema JavaScript e a plataformas como o Lovable Cloud. 
Ao mesmo tempo, ele evidencia uma verdade importante: nem toda aplicação que parece simples na superfície pode ser empacotada como um site estático. A escolha entre estático e dinâmico não é estética, é arquitetural — e depende de quais responsabilidades a aplicação assume além de exibir conteúdo. 

Obrigado pela atenção.

