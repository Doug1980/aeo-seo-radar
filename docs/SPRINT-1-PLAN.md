# Sprint 1 — Plano técnico

Objetivo do sprint: transformar a auditoria de "scores + recomendações genéricas"
em uma entrega **específica e acionável**. Três incrementos, nesta ordem de
dependência:

1. **Enriquecer achados** (fundação) — coletar os problemas concretos do HTML.
2. **Prompt pronto** — gerar um prompt remediador a partir desses achados.
3. **Plano de ação priorizado** — ordenar as recomendações por "faça primeiro".

Princípio: uma fonte de verdade. Os mesmos `findings` alimentam as
recomendações da IA, o prompt e (no Sprint 2) o relatório.

---

## 1. Enriquecer achados

### 1.1 Novo tipo compartilhado

`packages/shared/src/index.ts` — adicionar `AuditFindings` e incluir em
`DomainAudit`:

```ts
export interface AuditFindings {
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  h1Count: number;
  h1Text: string | null;
  canonical: string | null;
  lang: string | null;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasOgImage: boolean;
  hasTwitterCard: boolean;
  hasViewport: boolean;
  robots: string | null;      // conteúdo da meta robots (ex.: "noindex")
  schemaTypes: string[];      // reaproveita a extração de JSON-LD já existente
  isLikelyCSR: boolean;
}

export interface DomainAudit {
  // ...campos atuais...
  findings?: AuditFindings;   // opcional: auditorias antigas não têm
}
```

Manter `findings` opcional preserva compatibilidade com registros antigos
(que virão como `undefined`).

### 1.2 Extração no analisador

`apps/api/src/services/schema.ts` — o `analyzeSchema` já baixa o HTML e já
calcula `hasOgTitle`, `hasOgDescription`, `hasCanonical`,
`hasMetaDescription`. Hoje esses sinais são descartados após somar o score.
Mudanças:

- Adicionar `findings: AuditFindings` ao `SchemaResult` retornado.
- Extrair, do mesmo HTML (sem novo fetch), via regex:
  - `title` → `<title>...</title>`
  - `metaDescription` → `content` de `<meta name="description">`
  - `h1Count` / `h1Text` → ocorrências de `<h1>`
  - `canonical` → `href` de `<link rel="canonical">`
  - `lang` → atributo `lang` do `<html>`
  - `hasOgImage`, `hasTwitterCard`, `hasViewport`
  - `robots` → `content` de `<meta name="robots">`
  - `schemaTypes` → reaproveitar o array `types` que já existe

Sem novas dependências — segue a abordagem de regex já usada no arquivo.
Extrair numa função auxiliar `extractOnPageSignals(html)` para manter o
`analyzeSchema` legível.

### 1.3 Persistência

`apps/api/src/db/schema.ts` — nova coluna:

```ts
findings: jsonb("findings").$type<AuditFindings>(),
```

Gerar a migration com o fluxo que já existe:

```bash
npm run db:generate -w @aeo-seo-radar/api   # cria o SQL da migration
npm run db:migrate  -w @aeo-seo-radar/api   # aplica (local e depois no Railway)
```

Adicionar coluna `jsonb` anulável é retrocompatível — não quebra dados atuais.

### 1.4 Montagem e resposta

- `apps/api/src/services/auditService.ts` — montar o objeto `findings` a partir
  do `schemaResult` e gravar junto no `db.update(...).set({ ..., findings })`.
- `apps/api/src/routes/audit.ts` — incluir `findings` no `toAuditResponse`,
  para o front recebê-lo.

### 1.5 Recomendações mais específicas (o ganho de qualidade)

`apps/api/src/services/groq.ts` — mudar a assinatura para
`generateRecommendations(domain, scores, findings)` e injetar os problemas
concretos no prompt, em vez de só os scores. Ex.:

```
Problemas detectados:
- Meta description: AUSENTE
- H1 na página: 0
- Canonical: ausente
- Schema JSON-LD presente: WebSite (falta Organization, FAQPage)
- Open Graph: título sim, imagem não
```

