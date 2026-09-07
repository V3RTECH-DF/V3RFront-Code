# Contrato do pacote de front da família

> O que o pacote entrega, o que o plugin fornece, e o que **não** se negocia por
> plugin. Decisões fechadas em 05–06/09/2026; issues `V3RCore-Code#35`
> (componente de navegação da família), `#25` (posição, nome e ícone da entrada
> no menu) e `#26` (a biblioteca não distribui peça de interface).

## 1. A divisão

**A biblioteca fixa geometria, comportamento e fonte. O plugin fornece a cor e o
conteúdo.**

Os números são do pacote justamente porque são o que faz produtos diferentes
parecerem a mesma casa — plugin escolhendo a própria altura dissolve a família
mesmo com todos usando a peça. A cor de destaque é do produto porque ela é
deliberadamente diferente em cada um.

## 2. A régua de tamanhos — densidade "confortável"

| Elemento | Altura | Fonte |
| --- | --- | --- |
| Cabeçalho | 64px | título 18px, versão 12px, ações 13px |
| Barra de grupos | 40px | 14px |
| Barra de abas do grupo ativo | 36px | 13px |
| **Total antes do conteúdo** | **140px** | |

Espaçamento entre itens: 24px na barra de grupos, 20px na de abas. Estado ativo:
traço de 2px na base do item, na cor de destaque. Logo 28px, divisor vertical de
1px. Largura cheia, colada ao topo — **não** cartão centralizado.

Descartadas: compacta (118px) e ampla (168px). A ampla consome mais de um quarto
da altura útil somada à barra do WordPress, e os produtos da casa são cadastros e
listas, onde a altura faz falta.

## 3. Tipografia

**Exo 2**, embarcada no pacote (`assets/fonts/exo2-variable-latin.woff2`, fonte
variável, latin + latin-ext), declarada para **a tela inteira do plugin**, não só
para o cabeçalho — duas tipografias na mesma tela é o que se evita.

## 4. Cor

Uma única variável CSS, fornecida pelo plugin:

```css
#meu-plugin-root { --v3r-accent: #602098; }
```

Ela pinta o estado ativo da navegação e o que mais precisar de destaque. **O
pacote não traz paleta** — a cor é deliberadamente diferente por produto (âmbar
no GE Associados e no Premiado, vermelho no V3REvent e no V3RLicense, roxo no
Flow, laranja no Solidário), e uma peça que trouxesse a própria cor apagaria a
identidade de cinco produtos.

## 5. Estilo próprio, sem depender do hospedeiro

O CSS do pacote é **próprio, sem `@layer`, com nomes de classe próprios**, e não
depende do Tailwind de ninguém.

⚠️ O motivo é concreto: o Tailwind 4 emite tudo dentro de `@layer`, e na cascata
do CSS **a origem sem camada vence a origem em camada antes de a especificidade
ser comparada**. O CSS do wp-admin não usa camadas — então, em plugin com
Tailwind "cru", o painel derrota o estilo do plugin sem ninguém ter escolhido
isso (é a `V3RCore-Code#36`). Um componente que dependesse do Tailwind do
hospedeiro herdaria esse defeito; escrevendo o próprio CSS sem camada, ele vence
de forma previsível em qualquer plugin, tenha ele corrigido a cascata ou não.

## 6. A árvore de navegação — a fronteira com o PHP

`FamilyNav` recebe a árvore **exatamente** como a v3r-core a entrega
(`V3R\Core\Admin\Nav\Navigation::tree()`), sem transformação no meio:

```ts
type ScreenNode = { type: 'screen'; slug: string; label: string }
type GroupNode  = { type: 'group'; key: string; label: string; screens: ScreenNode[] }
type NavTree    = Array<ScreenNode | GroupNode>
```

Regras que o **PHP** já garante e que o componente NÃO deve reimplementar:
grupo vazio não vem na árvore; grupo com uma tela só continua sendo grupo; sem
grupos declarados a árvore vem plana. O componente desenha o que recebe.

**Navegação plana é caso de primeira classe**: recebendo só nós de tela, o
componente desenha uma barra só, sem barra de grupos e sem caso especial em quem
consome.

## 7. Comportamento da navegação

- **Duas barras**: grupos em cima, abas do grupo ativo embaixo. Descartado o menu
  suspenso — trocar de tela dentro do grupo é o trajeto frequente, e com menu
  suspenso ele custa um clique a mais toda vez.
- **A barra de abas quebra em duas ou mais linhas** quando não couber. Nada é
  escondido, nada exige clique para ser descoberto, a ordem é sempre a mesma.
  ⚠️ Descartado o botão "mais": o que ficaria escondido dependeria da largura da
  tela de cada pessoa — a mesma aba visível num monitor e oculta num notebook.
  Isso atrapalha instrução ao usuário e atrapalha o manual, que é feito de
  capturas de tela.
  ⚠️ **Requisito de acabamento:** o alinhamento entre as linhas precisa ficar
  visualmente resolvido — não basta deixar quebrar.
