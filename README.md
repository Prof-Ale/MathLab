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

**Acessibilidade e ritmo no celular do aluno.** Uma barra no alto da tela oferece: A− e A+ (tamanho da letra), Alto contraste, Ouvir (lê o enunciado e as alternativas em voz alta, e depois a explicação), Modo calmo (tira a contagem de segundos e o vermelho de urgência) e Confirmar antes de enviar (o primeiro toque só marca a alternativa, e o aluno pode trocar antes de confirmar). As escolhas ficam guardadas no aparelho. O professor tem o botão "Mais 15 s para a turma" durante a questão (até 120 s no total), e o bônus de rapidez passa a usar o tempo total. A posição só aparece no celular de quem está entre os três primeiros. Os demais veem pontos, acertos e melhor sequência. Nada disso exige mudar as regras do Firebase.

**Segurança e privacidade.**
- Só apelidos. O filtro barra palavras ofensivas (palavra inteira, para não barrar "Cassio"), telefone e endereço de internet.
- A resposta certa nunca vai para o servidor antes da revelação. A pontuação é calculada no computador do professor.
- As regras do banco (`firebase/database.rules.json`) impedem que aluno leia as respostas dos colegas, responda duas vezes, responda por outro, forje o horário, mude pontos ou mexa na sala. Foram testadas com um simulador oficial de regras (mais de 75 verificações) e com partidas simuladas de até 30 alunos.
- Cada sala é apagada quando o professor encerra. Se ele esquecer, a sala antiga é apagada na próxima vez que abrir uma.

**Arquivos novos.** `arena-host.js` (tela do professor), `arena-live.js` (conexão com o Firebase), `arena-config.js` (dados públicos do projeto Firebase), `arena-qr.js` (gerador de QR Code, biblioteca MIT, funciona sem internet), `aluno.html` e `aluno.js` (tela do celular). Se algum faltar ou o Firebase estiver bloqueado, a Arena local continua funcionando igual.

**Configuração única no Firebase.** Veja `firebase/LEIA-ME.md`. Resumo: ativar o login Anônimo, colar as regras de `firebase/database.rules.json` em Realtime Database, Regras, e conferir os domínios autorizados.

**Limites do plano gratuito (Spark).** 100 conexões simultâneas somando todas as salas do projeto (uma turma de até uns 70 alunos cabe com folga; duas turmas ao mesmo tempo ficam perto do limite) e 360 MB de download por dia, o que uma aula usa em pequena parte. Se a rede da escola bloquear o Firebase, o aviso aparece na hora e o modo local continua disponível.

## Balança de equações (módulo novo)

Módulo `balanca`, 7º ano, eixo Álgebra (BNCC EF06MA14 e EF07MA18). Complementa o módulo "Equação do 1º grau" sem alterá-lo.
O simulador mostra uma balança de dois pratos com blocos de x e números soltos. Os controles definem a equação
(ax + b = dx + e), o passo da resolução (0 a 3) e uma chave "mexer só no prato esquerdo", que desequilibra a balança.
Números negativos aparecem como quadrados vazios. São 13 geradores em 3 níveis, todos elegíveis para a Arena
(local e nos celulares). Os testes de resposta ficam em `testes-geradores.mjs`.

## Probabilidade experimental (módulo novo)

Módulo `probexp`, 8º ano, eixo Probabilidade e Estatística (BNCC EF07MA34, EF08MA22 e EF09MA20). Complementa "Probabilidade e estatística".
Quatro modos: moeda (a frequência relativa se aproxima de 50% com mais lançamentos, a lei dos grandes números), roleta com
setores de cores diferentes, tabela dos dois dados (soma igual, pelo menos ou no máximo) e a porta do prêmio (manter ou trocar).
Os sorteios usam semente, então o mesmo estado mostra sempre o mesmo resultado. São 12 geradores em 3 níveis, elegíveis para a Arena.

## Cartas surpresa (Arena nos celulares)

Opção desligada por padrão, na seção "Jogar com celulares, em tempo real". Quando ligada, antes de algumas questões
(cerca de 40% das transições, nunca duas seguidas, nunca antes da primeira) o professor sorteia uma carta para a turma toda
e vira no projetor. Cartas: pontos em dobro, escudo da sequência (errar não zera a sequência), mais dez segundos, desafio da
turma (70% de acertos dá 50 pontos para todos) e dica do professor. Só efeitos positivos. O efeito é aplicado pelo painel do
professor, então os celulares e as regras do Firebase não mudam.

