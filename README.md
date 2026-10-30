# MathLab: Laboratório de Matemática Interativa

Site educacional de Matemática para o Ensino Fundamental, criado pelo Prof. Alessandro Barbosa dos Santos (Prof. Alê Chocolate). Cada assunto reúne um simulador visual interativo e uma estação de desafios com questões geradas na hora, dicas graduadas, XP e níveis que se adaptam ao aluno.

**Ensinar • Investigar • Incluir • Transformar**

Demo: https://prof-ale.github.io/MathLab (também incorporado no Google Sites)

## Uso gratuito, direitos reservados

O MathLab é gratuito e continua sendo. Gratuito não quer dizer sem condições: **todos os direitos são reservados ao autor**, e usar, copiar, adaptar, alterar ou distribuir qualquer parte deste material **só é permitido com o crédito devido ao Prof. Alessandro Barbosa dos Santos (Prof. Alê Chocolate)**. Sem crédito, é proibido. Os termos completos estão no fim deste arquivo, na seção "Direitos e uso".

## Assuntos disponíveis

São 28 assuntos, organizados pelos cinco eixos da BNCC. O ano indica a série em que o assunto aparece na tela inicial. Os códigos de habilidade de cada assunto aparecem no card e no relatório.

**Números**
* 6º, Números naturais e sistema posicional: ordens, classes, valor posicional e comparação
* 6º, Adição e subtração: algoritmo, "vai um", empréstimo, propriedades e problemas
* 6º, Multiplicação e divisão: grupos, arranjos, resto, prova real e expressões
* 6º, Tabuada de multiplicação: fatos, padrões, fator que falta e múltiplos
* 6º, Tabuada de divisão: grupos iguais, operação inversa e casos especiais
* 6º, Múltiplos, divisores, MMC e MDC: sapos na reta e partilha em grupos iguais
* 6º, Primos e divisibilidade: crivo de Eratóstenes e fatoração em primos
* 6º, Frações: barras, pizzas, equivalência e operações
* 6º, Decimais e porcentagem: barra tripla com fração, decimal e porcentagem
* 6º, Expressões numéricas: máquina de passos, qual operação vem primeiro
* 7º, Potenciação e raiz quadrada: quadrado de lado n, n² quadradinhos e a raiz como lado
* 7º, Números inteiros: adição, subtração e a reta numérica
* 7º, Regras de sinais: saltos na reta para +, −, × e ÷

**Álgebra**
* 7º, Linguagem algébrica: máquina de funções, expressões e padrões
* 7º, Expressões equivalentes: duas máquinas, mesma saída, distributiva e fatoração
* 7º, Equação do 1º grau: balança de dois pratos
* 9º, Equação do 2º grau: parábola, raízes, discriminante e Bhaskara
* 9º, Funções: tabela, expressão e gráfico, função afim (coeficiente angular, zero, crescimento) e noções de função quadrática

**Geometria**
* 6º, Sólidos geométricos: poliedros, corpos redondos e planificações, com cena 3D (GeoGebra)
* 7º, Ângulos: classificação, complementares e triângulos
* 7º, O número π: volta do círculo desenrolada, tabela de raio, diâmetro, volta e razão C ÷ d, área do círculo, problemas históricos (25/8 dos babilônios, 22/7 de Arquimedes) e a história do π em nove paradas
* 7º, Plano cartesiano: coordenadas, quadrantes, reflexões e distância entre pontos
* 8º, Triângulos: soma dos ângulos, classificação e desigualdade triangular
* 8º, Áreas e perímetros: retângulo, triângulo, paralelogramo, trapézio e círculo
* 9º, Teorema de Pitágoras: quadrados sobre os lados
* 9º, Teorema de Tales: retas paralelas cortadas por transversais e proporções

**Grandezas e Medidas**
* 6º, Medidas: comprimento, massa, tempo e capacidade, com conversões e estimativas

**Probabilidade e Estatística**
* 8º, Probabilidade e estatística: dados, moedas e urnas, frequência relativa, média, mediana e moda

## Recursos pedagógicos

* Questões geradas na hora, com números e contextos sorteados e alternativas embaralhadas
* Três níveis por assunto, com subida e descida automáticas conforme os acertos de primeira
* Dicas em níveis: cada erro revela uma pista diferente, sem entregar a resposta
* Erros classificados: cada alternativa errada carrega o tipo de erro (por exemplo "somou em vez de multiplicar"), e o painel "Para reforçar" mostra os mais frequentes
* Simulador que não entrega a resposta: o resultado só aparece depois do acerto
* Pontuação (XP), títulos por nível e sequência diária de estudo
* Música de fundo e efeitos sonoros (opcionais)

