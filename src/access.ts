/**
 * O mapa de acesso, exatamente como a v3r-core o entrega
 * (`V3R\Core\Admin\Nav\Navigation::accessMap()`): um slug de tela para um
 * booleano dizendo se a pessoa logada pode abri-la.
 */
export type AccessMap = Record<string, boolean>

/**
 * Responde "esta pessoa pode abrir esta rota?" a partir do mapa de acesso.
 *
 * Medido na adoção do RIT360 Flow (06/09/2026): plugin que roteia no cliente
 * — painel numa tela só, rota depois do `#`, que nunca chega ao servidor —
 * não é protegido pela camada 1 da guarda do WordPress. Nesse desenho, esta
 * função é a única guarda daquelas rotas.
 *
 * A regra, e o motivo de ela estar aqui em vez de em cada plugin:
 * - slug presente no mapa → devolve o valor do mapa;
 * - slug ausente do mapa → nega. Desconhecido é negado.
 * - mapa ausente, nulo ou não-objeto → nega.
 *
 * É a mesma decisão que a biblioteca PHP já toma
 * (`Navigation::canView()` responde negativo para tela desconhecida). O
 * custo do erro é assimétrico: falhar fechado custa uma tela que não abre
 * até alguém declará-la, visível na hora; falhar aberto custa uma tela de
 * configuração aberta para quem não devia, e ninguém percebe. Escrita como
 * regra em documento, cada consumidor decide de novo — e o segundo decide
 * ao contrário. Por isso ela mora aqui, e deixa de ser lembrável.
 *
 * Pura: mesma entrada, mesma saída, sem efeito nenhum.
 */
export function canOpen(map: AccessMap | null | undefined, slug: string): boolean {
  if (map === null || map === undefined || typeof map !== 'object' || Array.isArray(map)) {
    return false
  }

  return Object.prototype.hasOwnProperty.call(map, slug) ? map[slug] === true : false
}
