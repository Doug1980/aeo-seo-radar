# TODO — Melhorias de evolução (prioridade alta)

## 1) Status do audit (pending vs running)
- [x] Decidir contrato único: iniciar com `pending` (recomendado) e mudar para `running` antes de iniciar jobs.


## 2) PageSpeed — remover API key hardcoded e adicionar timeout
- [x] Exigir `PAGESPEED_API_KEY` via env (sem fallback embutido).
- [x] Adicionar `AbortSignal.timeout(...)` no `fetch` do PageSpeed.


## 3) Frontend — remover localhost hardcoded
- [ ] Usar `NEXT_PUBLIC_API_BASE_URL` (com fallback para dev).
- [ ] Ajustar todas as chamadas em `useAudit.ts`.

## 4) (Depois) Robustecer parsing do Gemini
- [ ] Evitar falha de `JSON.parse` caso o modelo retorne texto extra.
- [ ] Registrar erro e manter audit coerente.

