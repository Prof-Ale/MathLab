# MathLab: Laboratório de Matemática Interativa

Site educacional de Matemática para o Ensino Fundamental, criado pelo **Prof. Alê Chocolate**. Cada assunto reúne um **simulador visual interativo** e uma **estação de desafios** com dicas graduadas, XP e níveis.

> *Ensinar • Investigar • Incluir • Transformar*

**Demo:** [https://sites.google.com/prof.educacao.sp.gov.br/mathlab-7ano-prof-alechocolate/in%C3%ADcio]

---

## Assuntos disponíveis

| Ano | Assunto | Simulador |
|-----|---------|-----------|
| 6º | Frações | Barra e pizza com numerador e denominador ajustáveis, mostrando fração, decimal e porcentagem |
| 7º | Ângulos | Transferidor com ângulo móvel e classificação automática (agudo, reto, obtuso, raso, côncavo, giro) |
| 7º | Equação do 1º grau | Balança de dois pratos: o aluno tira o mesmo valor dos dois lados e descobre o x |

**Em desenvolvimento:** Sólidos geométricos (6º), Números inteiros, Regras de sinais e Linguagem algébrica (7º).

## Recursos pedagógicos

- Desafios de múltipla escolha ligados ao simulador, que se ajusta a cada questão
- **Dicas em níveis**: cada erro revela uma pista diferente, sem entregar a resposta
- Pontuação (XP), combo e títulos por nível
- Progresso salvo no navegador do aluno (`localStorage`)
- Tela inicial organizada por ano e por assunto

## Acessibilidade (DUA)

- Três temas: noturno, claro e **alto contraste**
- Ajuste do tamanho da fonte (A+ / A-)
- Botão 🔊 que lê a questão em voz alta (Web Speech API, pt-BR)
- Feedback anunciado por leitores de tela (`aria-live`)
- Foco visível no teclado e respeito a `prefers-reduced-motion`

---

## Estrutura do projeto

```
mathlab/
├── index.html   # o site inteiro (HTML + CSS + JavaScript)
└── README.md
```

Não há dependências, build ou instalação. É um único arquivo estático.

## Como rodar localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/Prof-Ale/mathlab.git
   cd mathlab
   ```
2. Abra o `index.html` no navegador (duplo clique) ou, se preferir, use um servidor local:
   ```bash
   python3 -m http.server 8000
   ```
   e acesse `http://localhost:8000`.

## Publicação no Netlify

1. No Netlify, escolha **Add new site → Import an existing project** e conecte este repositório.
2. Deixe **Build command** em branco e **Publish directory** como `/` (raiz).
3. A cada `git push` na branch principal, o site é atualizado automaticamente.

## Incorporação no Google Sites

1. No Google Sites, use **Inserir → Incorporar → Por URL**.
2. Cole o endereço do Netlify e ajuste a altura da área incorporada.

---

## Como adicionar um novo assunto

Cada assunto é um objeto na lista `MODS`, dentro do `<script>` do `index.html`. Para criar um novo, copie um bloco existente e ajuste:

```js
{
  id: 'inteiros',          // identificador único (usado no progresso salvo)
  ano: 7,                  // 6 ou 7: define em qual seção da tela inicial aparece
  ic: '➕',                // emoji do card
  nome: 'Números inteiros',
  sub: 'Reta numérica e operações',

  // Controles (sliders) do simulador
  ctl: [{ k: 'p', l: 'Posição na reta', min: -10, max: 10, v: 0 }],

  // Opcional: corrige combinações inválidas de valores
  fix: v => { /* ex.: v.n = Math.min(v.n, v.d) */ },

  // Texto exibido abaixo do desenho
  info: v => `Posição: ${v.p}`,

  // Desenho no canvas. c = contexto 2D, v = valores dos sliders,
  // W/H = largura e altura, k = cores do tema atual
  draw(c, v, W, H, k) { /* ... */ },

  // Questões
  qs: [{
    q: 'Enunciado da questão',
    o: ['Alternativa A', 'Alternativa B', 'Alternativa C', 'Alternativa D'],
    c: 1,                                  // índice da alternativa correta (começa em 0)
    h: ['Dica leve', 'Dica mais forte'],   // uma dica por erro; a última se repete
    e: 'Explicação mostrada ao acertar.',
    s: { p: 3 }                            // valores iniciais do simulador nesta questão
  }]
}
```

Cores disponíveis em `k` (seguem o tema ativo): `t` (texto), `m` (apagado), `a` e `b` (dourados), `c1` (ciano), `c2` e `pk` (rosa), `f` (preenchimento translúcido).

Depois de criado o módulo, o card aparece sozinho na tela inicial, com o contador de progresso.

> Se o assunto estava na lista `SOON` (cards "Em breve"), remova a linha correspondente.

## Roteiro

- [ ] Sólidos geométricos: faces, vértices, arestas e relação de Euler
- [ ] Números inteiros: reta numérica
- [ ] Regras de sinais
- [ ] Linguagem algébrica: máquina de funções
- [ ] Restante do banco de questões de Ângulos (15 questões)
- [ ] Questões com números aleatórios e alternativas embaralhadas
- [ ] Revisão dos erros e relatório final do aluno
- [ ] Música de fundo 8-bit (opcional)

## Observações

- As imagens do logotipo e do avatar do professor são carregadas do Google Drive. Se não carregarem, o site continua funcionando com alternativas.
- O progresso fica salvo apenas no navegador e no dispositivo do aluno.

## Autor

**Prof. Alê Chocolate**: Café, Matemática, Planos, Projetos, Vida. ☕
Mascotes: Oreo e Julieta 🐶

## Licença

Conteúdo educacional distribuído sob [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt-br): pode ser usado e adaptado com crédito ao autor, sem fins comerciais e com a mesma licença.