## Para o professor

* Perfis de aluno e turma, com progresso próprio de cada perfil
* Relatório docente com histórico por tentativa, filtros por estudante, turma, módulo, habilidade BNCC e datas, e exportação em CSV
* Boletim do aluno e relatório da turma, para imprimir ou salvar em PDF
* Backup e restauração do progresso, com opção de desfazer a restauração
* Parecer da ADA (assistente pedagógica): o professor pede, vê exatamente o texto que será enviado, confirma, e a consulta fica registrada no navegador. Só vai um resumo com totais e erros típicos por assunto, sem nomes de estudantes. O campo "foco" é livre: se o professor digitar um nome ali, o nome segue junto, e o app avisa antes do envio
* Histórico guardado no banco do navegador (IndexedDB), com capacidade para até 50.000 respostas. O localStorage mantém só as últimas 300 como reserva
* Se o banco do navegador falhar, o app volta sozinho ao armazenamento simples e avisa

## Funciona sem internet

O MathLab pode ser instalado como aplicativo, no celular, no tablet ou no computador (botão "Instalar" do navegador). Depois da primeira visita com internet, todo o site funciona offline. Só duas partes precisam de conexão: o 3D do GeoGebra (que cai para um desenho 2D simples) e a consulta à ADA. O app mostra uma faixa de aviso quando não há internet.

Quando existir uma versão nova do arquivo `sw.js`, aparece o aviso "Há uma versão nova do MathLab pronta", com a opção de atualizar na hora ou depois. Uma versão nova do `index.html` chega sozinha na próxima visita com internet.

No painel "Identificação", a linha "Uso sem internet" mostra se o aparelho já está pronto.

## Acessibilidade (DUA)

* Três temas: noturno, claro e alto contraste, que também valem para o 3D do GeoGebra
* Ajuste do tamanho da fonte (A+ e A−), lembrado entre as visitas
* Botão 🔊 que lê a questão em voz alta (Web Speech API, pt-BR)
* Descrição do desenho de cada simulador para leitor de tela, atualizada em tempo real, sem revelar a resposta e sem narrar cada passo do controle
* Feedback anunciado por leitores de tela (aria-live)
* Navegação por teclado com foco visível e respeito a prefers-reduced-motion

## Privacidade e dados

Progresso, perfis e histórico ficam no navegador e no aparelho do aluno. Nada é enviado a servidores, com uma única exceção: o parecer da ADA, que só acontece quando o professor pede e confirma, como descrito acima. Para levar os dados a outro aparelho, use o backup JSON.

## Estrutura do projeto

```
MathLab/
├── index.html              # o site inteiro (HTML, CSS e JavaScript)
├── sw.js                   # service worker: uso sem internet
├── manifest.webmanifest    # dados de instalação do aplicativo
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   └── apple-touch-icon.png
├── testes-geradores.mjs    # testes dos geradores e dos simuladores (opcional, só para desenvolvimento)
└── README.md
```

Não há build nem instalação. O site é estático. O arquivo principal precisa se chamar `index.html`, com i minúsculo, porque o Netlify diferencia maiúsculas de minúsculas. O `sw.js`, o `manifest.webmanifest` e a pasta `icons` ficam na mesma pasta do `index.html`.

Dependência externa: o módulo de Sólidos carrega o GeoGebra (`deployggb.js`, de geogebra.org) apenas ao ser aberto. Sem internet, ele cai automaticamente para um desenho 2D simples e o resto do site funciona normalmente.

## Como rodar localmente

1. Clone o repositório:
   ```
   git clone https://github.com/Prof-Ale/MathLab.git
   cd MathLab
   ```
2. Para ver o site, abra o `index.html` no navegador (duplo clique).
3. Para testar a instalação e o uso sem internet, use um servidor local, porque o service worker não funciona com arquivo aberto direto:
   ```
   python3 -m http.server 8000
   ```
   e acesse http://localhost:8000.

## Publicação

**GitHub Pages:** envie todos os arquivos da estrutura acima para o repositório e ative o Pages na branch principal.

**Netlify:** escolha Add new site, Import an existing project e conecte o repositório. Deixe Build command em branco e Publish directory na raiz.

Depois de publicar, use Ctrl+F5 para evitar a versão antiga guardada em cache. Se mudar o `sw.js` ou a lista de arquivos guardados nele, altere também a constante `VERSAO` no início do `sw.js`.

## Incorporação no Google Sites

No Google Sites, use Inserir, Incorporar, Por URL. Cole o endereço publicado e ajuste a altura da área. A instalação como aplicativo não está disponível dentro da área incorporada: para instalar, abra o endereço direto no navegador.