## Razão, proporção e grandezas (módulo novo)

Módulo `prop`, 7º ano, eixo Álgebra (BNCC EF07MA17, EF08MA12, EF08MA13 e EF09MA08). Quatro modos: proporção direta (reta pela origem),
proporção inversa (curva e retângulo de área constante), regra de três (direta e inversa, com os fatores nas setas) e partes proporcionais
(barra dividida). São 12 geradores em 3 níveis, elegíveis para a Arena. A trigonometria (seno, cosseno e tangente) fica reservada
para a etapa do Ensino Médio.

## Sistemas de equações (módulo novo)

Módulo `sist`, 8º ano, eixo Álgebra (BNCC EF08MA08). Três modos: gráfico com as duas retas e o ponto de cruzamento (inclui retas paralelas
e coincidentes), duas compras na papelaria e eliminação passo a passo. São 12 geradores em 3 níveis, elegíveis para a Arena.

## Porcentagem, juros e dinheiro (módulo novo)

Módulo `juros`, 8º ano, eixo Números (BNCC EF07MA02, EF08MA04 e EF09MA05). Três modos: aumento e desconto sucessivos com o fator multiplicador,
juros simples contra juros compostos e pagamento à vista contra parcelado. São 12 geradores em 3 níveis, todos com a resposta
conferida por cálculo independente nos testes, e elegíveis para a Arena.

## Volume, capacidade e litro (módulo novo)

Módulo `volume`, 7º ano, eixo Grandezas e Medidas (BNCC EF07MA30, EF08MA20 e EF08MA21). Três modos: bloco de cubinhos em perspectiva,
aquário com nível de água e tabela de unidades ligada ao cubo de 1 dm de aresta (1 dm³ = 1 litro, 1 cm³ = 1 mL). São 12 geradores em 3 níveis,
11 com resposta conferida por cálculo independente nos testes, e elegíveis para a Arena.

## Produtos notáveis (módulo novo)

Módulo `notaveis`, 8º ano, eixo Álgebra (BNCC EF08MA06 e EF09MA09). Três modos de quebra-cabeça de áreas: quadrado da soma, quadrado da diferença
e soma pela diferença (figura em L que vira retângulo). São 12 geradores em 3 níveis, todos com a resposta conferida por cálculo independente
nos testes, e elegíveis para a Arena.

## Polígonos regulares e mosaicos (módulo novo)

Módulo `poligonos`, 7º ano, eixo Geometria (BNCC EF07MA27 e EF07MA28). Três modos: triângulos dentro do polígono (soma dos ângulos internos descoberta
antes da fórmula), ângulo interno e externo de polígono regular e mosaico ao redor de um vértice (quais polígonos fecham 360°). São 12 geradores
em 3 níveis, todos com a resposta conferida por cálculo independente nos testes, e elegíveis para a Arena.

## Dízimas, fração geratriz e notação científica (módulo novo)

Módulo `dizimas`, 8º ano, eixo Números (BNCC EF07MA10, EF08MA01, EF08MA05 e EF09MA04). Três modos: divisão passo a passo com os restos (o período aparece quando o
resto repete), fração geratriz por multiplicar e subtrair e notação científica com a vírgula andando. São 12 geradores em 3 níveis, todos com a resposta
conferida por cálculo independente nos testes, e elegíveis para a Arena.

## Números irracionais e espiral de Teodoro (módulo novo)

Módulo `irracionais`, 9º ano, eixo Números (BNCC EF09MA01, EF09MA02 e EF09MA03). Três modos: espiral de Teodoro desenhada com triângulos retângulos (as
hipotenusas aparecem como √2, √3 e assim por diante, e viram inteiros em √4, √9 e √16), reta numérica com zoom em décimos e cartões de classificação em
racional ou irracional. São 12 geradores em 3 níveis, todos com a resposta conferida por cálculo independente nos testes, e elegíveis para a Arena.
O desenho é feito no próprio simulador e funciona sem internet. Uma versão com GeoGebra pode vir depois como camada à parte.

## Simetrias: reflexão, rotação e translação (módulo novo)

Módulo `simetria`, 7º ano, eixo Geometria (BNCC EF07MA21 e EF08MA18). Uma figura em forma de letra F, que não tem simetria própria, mostra bem cada
transformação: reflexão em eixos e em retas x = m ou y = m, rotação de 90°, 180° e 270° em torno da origem e translação por um vetor. O aluno move o ponto A
e vê as coordenadas da imagem. São 12 geradores em 3 níveis, incluindo composições (a ordem importa), todos com a resposta conferida por cálculo independente
nos testes, e elegíveis para a Arena.

