# Design System — AEO & SEO Radar

Guia visual único do projeto. **Antes de mexer em qualquer UI/estilo, siga este documento.**
A direção é *refinar* a identidade atual (dark-first, azul/tech, cards arredondados) — deixá-la
mais coesa e consistente, **não** redesenhar do zero.

> Stack visual: Next.js + Tailwind CSS v4 (com `@variant dark`) + Framer Motion + Lucide icons.
> Tema padrão: **escuro** (`next-themes`, `defaultTheme: dark`).

---

## 1. Princípios

1. **Dark-first.** O tema escuro é o principal; o claro é espelho fiel, nunca uma reflexão tardia.
2. **Tokens, não valores soltos.** Componentes referenciam *tokens* semânticos (`bg-surface`,
   `text-muted`), nunca cores cruas espalhadas (`dark:bg-gray-900 bg-white`).
3. **Neutro único.** Toda a UI usa a família **slate** (azulada). Sem misturar `gray` e `slate`.
4. **Azul é o acento.** Uma única cor de marca (azul). Cores semânticas (verde/amarelo/vermelho)
   só comunicam estado, nunca decoram.
5. **Calma visual.** Bordas sutis no escuro (sombra mínima), respiro generoso, hierarquia por
   tamanho/peso de tipografia antes de cor.

---

## 2. Tokens de cor

Família neutra: **slate**. Acento: **blue**. Estados: green / yellow / red.

### Superfícies e texto

| Token | Papel | Dark | Light |
|---|---|---|---|
| `surface` | Fundo da página | `slate-950` `#020617` | `slate-50` `#f8fafc` |
| `surface-raised` | Card / painel | `slate-900` `#0f172a` | `#ffffff` |
| `surface-inset` | Input, item de lista, badge | `slate-800` `#1e293b` | `slate-100` `#f1f5f9` |
| `border` | Bordas e divisores | `slate-800` `#1e293b` | `slate-200` `#e2e8f0` |
| `text` | Texto primário | `slate-100` `#f1f5f9` | `slate-900` `#0f172a` |
| `muted` | Texto secundário / labels | `slate-400` `#94a3b8` | `slate-500` `#64748b` |

### Acento (marca)

| Token | Papel | Valor |
|---|---|---|
| `accent` | Botão primário, links, ação | `blue-600` `#2563eb` |
| `accent-hover` | Hover do primário | `blue-700` `#1d4ed8` |
| `accent-fg` | Texto sobre o acento | `#ffffff` |
| `highlight` | Títulos de seção, ícones de destaque | `blue-400` `#60a5fa` (dark) / `blue-600` (light) |
| `ring` | Foco (acessibilidade) | `blue-500` `#3b82f6` |

### Estados / scores

Mesma semântica usada nos scores e nas severidades das recomendações.

| Token | Significado | Score | Severidade | Cor (texto) |
|---|---|---|---|---|
| `good` | Bom | ≥ 90 | `info` | `green-400` `#4ade80` |
| `warn` | Atenção | 50–89 | `warning` | `yellow-400` `#facc15` |
| `bad` | Crítico | < 50 | `critical` | `red-400` `#f87171` |

> Badges de status (`completed`/`failed`/`running`) usam o mesmo trio com fundo `-900/40` e texto `-400`.

---

## 3. Wiring no Tailwind v4

Centralize os tokens em `apps/web/app/globals.css` como variáveis CSS e exponha via `@theme inline`.
Assim os componentes usam `bg-surface-raised`, `text-muted`, `border-border`, etc.

```css
@import "tailwindcss";
@variant dark (&:where(.dark, .dark *));

:root {
  --surface: #f8fafc;
  --surface-raised: #ffffff;
  --surface-inset: #f1f5f9;
  --border: #e2e8f0;
  --text: #0f172a;
  --muted: #64748b;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --highlight: #2563eb;
  --ring: #3b82f6;
}

.dark {
  --surface: #020617;
  --surface-raised: #0f172a;
  --surface-inset: #1e293b;
  --border: #1e293b;
  --text: #f1f5f9;
  --muted: #94a3b8;
  --highlight: #60a5fa;
}

@theme inline {
  --color-surface: var(--surface);
  --color-surface-raised: var(--surface-raised);
  --color-surface-inset: var(--surface-inset);
  --color-border: var(--border);
  --color-text: var(--text);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-highlight: var(--highlight);
  --color-ring: var(--ring);
  --font-sans: var(--font-geist-sans);
}

body {
  background: var(--surface);
  color: var(--text);
  font-family: var(--font-sans), system-ui, sans-serif;
}
```

> **Refino pendente:** hoje o `body` usa `Arial, Helvetica`, mas o `@theme` já define Geist.
> Padronizar em `var(--font-sans)` (Geist) deixa a tipografia coerente com o resto.

---