## Como adicionar um novo assunto

Cada assunto é um objeto na lista `MODS`, dentro do `<script>` do `index.html`. As questões vêm de geradores por nível: funções que sorteiam os números e montam a questão com `mk()`.

```js
const MEU_GENS = {
  1: [ () => {
    const a = rnd(2, 9), b = rnd(2, 9);
    return mk({
      q: `Quanto é ${a} + ${b}?`,
      ok: String(a + b),                                  // alternativa correta
      bad: [                                              // [texto, tipo de erro, mensagem ao errar]
        [String(a * b), 'multiplicou em vez de somar', 'A operação é uma soma.'],
        [String(a - b), 'subtraiu em vez de somar',    'Confira o sinal da operação.']
      ],
      fill: () => String(rnd(2, 30)),                     // completa as alternativas que faltarem
      h: ['Dica leve', 'Dica mais forte'],                // uma dica por erro; a última se repete
      e: `${a} + ${b} = ${a + b}.`,                       // explicação mostrada ao acertar
      s: { a, b }                                         // valores iniciais do simulador
    });
  } ],
  2: [ /* geradores do nível 2 */ ],
  3: [ /* geradores do nível 3 */ ]
};

MODS.push({
  id: 'meuassunto',           // identificador único (usado no progresso salvo)
  ano: 7,                     // 6 a 9: define a seção da tela inicial
  ic: '➕', nome: 'Meu assunto', sub: 'Resumo curto do card',

  // Controles (sliders) do simulador
  ctl: [{ k: 'a', l: 'Primeiro número', min: -10, max: 10, v: 0 }],

  // Opcional: corrige combinações inválidas de valores
  fix: v => { /* ex.: v.b = Math.max(v.b, v.a) */ },

  // Texto exibido abaixo do desenho
  info: v => `a = ${v.a}`,

  // Desenho no canvas: c = contexto 2D, v = valores, W/H = tamanho, k = cores do tema
  draw(c, v, W, H, k) { /* ... */ },

  rod: 8,                     // questões por rodada
  gens: MEU_GENS
});
```

Depois de criar o objeto, faltam quatro passos:

1. **META:** acrescente uma entrada no objeto `META` com `eixo`, `bncc` (códigos da BNCC), `prereq`, `proximo`, `objetivos` e `tempo`.
2. **Ordem na tela inicial:** coloque o `id` na posição certa da lista `ORDEM_HOME`.
3. **Acessibilidade:** acrescente uma função com o mesmo `id` no bloco `DESC` ("5.3 Descrições dos desenhos para leitor de tela"). Ela descreve o desenho com os valores atuais, sem dar a resposta.
4. **Testes:** rode o `testes-geradores.mjs` (próxima seção). Para conferir as respostas por fora do app, acrescente uma entrada em `CONF`.

### Dicas de boas práticas

* Para o simulador não entregar a resposta, defina `liveInfo: true` no módulo e use a variável `locked` dentro de `info()`: ela vira `true` quando o aluno acerta.
* Cores disponíveis em `k` (seguem o tema ativo): `t` (texto), `m` (apagado), `a` e `b` (dourados), `c1` (ciano), `c2` e `pk` (rosa), `gr` (verde), `f` (preenchimento translúcido).
* Depois de criado o módulo, o card aparece sozinho na tela inicial, com o contador de progresso. Se o assunto estava na lista `SOON` ("Em breve"), ele é removido do aviso automaticamente quando o nome é o mesmo.

## Testes

O `testes-geradores.mjs` roda no Node, sem instalar nada, e não modifica o app. Coloque o arquivo ao lado do `index.html` e rode:

```
node testes-geradores.mjs
```

Opções: `--rodadas=N` (padrão 1000 sorteios por gerador), `--seed=N` (repete uma falha com a mesma semente), `--modulo=med,prob` (só esses módulos), `--estrito` (avisos também reprovam) e `--verbose` (lista os avisos).

Ele verifica a forma de cada questão, o texto (NaN, undefined, concordância), a resposta recalculada por fora do app nos módulos que têm conferência em `CONF`, o estado do simulador, a variedade de enunciados e a descrição de acessibilidade. O simulador é percorrido em uma grade de valores, inclusive fora do intervalo dos controles.

## Roteiro