- **Celular** (abaixo da largura em que o próprio WordPress colapsa a coluna do
  painel): a barra vira um botão de menu único. Fica para uma versão seguinte —
  administrar estes plugins pelo telefone é raro o bastante para tratar como
  exceção.

## 8. A área de avisos do painel

O WordPress realoca cada aviso do painel para depois de um marcador que as nossas
telas não têm, e ele acaba desenhado no meio do cabeçalho, entre o título e a
versão.

Hoje isso tem **três implementações independentes** na casa (GE Associados;
V3REvent/RIT360 Flow; RIT360 Premiado) e **três ausências totais** (V3RHelp,
V3RLGPD, RIT360 Solidário), onde o aviso cai no meio da tela e ninguém corrigiu.
A peça compartilhada não unifica um detalhe: **conserta um defeito em metade da
família.**

O componente adota os avisos existentes, planta o marcador que falta e observa a
tela para adotar os que aparecerem depois — os avisos são inseridos por outros
plugins em momentos que não controlamos.

## 9. Fora desta versão

O **atalho de busca de tela** (`Ctrl+K`) e o **botão de menu único no celular**.
Nenhum dos dois bloqueia o primeiro consumidor, e ambos são acréscimo sem quebrar
quem já adotou.

## 10. O que o plugin ainda faz por conta própria

Montar a própria tela dentro do container, rotear, e **avisar o cabeçalho quando
a tela muda** — o título é governado pelo roteador do plugin, não pelo pacote.

## 11. Superfície de API (implementação v0.1.0)

Três componentes, exportados de `src/index.ts`. Nenhum deles importa CSS
diretamente — quem embarca `import './styles.css'` (side-effect, contrato §5)
é `src/entry.ts`, a entrada real do bundle Vite; `index.ts`/`index.d.ts` ficam
livres de qualquer referência a arquivo de CSS, para o `.d.ts` publicado não
apontar para um módulo que não existe em `dist/` sob esse nome.

### `FamilyHeader`

```ts
interface FamilyHeaderProps {
  title: string
  version?: string
  logo?: ReactNode
  actions?: ReactNode
  className?: string
}
```

Sem `logo`, o divisor vertical some junto (não faz sentido separar o nada da
marca). `version` é só o número — o componente antepõe o "v".

### `FamilyNav`

```ts
interface FamilyNavProps {
  tree: NavTree          // exatamente o tipo do contrato §6
  activeSlug: string
  onNavigate: (slug: string) => void
  className?: string
}
```

- Árvore sem nenhum `GroupNode`: uma barra só, classe `.v3r-nav-flat`, com a
  densidade da **barra de grupos** (40px/14px). A densidade acompanha a
  posição na hierarquia, não o que o item aponta: sendo a barra do topo da
  tela, ela tem o tamanho da barra do topo em toda a família. O contrário
  faria dois produtos da mesma casa exibirem navegação principal de tamanhos
  diferentes.
- Árvore com `GroupNode`: barra de grupos (`.v3r-nav-groups`) sempre visível,
  listando cada nó de primeiro nível (grupo OU tela solta — a árvore pode
  misturar os dois). Barra de abas (`.v3r-nav-tabs`) só existe quando
  `activeSlug` pertence a um grupo, e lista as telas desse grupo.
- Clicar num grupo navega para a **primeira tela dele** (mesma escolha já
  em produção no `Layout.tsx` do GE Associados). Clicar numa tela navega
  para o slug exato dela.
- Quebra de linha é comportamento do CSS do pacote (`flex-wrap: wrap` +
  `row-gap`), não uma prop — não há como desligar.

### `AdminNotices`

```ts
interface AdminNoticesProps {
  className?: string
}
```

Sem props de comportamento: adota avisos automaticamente, no mount e por
`MutationObserver` depois. O plugin só decide onde posicionar o componente na
própria tela (contrato §10) — a união das três implementações da casa está
comentada no cabeçalho de `src/components/AdminNotices.tsx`.

### Tipos reexportados

`ScreenNode`, `GroupNode`, `NavNode`, `NavTree` — os mesmos do contrato §6,
reexportados de `src/types.ts` para quem monta a árvore do lado do plugin (em
geral, o código que converte a resposta PHP em objeto JS) não precisar
redeclarar o formato.

### Decisão registrada: densidade da barra única (`.v3r-nav-flat`)

O contrato fixa os números de duas barras (grupos 40px/14px, abas 36px/13px)
mas não dizia qual densidade vale quando existe **uma barra só** — caso de
árvore sem grupos. Adotado: **densidade de grupos (40px/14px)**.

A densidade acompanha a **posição na hierarquia**, não o que o item aponta.
Sendo a barra do topo da tela, ela tem o tamanho da barra do topo em toda a
família; o contrário faria dois produtos da mesma casa exibirem navegação
principal de tamanhos diferentes — exatamente o que a peça compartilhada
existe para impedir.