## 4. Tipografia

Fonte: **Geist Sans** (UI) e **Geist Mono** (valores técnicos/código, opcional).

| Uso | Classe Tailwind | Peso |
|---|---|---|
| Título da página | `text-2xl md:text-3xl` | `font-bold` |
| Título de seção | `text-lg` | `font-semibold` |
| Número de score | `text-3xl md:text-4xl` | `font-bold` |
| Corpo / descrição | `text-sm` | `font-normal` |
| Label / metadado | `text-xs` | `font-normal`, cor `text-muted` |

Regras: no máximo um `font-bold` por bloco visual; nunca usar cor para criar hierarquia que o
tamanho/peso já resolve.

---

## 5. Espaçamento, raio e sombra

- **Container:** `max-w-5xl mx-auto`, padding de página `px-4 py-6 md:p-8`.
- **Escala de espaço:** múltiplos de `0.25rem`. Gaps de grid/lista: `gap-3`. Respiro entre seções: `mb-6`.
- **Padding de card:** `p-4 md:p-6`.
- **Raio:** `rounded-xl` (cards/painéis), `rounded-lg` (inputs, botões, badges). Nada de cantos retos.
- **Sombra:** `shadow-sm` no claro; **sem sombra** no escuro (a borda `border-border` faz a separação).

---

## 6. Componentes (padrões canônicos)

Use estas combinações como base. Sempre via tokens.

**Card / painel**
```
rounded-xl border border-border bg-surface-raised p-4 md:p-6 shadow-sm dark:shadow-none
```

**Botão primário**
```
bg-accent hover:bg-accent-hover text-white font-medium rounded-lg px-6 py-2.5
transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
```

**Botão secundário** (ex.: "Carregar mais")
```
bg-surface-inset hover:opacity-90 text-text font-medium rounded-lg py-2.5
transition-colors disabled:opacity-50 disabled:cursor-not-allowed
```

**Input**
```
bg-surface-inset border border-border rounded-lg px-4 py-2.5 text-text
placeholder-muted focus:outline-none focus:border-ring
```

**Título de seção** (com ícone Lucide)
```
text-lg font-semibold text-text   // ou text-highlight quando for destaque (ex.: "Recomendações da IA")
```

**Número de score** (cor por estado)
```
text-3xl md:text-4xl font-bold  +  good|warn|bad   // ≥90 / 50–89 / <50
```

**Badge de status / severidade**
```
text-xs px-2 py-1 rounded   // fundo {good|warn|bad}-900/40, texto {good|warn|bad}-400
```

---

## 7. Movimento (Framer Motion)

Mantém as transições atuais — sutis e rápidas.

- **Entrada de blocos:** `opacity 0→1` + `y 20→0`, `duration: 0.4`.
- **Cards em grade:** `scale 0.9→1`, `stagger` via `delay: base + index * 0.07`.
- **Lista (histórico):** `x -20→0`, `delay: index * 0.05`.
- **Hover de item clicável:** `scale: 1.01`; tap `0.99`.
- **Contagem de score:** count-up de ~800ms.

Regra: animação serve à percepção (entrada, feedback), nunca distrai. Respeite `prefers-reduced-motion`
quando possível.

---

## 8. Dark / Light

- O **escuro é o padrão**. Toda tela precisa funcionar nos dois.
- Nunca hardcodar `bg-white`/`bg-gray-900` direto: use `bg-surface-raised` (resolve sozinho nos dois temas).
- Contraste mínimo AA: texto `text` sobre `surface`/`surface-raised`; `muted` só para texto secundário.
- Foco visível sempre (`focus:border-ring` ou `focus-visible:ring-2 ring-ring`).

---

## 9. Checklist ao mexer em UI

- [ ] Usei **tokens** (`surface`, `muted`, `accent`...) em vez de cores cruas?
- [ ] Funciona em **dark e light**?
- [ ] Raio `xl` (card) / `lg` (controle) e padding `p-4 md:p-6`?
- [ ] Cor só comunica **estado** (good/warn/bad), não decora?
- [ ] Foco visível e contraste AA?
- [ ] Animação sutil e coerente com a seção 7?

---

## 10. Migração incremental (sugestão)

Para aplicar sem big-bang, na ordem:

1. Adicionar os tokens no `globals.css` (seção 3) — não quebra nada existente.
2. Trocar, componente a componente, `dark:bg-gray-900 bg-white` → `bg-surface-raised`,
   `dark:border-gray-800 border-gray-200` → `border-border`, textos → `text-text` / `text-muted`.
3. Unificar o neutro: substituir `gray-*` remanescentes por `slate-*`/tokens.
4. Padronizar a fonte do `body` em Geist.
5. Conferir o template de e-mail do magic link (`apps/web/auth.ts`) — ele já usa slate, serve de
   referência da paleta da marca.