## Semelhança, ampliação e redução (módulo novo)

Módulo `semelhanca`, 9º ano, eixo Geometria (BNCC EF05MA18, EF06MA21, EF06MA29 e EF09MA12). Três modos: ampliação e redução em malha (lados e perímetro
multiplicados pela razão, área pelo quadrado da razão), triângulos retângulos semelhantes com os mesmos ângulos e sombra e altura no mesmo instante, desenhados
em escala. São 13 geradores em 3 níveis, incluindo os critérios AA, LLL e LAL, todos com a resposta conferida por cálculo independente nos testes, e
elegíveis para a Arena. O Teorema de Tales continua no módulo próprio, que não foi alterado.

## Gráficos e histograma (módulo novo)

Módulo `graficos`, 9º ano, eixo Probabilidade e Estatística (BNCC EF08MA23, EF08MA24, EF09MA21 e EF09MA22). Três modos: gráfico de colunas com início do eixo ajustável
(mostra como o eixo truncado exagera uma diferença), histograma de 20 notas com amplitude de classe ajustável e gráfico de setores com a conversão de porcentagem em ângulo.
São 12 geradores em 3 níveis, incluindo escolha do gráfico adequado, número de classes, frequência relativa e a diferença entre censo e amostra. Todos têm a resposta
conferida por cálculo independente nos testes e são elegíveis para a Arena. As médias, a mediana e a moda continuam no módulo de probabilidade e estatística.

## Sequências e padrões (módulo novo)

Módulo `sequencias`, 7º ano, eixo Álgebra (BNCC EF07MA13 a EF07MA16, EF08MA10 e EF08MA11). Três modos: sequência que soma a razão, fila de triângulos ou quadrados de palitos e
sequência que multiplica pela razão, com os termos desenhados em barras. São 12 geradores em 3 níveis: próximo termo, razão, termo da posição n, posição de um termo, termo geral
(an = rn + c), quantas figuras cabem com certo número de palitos, regra recursiva e a pergunta se um número faz parte da sequência. Todos têm a resposta conferida por cálculo
independente nos testes e são elegíveis para a Arena. A contagem (princípio multiplicativo) fica para o módulo seguinte.

## Contagem e possibilidades (módulo novo)

Módulo `contagem`, 8º ano, eixo Números (BNCC EF05MA09 e EF08MA03). Três modos: quadro de combinações (camisetas e bermudas), árvore de possibilidades com até três escolhas e senhas e filas
com e sem repetição, com as caixas mostrando quantas opções cada posição tem. São 12 geradores em 3 níveis: princípio multiplicativo com duas e três escolhas, senhas, filas, pódio,
números de 2 e 3 algarismos, combinações proibidas, anagramas, fatorial e apertos de mão. Todos têm a resposta conferida por cálculo independente nos testes e são elegíveis para a Arena.

## Vistas ortogonais e cilindro (módulo novo, v3.7)
9º ano, Geometria (EF09MA17 e EF09MA19). Três modos: vistas de pilhas de cubos (frente, lado e de cima), volume do cilindro com litros (π = 3,14) e cilindro dentro de uma caixa (espaço vazio). 12 geradores em 3 níveis, com conferência independente das respostas em testes-geradores.mjs. Não testado em Safari/iOS nem com leitor de tela.

## Quadriláteros e congruência (módulo novo, v3.8)
Geometria, a partir do 6º ano (EF06MA18, EF06MA20 e EF08MA14). Um só desenho que muda de nome conforme os lados e o ângulo: quadrado, retângulo, losango, paralelogramo e trapézio, com marcas de lados iguais, setas de lados paralelos, ângulos retos e diagonais. 12 geradores em 3 níveis: classificar, perímetro, ângulos e soma de 360°, diagonais e Pitágoras, e congruência de triângulos (LLL e LAL).
Decisão de conteúdo: neste app o trapézio tem um único par de lados paralelos. Isso aparece no enunciado da questão de classificação para não gerar dúvida.

## Paralelas e transversal (módulo novo, v3.9)
Geometria, 7º e 9º ano (EF07MA23 e EF09MA10). Duas paralelas cortadas por uma transversal, com os oito ângulos numerados, inclinação ajustável e destaque dos seis pares: correspondentes, alternos internos e externos, colaterais internos e externos e opostos pelo vértice. 12 geradores em 3 níveis: nomear o par, iguais ou suplementares, equações com x, soma dos ângulos do triângulo e ângulo externo.

