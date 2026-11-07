# Cozy Display — guia de instalação e uso

## O que tem na pasta

| Arquivo | Para que serve |
|---|---|
| `index.html`, `style.css`, `script.js` | O painel em si (tela, visual e lógica) |
| `config.js` | **O único arquivo que você edita**: onde vai o Client ID do Spotify |
| `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png` | Fazem o painel ser instalado como app em tela cheia |

## Por que precisa de hospedagem (e o que NÃO precisa)

O login seguro do Spotify (PKCE) usa uma função do navegador que só existe em páginas `https://`. Além disso, desde 2026 o Spotify só aceita endereço de retorno `https://` (ou `127.0.0.1`). Abrir o arquivo direto do celular ou por IP da rede local **não funciona**.

A solução gratuita e sem servidor ligado é o **GitHub Pages**: ele só guarda os arquivos e entrega ao celular. Todo o resto roda no J5. Sua conta Spotify não passa por lugar nenhum além do próprio Spotify.

## Passo 1 — Criar o app no Spotify (no notebook)

1. Entre em https://developer.spotify.com/dashboard com a conta Premium.
2. **Create app**. Nome: `Cozy Display`. Descrição: qualquer.
3. Em **Redirect URIs**, deixe em branco por enquanto (você vai preencher no passo 3).
4. Marque **Web API**. Salve.
5. Abra **Settings** do app e copie o **Client ID**. Não use o "client secret".

Regras atuais do Spotify para apps pessoais: o dono do app precisa ter Premium ativo (se o Premium vencer, o painel para), cada app aceita até 5 usuários na lista, e cada conta pode ter poucos apps. Para uso só seu, nada disso atrapalha.

## Passo 2 — Publicar no GitHub Pages

1. Crie uma conta grátis em https://github.com.
2. **New repository**: nome `cozy-display`, público, sem README. Create.
3. Clique em **uploading an existing file** e arraste **todos os arquivos da pasta** (não a pasta em si). Commit.
4. **Settings → Pages**: em Source escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`. Save.
5. Em 1–2 minutos o endereço aparece: `https://SEU-USUARIO.github.io/cozy-display/`

## Passo 3 — Ligar as duas pontas

1. No GitHub, abra `config.js` → ícone de lápis → troque `COLE_SEU_CLIENT_ID_AQUI` pelo seu Client ID (mantenha as aspas) → Commit.
2. Abra o endereço do painel no navegador. Enquanto o ID não estiver certo, a tela mostra exatamente qual **Redirect URI** cadastrar.
3. Volte ao dashboard do Spotify → **Settings → Redirect URIs** → cole `https://SEU-USUARIO.github.io/cozy-display/` (com a barra final, idêntico) → Add → Save.

## Passo 4 — Colocar no J5 Prime

1. Abra o endereço no **Chrome** do J5 e toque em **Conectar ao Spotify**. Aceite as permissões (só leitura do estado do player e controle de reprodução).
2. Volte ao painel. Toque uma música em qualquer aparelho: a capa e os dados aparecem em até uns 4 segundos.
3. Menu do Chrome (⋮) → **Instalar app** / **Adicionar à tela inicial**. Abra pelo ícone novo: ele abre em tela cheia e na horizontal.
4. Se o Chrome não oferecer o modo app, use o botão de tela cheia no canto superior direito do painel.

> Aviso honesto: eu testei o layout e a lógica aqui, mas não consegui testar no seu J5 real. Se o login não voltar ao painel quando feito dentro do app instalado, faça o passo 1 no Chrome normal, depois instale o app.

## Tela sempre ligada (importante)

O painel pede ao Chrome para não apagar a tela, mas o Android 8 pode ignorar. O jeito garantido:

1. **Configurações → Sobre o telefone → Informações do software** → toque 7 vezes em **Número da versão**.
2. **Configurações → Opções do desenvolvedor → Permanecer ativo** (tela não apaga enquanto carrega).
3. Deixe o J5 sempre no carregador.

Bateria: carregar 24 horas por dia aquece e desgasta. Mantenha ventilado, use carregador original de 5 V, e se a bateria começar a inchar, pare de usar.

## Como usar

- Toque no **relógio** para alternar tema: automático (escuro das 22h às 6h), claro, escuro.
- **⤢** tela cheia. **⏻** desconectar do Spotify (toque duas vezes).
- ⏮ ⏯ ⏭ controlam o Spotify de verdade. O botão "anterior" faz o que o Spotify faz: volta ao início da faixa se já passaram alguns segundos.

## Limitações reais (sem enrolação)

- **Atraso de ~4 s**: a API do Spotify não envia eventos; o painel pergunta de tempos em tempos. A barra de progresso anda sozinha entre as perguntas.
- **Sem player ativo, não há dados**: se nada tocou por um bom tempo, o Spotify esquece a sessão e a API devolve "vazio". O painel mostra "Nada tocando" até você dar play em qualquer aparelho. O play do painel só funciona se houver uma sessão recente.
- **Só você**: o modo de desenvolvimento do Spotify permite 5 usuários. Para um amigo usar, adicione o e-mail dele em *User Management* no dashboard.
- **Chrome do Android 8** parou na versão 138 e não recebe mais atualizações de segurança. O painel usa só recursos antigos e compatíveis, mas **não use esse Chrome para navegar em outros sites**.

## Suporte de papelão

**Meça o J5 Prime** antes de cortar (régua): comprimento (C), largura (L) e espessura (E). Não confie em números de memória.

Peças (use papelão duplo ou colado em 2 camadas):

1. **Base**: C + 4 cm de largura × 10 cm de profundidade. Com C ≈ 14–15 cm, o 18 cm que você sugeriu serve.
2. **Painel traseiro (encosto)**: mesma largura da base, altura = L + 2,5 cm. Ele fica inclinado uns 15° para trás (mais estável que vertical).
3. **Apoio inferior (lábio)**: tira de 18 cm × 1,5 cm colada na base. Fenda de apoio = E + 2 mm. O celular apoia só pelo lado de baixo e fica folgado, então sai fácil.
4. **Pés triangulares**: 2 triângulos nas laterais do encosto, base 8 cm e altura igual à do encosto, colados na base.

Cuidados específicos para o seu aparelho:

- Nada encosta na tela: o lábio segura só a borda inferior do aparelho, **fora da área do vidro trincado**. Se o canto trincado ficar embaixo, faça o lábio em duas tiras curtas e deixe o canto livre.
- Recorte uma abertura no lábio na posição do conector USB e fique com o cabo saindo pela lateral. Confirme na prática, com o aparelho deitado, onde ficam a entrada USB, o microfone e o alto-falante.
- Corte "janelas" de ventilação atrás do painel (círculos de 2 cm) e não cubra a câmera traseira.
- Nada de cola no celular. Se quiser mais firmeza, um feltro fino no lábio.
- Acabamento: cubra com papel kraft ou papel contact bege (#E8DDCE / #D6C5AE) e uma faixa marrom (#806B57). Teste com um papelão de rascunho antes do definitivo.
