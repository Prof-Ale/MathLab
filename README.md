# MathLab: Laboratório de Matemática Interativa

Site educacional de Matemática para o Ensino Fundamental, criado pelo **Prof. Alê Chocolate**. Cada assunto reúne um **simulador visual interativo** e uma **estação de desafios** com questões geradas na hora, dicas graduadas, XP e níveis que se adaptam ao aluno.

> *Ensinar • Investigar • Incluir • Transformar*

**Demo:** [MathLab no Google Sites](https://sites.google.com/prof.educacao.sp.gov.br/mathlab-7ano-prof-alechocolate/in%C3%ADcio)

---

## Assuntos disponíveis

| Ano | Assunto | Simulador |
|-----|---------|-----------|
| 6º | Frações | Barra e pizza com numerador e denominador ajustáveis, mostrando fração, decimal e porcentagem |
| 6º | Sólidos geométricos | **Cena 3D (GeoGebra)** com cubo, paralelepípedo, prisma, pirâmide, cilindro, cone e esfera; planificação que abre e fecha; desafio de construção |
| 7º | Ângulos | Transferidor com ângulo móvel e classificação automática (agudo, reto, obtuso, raso, côncavo, giro) |
| 7º | Equação do 1º grau | Balança de dois pratos: o aluno tira o mesmo valor dos dois lados e descobre o x |
| 7º | Números inteiros | Reta numérica com adição, subtração e problemas de temperatura e saldo |
| 7º | Regras de sinais | Saltos na reta numérica para `+`, `−`, `×` e `÷`, incluindo divisão por zero e potências de base negativa |

**Em desenvolvimento:** Linguagem algébrica (7º).

## Recursos pedagógicos

- **Questões geradas na hora**, com números e contextos sorteados e alternativas embaralhadas
- **Três níveis por assunto**, com subida e descida automáticas conforme os acertos de primeira
- **Dicas em níveis:** cada erro revela uma pista diferente, sem entregar a resposta
- **Erros classificados:** cada alternativa errada carrega o tipo de erro (ex.: "somou em vez de multiplicar"), e o painel "Para reforçar" mostra os mais frequentes
- **Simulador que não entrega a resposta:** o resultado só aparece depois do acerto
- Pontuação (XP), títulos por nível e sequência diária de estudo
- Música de fundo e efeitos sonoros (opcionais)

## Para o professor

- Perfis de aluno e turma, com progresso próprio de cada perfil
- Relatório docente com histórico por tentativa, filtros e exportação em CSV
- Backup e restauração do progresso, com opção de desfazer a restauração
- Os dados ficam no navegador do aluno (`localStorage`); nada é enviado a servidores

## Acessibilidade (DUA)

- Três temas: noturno, claro e **alto contraste**
- Ajuste do tamanho da fonte (A+ / A-), lembrado entre as visitas
- Botão 🔊 que lê a questão em voz alta (Web Speech API, pt-BR)
- Feedback anunciado por leitores de tela (`aria-live`)
- Navegação por teclado com foco visível e respeito a `prefers-reduced-motion`

---

## Estrutura do projeto

```
mathlab/
├── index.html   # o site inteiro (HTML + CSS + JavaScript)
└── README.md
```

Não há build nem instalação. É um único arquivo estático.

**Dependência externa:** o módulo de Sólidos carrega o GeoGebra (`deployggb.js`, de geogebra.org) apenas ao ser aberto. Sem internet, ele cai automaticamente para um desenho 2D simples e o resto do site funciona normalmente.

> Importante: o arquivo precisa se chamar `index.html` (com **i minúsculo**). O Netlify diferencia maiúsculas de minúsculas.

## Como rodar localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/Prof-Ale/mathlab.git
   cd mathlab
   ```
2. Abra o `index.html` no navegador (duplo clique) ou use um servidor local:
   ```bash
   python3 -m http.server 8000
   ```
   e acesse `http://localhost:8000`.

## Publicação no Netlify

1. No Netlify, escolha **Add new site → Import an existing project** e conecte este repositório.
2. Deixe **Build command** em branco e **Publish directory** como `/` (raiz).
3. A cada `git push` na branch principal, o site é atualizado automaticamente.
4. Depois de publicar, use **Ctrl+F5** para evitar a versão antiga guardada em cache.

## Incorporação no Google Sites

1. No Google Sites, use **Inserir → Incorporar → Por URL**.
2. Cole o endereço do Netlify e ajuste a altura da área incorporada.

---

## Como adicionar um novo assunto

Cada assunto é um objeto na lista `MODS`, dentro do `<script>` do `index.html`. As questões vêm de **geradores por nível**: funções que sorteiam os números e montam a questão com `mk()`.

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
  ano: 7,                     // 6 ou 7: define a seção da tela inicial
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

**Dicas de boas práticas**
- Para o simulador **não entregar a resposta**, defina `liveInfo: true` no módulo e use a variável `locked` dentro de `info()`: ela vira `true` quando o aluno acerta.
- Cores disponíveis em `k` (seguem o tema ativo): `t` (texto), `m` (apagado), `a` e `b` (dourados), `c1` (ciano), `c2` e `pk` (rosa), `gr` (verde), `f` (preenchimento translúcido).
- Depois de criado o módulo, o card aparece sozinho na tela inicial, com o contador de progresso. Se o assunto estava na lista `SOON` ("Em breve"), ele é removido do aviso automaticamente.

## Roteiro

- [x] Frações
- [x] Ângulos
- [x] Equação do 1º grau
- [x] Números inteiros
- [x] Regras de sinais
- [x] Sólidos geométricos em 3D (GeoGebra), com planificação e construção
- [x] Questões sorteadas, alternativas embaralhadas e níveis adaptativos
- [x] Perfis, relatório docente, backup e restauração
- [ ] Linguagem algébrica: máquina de funções
- [ ] Relatório do aluno em PDF para impressão
- [ ] Mais questões de Ângulos (triângulos e polígonos)
- [ ] Leitura direta da interação do aluno no GeoGebra, em atividades 2D

## Observações

- As imagens do logotipo e do avatar do professor são carregadas do Google Drive. Se não carregarem, o site continua funcionando com alternativas.
- O progresso fica salvo apenas no navegador e no dispositivo do aluno.

## Autor

**Prof. Alê Chocolate**: Café, Matemática, Planos, Projetos, Vida. ☕
Mascotes: Oreo e Julieta 🐶

## Licença

Conteúdo educacional distribuído sob [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt-br): pode ser usado e adaptado com crédito ao autor, sem fins comerciais e com a mesma licença.