Assim o modelo para de "adivinhar pelo score" e passa a recomendar em cima do
que realmente falta.

---

## 2. Prompt pronto

Feito 100% no front, a partir do `DomainAudit` (scores + findings +
recomendações). Custo zero de LLM, instantâneo.

- `apps/web/app/lib/prompt.ts` — função pura
  `buildRemediationPrompt(audit: DomainAudit): string` que monta um prompt em
  markdown com: contexto (papel de especialista SEO/AEO), o domínio, os scores,
  a lista de problemas dos `findings`, as recomendações priorizadas, e a
  instrução final ("para cada item, devolva o código/conteúdo corrigido pronto
  para colar").
- `apps/web/app/components/PromptCard.tsx` — bloco com o prompt e um botão
  "Copiar prompt para IA" (`navigator.clipboard.writeText`), com feedback local
  "Copiado ✓" (estado `useState`, sem dependência de toast).
- `apps/web/app/page.tsx` — renderizar o `PromptCard` quando a auditoria estiver
  `completed`.

Teste: `prompt.test.ts` valida que o prompt inclui domínio, um problema
conhecido e as recomendações (função pura, fácil de testar).

---

## 3. Plano de ação priorizado

- `apps/web/app/lib/priority.ts` — função pura
  `prioritize(recs: Recommendation[]): Recommendation[]` que ordena por peso de
  `severity` (critical > warning > info) e `impact` (high > medium > low), com
  desempate por `effort` (menor esforço primeiro = "ganho rápido"). Também
  expõe um helper `isQuickWin(rec)` (impact high + effort low).
- `apps/web/app/components/RecommendationCard.tsx` — aceitar um selo opcional
  "Ganho rápido" quando `isQuickWin`.
- `apps/web/app/page.tsx` — passar as recomendações por `prioritize` antes de
  renderizar; o topo da lista vira o "faça primeiro" natural.

Teste: `priority.test.ts` valida a ordenação e a marcação de quick win.

---

## Arquivos tocados (resumo)

Back-end:
- `packages/shared/src/index.ts` — tipo `AuditFindings` + `DomainAudit.findings`
- `apps/api/src/services/schema.ts` — extração de sinais on-page
- `apps/api/src/db/schema.ts` — coluna `findings` (+ migration)
- `apps/api/src/services/auditService.ts` — montar/gravar findings
- `apps/api/src/services/groq.ts` — prompt com problemas concretos
- `apps/api/src/routes/audit.ts` — `findings` no `toAuditResponse`

Front-end:
- `apps/web/app/lib/prompt.ts` — gerador do prompt (função pura)
- `apps/web/app/lib/priority.ts` — priorização (função pura)
- `apps/web/app/components/PromptCard.tsx` — UI do prompt + copiar
- `apps/web/app/components/RecommendationCard.tsx` — selo "Ganho rápido"
- `apps/web/app/page.tsx` — renderização + ordenação

---

## Riscos e notas

- **Parsing por regex** é frágil por natureza, mas é a abordagem já adotada no
  projeto e não exige dependência nova. Aceitável para o escopo.
- **Migration no Railway**: após o deploy, rodar `db:migrate` uma vez (ou
  garantir que o passo de migration esteja no pipeline de deploy).
- **Compatibilidade**: `findings` opcional; a UI trata `undefined`
  (auditorias antigas) sem quebrar.
- **Sem custo novo de LLM**: prompt e priorização são client-side; a única
  chamada externa continua sendo a do Groq, agora só mais bem informada.

## Verificação (antes do commit)

- `npm run lint -w @aeo-seo-radar/api` (typecheck) + testes da API.
- `npm run typecheck -w @aeo-seo-radar/web`.
- Testes das funções puras novas (`prompt.test.ts`, `priority.test.ts`).

## Entrega ao final do Sprint 1

O usuário conclui uma auditoria e recebe: diagnóstico específico (o que
exatamente falta), a lista ordenada pelo que fazer primeiro, e um prompt pronto
para colar no ChatGPT/Claude e obter as correções — tudo derivado de uma única
fonte de dados.
