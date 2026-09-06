# @v3rtech/v3r-front

Peça de tela compartilhada pelos plugins WordPress da família V3RTECH/RIT:
**cabeçalho**, **barra de navegação** e **área de avisos do painel**.

Não é biblioteca de uso geral: existe para que a próxima tela da família nasça
igual às outras, em vez de ser padronizada depois.

## Por que é um pacote de front, e não parte da v3r-core

A `v3rtech/v3r-core` é biblioteca **PHP**, embutida em cada plugin pelo Strauss.
Esse encanamento resolve um problema do PHP, e empurrar tela por ele custa caro
de duas formas: no empacotamento dos plugins a tela é compilada **antes** de a
biblioteca chegar, e um componente entregue como arquivo solto não compõe com o
React de quem já tem tela própria.

Como pacote de front, cada plugin declara a dependência e **embute a própria
cópia** no pacote dele. Dois produtos nossos com versões diferentes na mesma
instalação do WordPress não se enxergam — o mesmo isolamento que a prefixação dá
ao PHP, sem nada inventado por nós.

## A fronteira com a v3r-core é dado, não código

A **v3r-core governa**: declara telas, resolve permissão e entrega a árvore de
navegação já filtrada (ver `docs/navegacao-do-painel.md` lá).
Este pacote **desenha**: recebe essa árvore como dado e a apresenta.

Os dois versionam separado, e um não arrasta o outro.

## Instalação

```
npm install github:V3RTECH-DF/V3RFront-Code#v0.1.0
```

Fixe sempre uma tag. Sem ela, o build de cada máquina pega um estado diferente
da branch principal.

## Uso

```tsx
import { FamilyHeader, FamilyNav, AdminNotices } from '@v3rtech/v3r-front'
import '@v3rtech/v3r-front/styles.css'
```

O contrato completo — propriedades, forma da árvore, cor de destaque e a régua
de tamanhos — está em `docs/contrato-do-pacote.md`.