## Ângulos na circunferência (módulo novo, v3.10)
Geometria, 9º ano (EF09MA11). Circunferência com os pontos A, B e P: o ângulo central é igual ao arco e o inscrito é a metade. Três modos: central e inscrito, diâmetro (inscrito sempre reto) e dois inscritos no mesmo arco. 12 geradores em 3 níveis: arco, central e inscrito, triângulo isósceles AOB, equações com x, triângulo inscrito e triângulo com lado no diâmetro.

## Fechamento da auditoria BNCC (v3.11)
Cinco módulos novos para as habilidades que estavam só em parte: Estimativas e arredondamento (EF06MA12), Ler tabelas e gráficos (EF06MA31, EF06MA32, EF07MA37), Multiplicar e dividir racionais (EF07MA11, EF07MA12), Razões entre grandezas diferentes (EF09MA07) e Rigidez dos triângulos (EF07MA25). Também foram incluídos no registro os códigos que já estavam cobertos no conteúdo: EF06MA15 (razão e proporção), EF07MA37 (gráficos) e EF08MA07 (sistemas).

## Fase 3: Ensino Médio (v4.0)
Começa a terceira fase do projeto (1ª fase Ensino Fundamental, 2ª fase Arena, 3ª fase Ensino Médio). Os módulos do Médio recebem o selo "1ª EM", "2ª EM" ou "3ª EM" nos cartões, na Home e no filtro por ano da Arena, e citam os códigos EM13MAT da BNCC.

Lote 1, todos na 1ª série, cada um com 12 geradores em 3 níveis, resposta conferida por cálculo independente nos testes e elegíveis para a Arena:
- `trigret` Trigonometria no triângulo retângulo (EM13MAT308): oposto, adjacente, hipotenusa, seno, cosseno e tangente, ângulos de 30°, 45° e 60°, rampa, sombra e cabo.
- `funcafim` Função afim (EM13MAT302, EM13MAT401, EM13MAT501): taxa de variação, zero, sinal, inequação, duas retas com ponto de encontro, custo e equilíbrio.
- `funcquad` Função quadrática (EM13MAT302, EM13MAT402, EM13MAT502, EM13MAT503): concavidade, vértice, raízes, valor máximo ou mínimo, cerca, receita e lançamento.
- `pa` Progressão aritmética (EM13MAT507): razão, termo geral, soma e soma de Gauss.
- `pg` Progressão geométrica (EM13MAT508 e EM13MAT304): razão, termo geral, soma finita e infinita, duplicação e meia-vida.

Observação: o Ensino Fundamental não foi alterado.

## Lote 2 do Ensino Médio (v4.1)

Cinco módulos novos na 1ª EM:
- conj: Conjuntos e intervalos (Venn, intervalos reais, contagens). Não há habilidade EM13 própria, o objetivo cita o Currículo Paulista.
- notcient: Notação científica (conversão, produto, divisão, ordem de grandeza). Regra de ordem de grandeza: mantissa a partir de 3,16 sobe a potência, e o enunciado diz isso.
- funcexp: Função exponencial (EM13MAT304, EM13MAT101).
- log: Logaritmos, pH e escala Richter (EM13MAT305).
- matfin: Juros compostos e inflação (EM13MAT303, EM13MAT104).

## Ângulos de triângulos e quadriláteros (v4.2)

Módulo novo `angpol`, 7º ano (EF07MA24, EF07MA27), inspirado no applet do GeoGebra sugerido pelo professor.
- Figura: triângulo ou quadrilátero. Os ângulos A, B e C são editáveis por controle deslizante. O último ângulo é calculado (180° ou 360° menos a soma), então a figura sempre fecha.
- Modo 0, internos: arcos coloridos, ângulo reto com quadradinho, soma e classificação do triângulo.
- Modo 1, externos: prolongamento dos lados, ângulo externo em cada vértice, soma 360° e a relação externo = soma dos dois internos dos outros vértices.
- Modo 2, juntar: os ângulos reunidos em um ângulo raso (triângulo) ou numa volta (quadrilátero).
- 12 geradores de questões em 3 níveis. Valores permitidos: triângulo com ângulos de 20° a 140°, quadrilátero convexo com ângulos de 30° a 150°.

## Arrastar vértices e "Descubra o x" (v4.3)

