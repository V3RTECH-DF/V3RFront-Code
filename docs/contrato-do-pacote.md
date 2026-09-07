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
traço de 2px na base do item, na cor de destaque. Logo com **40px de altura**
(largura livre, teto para marca muito comprida), divisor vertical de 1px por 40px.
Largura cheia, colada ao topo — **não** cartão centralizado.

Descartadas: compacta (118px) e ampla (168px). A ampla consome mais de um quarto
da altura útil somada à barra do WordPress, e os produtos da casa são cadastros e
listas, onde a altura faz falta.

## 3. Tipografia

**Exo 2**, embarcada no pacote (`assets/fonts/exo2-variable-latin.woff2`, fonte
variável, latin + latin-ext).

O **chrome do pacote** (`FamilyHeader`, `FamilyNav`, `AdminNotices`) usa a Exo 2
sempre, sem o consumidor fazer nada — é o CSS próprio das classes `.v3r-header`,
`.v3r-nav-*` e `.v3r-admin-notices`.

Para valer na **tela inteira**, que é o objetivo (duas tipografias na mesma tela
é o que se evita), o consumidor põe a classe `.v3r-typography` na raiz da própria
aplicação. O pacote não alcança essa raiz sozinho sem invadir o `body` do
wp-admin, o que seria pior — então essa classe é a fronteira, e em tela de
painel **não é opcional**: é parte da adoção do pacote, não um acabamento
opcional.

⚠️ **Exceção deliberada:** superfície que exibe a **identidade de uma
organização cliente** — caso do V3RLGPD, que renderiza a gestão numa página
pública com a marca, as cores e a fonte que a própria organização configurou —
**não** recebe `.v3r-typography`. Ali a regra da casa é "estrutura da família,
identidade da organização": a geometria e o comportamento são nossos, a
identidade visual é de quem hospeda. Forçar a nossa fonte nessa superfície
contrariaria a decisão de produto.

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

⚠️ **`--v3r-accent` nunca pinta texto — só o traço de 2px na base do item
ativo.** Várias cores de marca da família são claras (âmbar `#f2a603` no GE
Associados e no Premiado, laranja `#F49E27` no Solidário, `#da8c1c` no
V3RLGPD), e como cor de texto de 14px sobre fundo branco têm contraste
insuficiente — o item selecionado ficaria menos legível que os inativos, que
usam um cinza escuro. E o pacote não escolhe a cor para evitar esse problema:
ela é do produto, por definição arbitrária. O item ativo usa um neutro escuro
fixo do pacote como texto, e a cor de marca fica só no traço — elemento
gráfico, não texto, onde qualquer cor funciona. O item continua inequívoco
pela combinação traço colorido + texto mais escuro + peso. Esta é a regra que
impede reintroduzir `--v3r-accent` como `color` do item ativo.

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

⚠️ **O import da folha de estilo não é mais obrigatório (a partir da
v0.4.0).** Quem constrói para o navegador — o caso normal, hoje todo
consumidor usa Vite — já recebe o CSS do pacote junto, sem precisar importar
a folha. Quem quiser controlar o carregamento (por exemplo, para adiar ou
isolar o CSS) continua podendo importar `@v3rtech/v3r-front/styles.css`
explicitamente: é o mesmo arquivo, e importar os dois não duplica regra
nenhuma no resultado construído.

⚠️ **Duas variantes do JS publicado, escolhidas pela condição de resolução
(a partir da v0.5.0).** `dist/index.browser.js` embarca `import
'./v3r-front.css'` e é servido pela condição `"browser"` do `package.json` —
a que bundlers como Vite aplicam por padrão em build de cliente.
`dist/index.js` **não** importa CSS e é servido pelas condições
`"import"`/`"default"` — as que o Node aplica quando resolve `import`
diretamente, sem bundler. Antes da v0.5.0 havia um único `dist/index.js` com
o CSS injetado, e quem importava o pacote num executor de teste em Node sem
processamento de CSS (Vitest/Jest em ambiente Node puro, por exemplo)
recebia `TypeError: Unknown file extension ".css"` na subida — as duas
variantes existem para que nenhum consumidor precise contornar isso.