Concluído:
* Eixos Números, Álgebra, Geometria, Grandezas e Medidas e Probabilidade e Estatística, com 28 assuntos, de Números naturais ao número π e às Funções do 9º ano
* Sólidos geométricos em 3D (GeoGebra), com planificação e construção
* Questões sorteadas, alternativas embaralhadas e níveis adaptativos
* Perfis, relatório docente, backup e restauração
* Boletim do aluno e relatório da turma em PDF por impressão
* Parecer da ADA com confirmação antes do envio e registro local
* Instalação como aplicativo e uso sem internet
* Histórico no IndexedDB, com reserva no localStorage
* Descrição dos desenhos para leitor de tela e tema do GeoGebra

Em andamento:
* Refatoração do código (hooks no lugar de wrappers, lista "Em breve" como dados, repositório dividido com build e testes)
* Leitura direta da interação do aluno no GeoGebra, em atividades 2D

## Observações

* As imagens do logotipo e do avatar do professor são carregadas do Google Drive. Se não carregarem, o site continua funcionando com alternativas.
* O progresso fica salvo apenas no navegador e no aparelho do aluno. Limpar os dados do site apaga o progresso, por isso o backup JSON é a garantia.

## Autor

Prof. Alessandro Barbosa dos Santos, o Prof. Alê Chocolate: Café, Matemática, Planos, Projetos, Vida. ☕ Mascotes: Oreo e Julieta 🐶

## Direitos e uso

© 2026 Prof. Alessandro Barbosa dos Santos (Prof. Alê Chocolate). Todos os direitos reservados.

O MathLab é de uso gratuito. O uso gratuito é uma permissão condicionada, e não abre mão dos direitos do autor.

**O que é permitido, desde que haja crédito:** usar o MathLab em sala de aula e em outros contextos educacionais, copiar, distribuir, adaptar e alterar o material.

**A condição, sempre:** dar o crédito devido ao Prof. Alessandro Barbosa dos Santos (Prof. Alê Chocolate), de forma clara e visível, com o nome do projeto e o link do original. Sem crédito, é proibido usar, alterar ou distribuir.

**Regras do crédito:**
* O crédito deve acompanhar o material derivado e o que for distribuído: rodapé do site, slides, apostilas, vídeos ou página do projeto.
* Não retire nem esconda os avisos de autoria que já estão no código, nos arquivos e na tela.
* A adaptação deve dizer que foi alterada e não pode sugerir que o autor a aprovou ou a apoia.

**Fica proibido sem autorização escrita do autor:** uso comercial (venda, assinatura, anúncios ou inclusão em produto ou serviço pago) e qualquer uso que apresente o MathLab, ou parte dele, como obra de outra pessoa.

Modelo de crédito:

> MathLab, criado pelo Prof. Alessandro Barbosa dos Santos (Prof. Alê Chocolate). Disponível em https://prof-ale.github.io/MathLab

Pedidos de autorização ou dúvidas: pelo perfil do autor no GitHub (Prof-Ale), na aba Issues deste repositório.

Este texto não substitui orientação jurídica. As imagens e marcas de terceiros citadas acima (GeoGebra, Google, Netlify e outros) pertencem aos seus respectivos titulares e seguem os termos deles.

## Nova aparência (skin v2)

O MathLab tem duas aparências. A nova abre por padrão e traz abertura com o logo, os cinco eixos em cartões, saudação pelo horário e o botão da assistente ADA. O botão "Voltar ao Clássico", no topo, devolve a tela anterior sem perder o progresso. A escolha fica gravada no navegador. A abertura aparece uma vez por sessão e espera o clique em "Entrar no laboratório" (ou em Pular, ou a tecla Esc). Quem usa "reduzir movimento" no aparelho vê a abertura sem animação.

A nova aparência é uma camada visual separada: não muda módulos, geradores, pontuação nem o registro de respostas. Dentro do código, ela ocupa um bloco de estilo (`skinCss`) e um bloco de script (`skinJs`) no fim do arquivo. Se o script falhar, o app continua no Clássico.

## Arena MathLab (modo local, para a sala)

A Arena é uma partida para projetor, em equipes ou individual, aberta pelo botão "Arena" no topo do MathLab (ou direto em `arena.html`).

**Como joga.** O professor monta a partida: participantes (equipes ou apelidos, até 8), nível (progressivo ou fixo), quantidade de questões (5 a 20), tempo por questão (15 a 60 segundos ou sem limite) e os assuntos de qualquer ano. A questão aparece grande, com a figura do simulador quando há. Com duas ou mais equipes, o professor registra a resposta de cada uma nos botões A a D e revela quando quiser. Com um só participante, ele clica na alternativa ou usa as teclas A a D. Ao revelar, aparecem a resposta, a explicação e o placar.