- Ângulos de triângulos e quadriláteros (`angpol`): agora os vértices podem ser arrastados com o dedo ou o mouse nos modos internos e externos. No triângulo há ímãs em 30°, 45°, 60°, 90°, 120° e 135°. No quadrilátero a figura se mantém convexa, com ângulos de 30° a 150°. Durante uma questão com valores escondidos o arraste fica desligado, para a figura não contradizer o enunciado. Os controles deslizantes continuam funcionando.
- Módulo novo `angx`, Descubra o x nos ângulos (7º ano, EF07MA18 e EF07MA24): os ângulos aparecem escritos com x. O aluno mexe no x, uma barra de soma mostra quanto falta ou passou de 180° ou 360°, e o controle "Equação passo a passo" monta a equação (1 montar, 2 simplificar, 3 resolver). Inclui exercícios de ângulo externo do triângulo. 12 geradores de questões em 3 níveis, incluindo isósceles e paralelogramo com x.
- Mudança no núcleo: `ajustar()` aceita uma altura própria do módulo (`alt`). Sem `alt`, tudo continua com 260 px como antes.

## Lote 3 do Ensino Médio (v4.4)

Cinco módulos novos na 1ª EM, cada um com 12 geradores em 3 níveis:
- ciclotrig: Ciclo trigonométrico (seno e cosseno no círculo, radianos, quadrantes e simetria). EM13MAT306.
- functrig: Funções seno e cosseno (amplitude, período, imagem, mudança de A, B e D, problemas de maré e roda-gigante). EM13MAT306.
- leistrig: Lei dos senos e dos cossenos (circunferência circunscrita, lados, ângulos, área, problemas de distância). EM13MAT308.
- combinatoria: Análise combinatória (fatorial, permutação, arranjo, combinação, triângulo de Pascal, anagramas). EM13MAT310.
- matriz: Matrizes e determinantes (soma, produto, transposta, determinante como área do paralelogramo). Não há habilidade EM13 própria, o objetivo cita o Currículo Paulista.

Observação: o Ensino Fundamental e os módulos anteriores não foram alterados.

## Lote 4 do Ensino Médio (v4.5)

Cinco módulos novos na 1ª EM, cada um com 12 geradores em 3 níveis:
- probcond: Probabilidade condicional (urna com e sem reposição em árvore, tabela de dupla entrada, eventos independentes). EM13MAT311.
- estatdisp: Média, mediana e desvio padrão (pontos na reta, desvios em relação à média, variância, desvio padrão, média ponderada). EM13MAT316.
- geoesp: Sólidos, área e volume (prisma, cilindro, cone, pirâmide quadrangular e esfera, com geratriz e apótema). EM13MAT309.
- ga_reta: Geometria analítica, ponto e reta (distância, ponto médio, coeficiente angular, equação reduzida, paralelas e perpendiculares). Não há habilidade EM13 própria, o objetivo cita o Currículo Paulista.
- ga_circ: Geometria analítica, circunferência (equação reduzida e geral, posição de ponto e de reta). Mesma observação do módulo anterior.

Observação: confira os códigos EM13 no texto oficial da BNCC antes de publicar. O Ensino Fundamental e os módulos anteriores não foram alterados. Os módulos ga_reta, ga_circ e geoesp usam altura de desenho maior (campo alt).

## Relatório pedagógico da Arena (v4.6)

Arquivo novo: `arena-relatorio.js`, carregado pelo `arena.html` depois do `arena-host.js`. Nenhuma regra, pontuação ou integração com o Firebase foi alterada.

O que faz:
1. No pódio de cada partida (local ou por celulares), guarda um resumo neste aparelho (`localStorage`, chave `mathlab-arena-rel`, até 40 partidas).
2. Botão "Relatório pedagógico desta partida": acerto por assunto, erros mais comuns com o que retomar, questões que mais desafiaram e sugestões para a próxima aula (usa pré-requisitos e próximos assuntos do MathLab).
3. Na tela inicial da Arena, "Relatório pedagógico acumulado" com filtro por turma, planilha CSV e opção de apagar.
4. Campo opcional de turma e campo de observações do professor. Impressão ou PDF pelo navegador.

Privacidade: guarda só apelidos agregados e contagens de erro por tipo, sem listar quem errou. Os dados ficam só no aparelho.
Limites: testado em partida local simulada no Chromium. O modo por celulares usa os mesmos dados, mas foi testado só por leitura do código. Safari e iOS não testados.