⚠️ Os campos legados `main` e `module` apontam para a variante **com** o CSS, de
propósito. Ferramenta antiga que ignore `exports` e caia neles recebe o estilo;
se por acaso for um executor Node, estoura na hora — alto e visível. O contrário
(apontar para a variante sem CSS) devolveria a tela desmontada em silêncio, que é
o defeito que esta versão existe para fechar.

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

**O pacote dimensiona o logo** — o consumidor passa a marca (imagem ou SVG,
em qualquer formato e proporção) e não precisa, nem deve, dar tamanho a ela.
O espaço do logo restringe altura (40px), não largura: a marca ocupa a altura
do espaço mantendo a própria proporção, com um teto de largura para uma marca
muito comprida não empurrar o título.

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

## 12. Guarda de rota no cliente — `canOpen` (a partir da v0.2.0)

Medido na adoção do RIT360 Flow (06/09/2026): plugin que roteia no cliente —
painel numa tela só, rota depois do `#`, que **nunca chega ao servidor** — não
é protegido pela camada 1 da guarda do WordPress. Nesse desenho, a conferência
do roteador **é a única guarda daquelas rotas**.

```ts
type AccessMap = Record<string, boolean>

function canOpen(map: AccessMap | null | undefined, slug: string): boolean
```

`AccessMap` é o formato exato em que `V3R\Core\Admin\Nav\Navigation::accessMap()`
entrega o mapa de acesso: um slug de tela para um booleano dizendo se a pessoa
logada pode abri-la.

A regra:

- slug presente no mapa → devolve o valor do mapa;
- **slug ausente do mapa → nega.** Desconhecido é negado.
- mapa ausente, nulo ou não-objeto → **nega**, sem lançar exceção.

É a mesma decisão que a biblioteca PHP já toma (`Navigation::canView()`
responde negativo para tela desconhecida). O custo do erro é assimétrico:
falhar fechado custa uma tela que não abre até alguém declará-la, visível na
hora; falhar aberto custa uma tela de configuração aberta para quem não devia,
e ninguém percebe.

⚠️ `canOpen` lê **o mapa de acesso**, nunca a árvore de navegação (`NavTree`,
contrato §6): uma tela pode estar autorizada no mapa sem aparecer em nenhum
grupo da navegação (tela oculta, acessível só por link direto), e precisa
continuar abrindo. Guarda que checar presença em `NavTree` em vez de em
`AccessMap` recusaria essa tela por engano — é o erro que a próxima pessoa
cometeria de boa-fé.

Pura: mesma entrada, mesma saída, sem efeito nenhum. Exportada junto com o
tipo `AccessMap` de `src/index.ts`.

## 13. Ferramenta de build — `@v3rtech/v3r-front/vite` (a partir da v0.6.0)

Correção da cascata do wp-admin, hoje reimplementada em cada plugin, movida
para peça instalável — subcaminho **separado** da entrada dos componentes,
porque é ferramenta de build em JavaScript (Vite/PostCSS), não peça de
interface: importar `@v3rtech/v3r-front` para desenhar a navegação nunca
carrega Vite nem PostCSS, e importar `@v3rtech/v3r-front/vite` no
`vite.config.ts` do plugin nunca carrega React.

### O defeito

O Tailwind 4 emite tudo dentro de `@layer`, e na cascata do CSS **a origem
sem camada vence a origem em camada antes de a especificidade ser
comparada** — o CSS do wp-admin não usa camadas, então ele derrota o CSS do
plugin mesmo quando o plugin "parece" mais específico. Corrigir exige
desembrulhar as camadas do bundle final e ancorar as regras no id da raiz da
aplicação do plugin, elevando a especificidade o suficiente para vencer
qualquer seletor de atributo/classe único que o wp-admin declare.

### As duas responsabilidades, e por que nenhuma resolve sozinha