**Pontuação.** Acerto 100 pontos. Sequência de 3 acertos, mais 30. Sequência de 5 ou mais, mais 60. Erro ou sem resposta, zero. O bônus de rapidez (até 25 pontos) vem desligado: ele mede o tempo até o professor marcar a resposta, então só faz sentido se as equipes forem marcadas na ordem em que respondem. Empate fica empatado.

**Fim da partida.** Pódio, classificação, os tipos de engano mais comuns da sala (vindos da classificação de erros do MathLab, sem nomes) e as questões que mais desafiaram, com a explicação. Dá para imprimir ou salvar em PDF.

**Privacidade e isolamento.**
- A Arena usa só apelidos ou nomes de equipe e não grava nada no progresso do MathLab (XP, níveis, histórico de respostas).
- Guarda no aparelho apenas as últimas 30 partidas (data, quantidade de questões, primeiro lugar e pontos) e suas preferências (tema, fonte, som).
- Fica em dois arquivos próprios, `arena.html` e `arena.js`. O `index.html` só ganhou uma ponte de uma linha (`arenaPonte`) que entrega os geradores à Arena. Se a Arena falhar, o MathLab segue normal.
- O assunto Sólidos geométricos fica de fora, porque depende do 3D do GeoGebra.
- Publique `index.html`, `arena.html`, `arena.js` e `sw.js` juntos. A Arena precisa abrir por endereço de internet (o site do MathLab) ou servidor local. Abrir o arquivo direto do computador é bloqueado pelo navegador.

## Arena nos celulares (tempo real)

Na tela de configuração da Arena, o bloco "Jogar com celulares, em tempo real" abre uma sala. Cada aluno entra pelo celular, escolhe um apelido e responde. O professor conduz pelo projetor, como no modo local.

**Como joga.**
1. O professor escolhe assuntos, nível, quantidade de questões e tempo, e clica em "Abrir sala para celulares".
2. A tela mostra um código de 6 números e um QR Code. O aluno abre o endereço de `aluno.html`, digita o código e um apelido (ou aponta a câmera para o QR Code).
3. O professor vê os alunos entrando e pode remover um apelido. Ao começar, a sala fecha para novos alunos. Quem cair da internet volta sozinho com o mesmo apelido.
4. Em cada questão, o aluno vê o enunciado e quatro botões grandes (A, B, C, D, cada um com cor e forma). Figuras aparecem só no projetor. O professor acompanha quantos já responderam e revela quando quiser.
5. Na revelação, cada celular mostra acerto ou erro, pontos ganhos, posição e a explicação. O professor vê quantos escolheram cada alternativa.
6. No fim há pódio, classificação, tipos de engano mais comuns e as questões que mais desafiaram. "Encerrar a sala" apaga tudo do servidor.

**Pontuação.** A mesma do modo local (100 por acerto, sequência de 3 mais 30, sequência de 5 ou mais mais 60). No modo celulares o bônus de rapidez (até 25) vem ligado e usa o relógio do servidor, do instante em que a questão aparece até a resposta chegar. O professor pode desligar.

**Segurança e privacidade.**
- Só apelidos. O filtro barra palavras ofensivas (palavra inteira, para não barrar "Cassio"), telefone e endereço de internet.
- A resposta certa nunca vai para o servidor antes da revelação. A pontuação é calculada no computador do professor.
- As regras do banco (`firebase/database.rules.json`) impedem que aluno leia as respostas dos colegas, responda duas vezes, responda por outro, forje o horário, mude pontos ou mexa na sala. Foram testadas com um simulador oficial de regras (mais de 75 verificações) e com partidas simuladas de até 30 alunos.
- Cada sala é apagada quando o professor encerra. Se ele esquecer, a sala antiga é apagada na próxima vez que abrir uma.

**Arquivos novos.** `arena-host.js` (tela do professor), `arena-live.js` (conexão com o Firebase), `arena-config.js` (dados públicos do projeto Firebase), `arena-qr.js` (gerador de QR Code, biblioteca MIT, funciona sem internet), `aluno.html` e `aluno.js` (tela do celular). Se algum faltar ou o Firebase estiver bloqueado, a Arena local continua funcionando igual.

**Configuração única no Firebase.** Veja `firebase/LEIA-ME.md`. Resumo: ativar o login Anônimo, colar as regras de `firebase/database.rules.json` em Realtime Database, Regras, e conferir os domínios autorizados.

**Limites do plano gratuito (Spark).** 100 conexões simultâneas somando todas as salas do projeto (uma turma de até uns 70 alunos cabe com folga; duas turmas ao mesmo tempo ficam perto do limite) e 360 MB de download por dia, o que uma aula usa em pequena parte. Se a rede da escola bloquear o Firebase, o aviso aparece na hora e o modo local continua disponível.
