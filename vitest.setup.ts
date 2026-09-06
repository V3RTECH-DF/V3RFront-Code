import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Sem isto, componentes de um teste continuam montados no próximo — no caso
// do AdminNotices, o MutationObserver de um teste anterior sobrevive e
// disputa com o do teste seguinte por quem adota o aviso primeiro.
afterEach(() => {
  cleanup()
})