1. **Ancorar o CSS do próprio plugin.** `base` e `utilities` (Tailwind) são
   desembrulhados de `@layer` **e** re-escopados no id da raiz. `theme`
   (variáveis `:root`/`:host`) e `properties` (reset de `--tw-*`) são só
   desembrulhados, **sem** re-escopo — re-escopá-los quebraria a herança
   (`:root` nunca casa como descendente de um id).
2. **Ancorar o CSS deste pacote na mesma raiz.** Consequência direta da
   primeira: uma vez que o plugin ancora o próprio reset no id, esse reset
   passa a vencer também o CSS do pacote compartilhado (`.v3r-nav__item` e
   companhia), que é publicado sem camada e sem escopo. O sintoma medido ao
   vivo (V3RLGPD): o componente de navegação aparece, monta, e só não marca
   o estado ativo — o traço de 2px na base do item some, porque
   `#raiz *`/`#raiz button` (1,0,0)/(1,0,1), ancorados para vencer o
   wp-admin, agora também vencem `.v3r-nav__item` (0,1,0), sem escopo. A
   correção dá ao CSS do pacote a MESMA âncora: uma vez em `#raiz
   .v3r-nav__item` (1,1,0), ele volta a vencer o reset ancorado pela regra
   normal da cascata — mais específico ganha.

### Por que o filtro é por caminho de módulo, e não por classe/propriedade

A responsabilidade 2 intercepta **só** o CSS cujo caminho do módulo resolvido
contém `/@v3rtech/v3r-front/` — nunca por nome de classe ou de propriedade.
Uma lista de propriedades descolaria na primeira versão nova do pacote, em
silêncio. E o adversário nem sempre é o Tailwind: no V3RLGPD, quem apagava o
pacote num dos bundles era um reset de elemento escrito à mão pelo próprio
plugin (`button { border: 0; }` ancorado), não o preflight do Tailwind — uma
ferramenta que só soubesse desembrulhar camadas não teria corrigido aquele
caso. Filtrando por caminho, a correção funciona **sem saber quem é o
adversário**: qualquer CSS ancorado na mesma raiz que vença por
especificidade é, por definição, coberto.

### O que a ferramenta NÃO toca

**Nenhuma folha do próprio plugin** é alterada pela parte que ancora o pacote
(responsabilidade 2) — ela só intercepta o módulo cujo caminho é o do pacote
compartilhado. E CSS de terceiro qualquer (outra biblioteca em
`node_modules`, sem `@layer` e fora do caminho do pacote) atravessa as duas
responsabilidades sem alteração: a responsabilidade 1 só reescreve o que
estiver dentro de `@layer base/components/utilities`; a responsabilidade 2 só
o que vier do caminho do pacote.

### Uso — uma chamada resolve as duas

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cascadeFix } from '@v3rtech/v3r-front/vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), ...cascadeFix('#meu-plugin-app')],
})
```

`scopeId` é o id da raiz da aplicação — o mesmo elemento em que
`--v3r-accent` é declarada (contrato §4). **A mesma peça serve mais de um
bundle do mesmo plugin**: um plugin com painel e área pública em builds
separados (dois `vite.config.ts`, duas raízes) chama `cascadeFix` uma vez
para cada `vite.config.ts`, passando o id de cada raiz — cada chamada ancora
só naquela raiz, sem as duas se confundirem.

⚠️ `cascadeFix` cobre o caso comum (bundle único, que importa e re-escopa o
CSS do pacote). Um bundle que **não** importa `@v3rtech/v3r-front` não
precisa da responsabilidade 2 — as peças `unwrapCssLayersPlugin` e
`rescopeVendorCssPlugin` também são exportadas individualmente para quem
precisar compor de outro jeito.

### Proteção do artefato de componentes

`scripts/verify-dist.mjs` reprova o build se `dist/index.js` ou
`dist/index.browser.js` (a entrada dos componentes) contiverem qualquer
rastro da ferramenta de build — `postcss` ou os nomes dos plugins Vite da
correção da cascata. `@v3rtech/v3r-front/vite` é gerado por uma passada de
build **separada** (`vite.config.tooling.ts`, entrada `src/vite/index.ts`),
com `vite` e `postcss` externos.
