# Cozy Display — atualização "central de mesa" e guia do iPhone 6

## O que há de novo

Toque no ícone de quatro quadrados (canto superior direito) para abrir o menu. No computador, a tecla **M** abre o menu e **Esc** fecha.

| Tela | O que faz |
|---|---|
| **Calendário** | Mês completo, dia da semana, datas especiais com contagem regressiva (toque em **+** para criar; marque "Todo ano" para aniversários) |
| **Clima** | Temperatura, sensação, umidade, vento e previsão de 5 dias de Belo Horizonte. Atualiza sozinho a cada 30 min |
| **Foco** | Pomodoro personalizável (foco, pausas, ciclo), temporizador e cronômetro com voltas |
| **Tarefas** | Lista com barra de progresso |
| **Notas** | Anotações rápidas, salvas enquanto você digita |
| **Sons** | Chuva, natureza, ruído branco e ruído marrom, com volume e "apagar sozinho" |
| **Descanso** | Só o relógio, bem escuro e calmo. Pode ligar sozinho em um horário |
| **Ajustes** | Temas (Bege, Sálvia, Rosé, Névoa, Lavanda), claro/escuro, papel de parede (linho, pontos, brilho ou foto sua), escurecer a tela, luz quente, animações e **ligar/desligar cada widget** |

Na tela inicial, pequenas "pílulas" mostram o essencial (pomodoro rodando, temperatura, próxima data, tarefas, som tocando). Tocar no relógio troca o modo claro/escuro/automático.

## Como atualizar (sem perder o login do Spotify)

1. No GitHub, abra o repositório `cozy-display` → **Add file → Upload files**.
2. Arraste **todos os arquivos desta atualização**. O `config.js` **não vem** nesta atualização de propósito: o seu Client ID continua lá.
3. Commit. Em 1–2 minutos a página nova está no ar.
4. No aparelho, feche e abra o painel de novo (puxe para recarregar se for pela aba do Safari).

Para trocar a cidade do clima ou as datas iniciais, edite `local.js` (latitude, longitude, nome). As datas desse arquivo só valem na primeira abertura; depois você gerencia pelo painel.

## Colocar no iPhone 6 (iOS 12)

1. Abra o endereço do painel no **Safari** do iPhone (o mesmo `https://SEU-USUARIO.github.io/cozy-display/`).
2. Botão de compartilhar (quadrado com seta) → **Adicionar à Tela de Início** → Adicionar. Abra pelo ícone novo: sem barras do navegador.
3. **Faça o login do Spotify dentro desse app da tela de início.** No iOS 12 o app instalado e o Safari guardam dados separados, então o login feito numa aba do Safari não vale para o app.
4. **Tela sempre ligada:** Ajustes do iPhone → Tela e Brilho → **Bloqueio Automático → Nunca**. O iOS 12 não permite que uma página segure a tela sozinha.
5. Deixe o aparelho no carregador, com ventilação, e gire para a horizontal.

> Aviso honesto: **testei no Chromium com a tela do iPhone 6 (667×375), e não num Safari/iOS 12 real**. Conferi que todo o código usa só recursos que o Safari 12 conhece (checagem de sintaxe ES5 e CSS com alternativas para o que ele não suporta), mas só o seu aparelho confirma. Se algo estiver estranho no iPhone, me diga o que apareceu e corrigimos.

## Limitações reais

- **Tela cheia:** o Safari do iPhone não tem tela cheia por botão. O jeito é o "Adicionar à Tela de Início" (passo 2).
- **Sons:** são **sintetizados no próprio aparelho** (sem arquivos, sem internet, sem custo). Soam como chuva/vento/ruído, não como gravação de verdade. O som só começa depois de um toque seu (regra do iOS) e **respeita a chave lateral de silêncio** do iPhone: se não ouvir nada, confira a chave e o volume. Se o iOS pausar a página em segundo plano, o som para.
- **Alarme:** o aviso do temporizador toca e vibra **só com o painel aberto na frente**. Se o iPhone bloquear a tela ou você sair do app, o iOS 12 pode pausar a página e o alarme atrasar até você voltar.
- **Clima:** vem do Open-Meteo (gratuito, sem chave, uso não comercial). Sem internet, o painel mostra o último dado salvo, esmaecido.
- **Tudo é salvo no próprio aparelho** (tarefas, notas, datas, ajustes). Cada aparelho tem a sua lista: o iPhone, o computador e o J5 não sincronizam entre si.
- **Foto de papel de parede:** é reduzida e guardada no aparelho; fotos muito grandes podem não caber, e aí o painel avisa.
- **Bateria:** painel ligado 24 h no carregador esquenta e gasta a bateria. Use o modo Descanso à noite e, se o aparelho ficar muito quente ou a bateria inchar, pare de usar.
