# Product — AEO & SEO Radar

## Register

product

## Users

- **Desenvolvedores** verificando a prontidão técnica (schema, performance, estrutura) de um site antes de publicar.
- **Freelancers web** que precisam de um diagnóstico rápido e apresentável para mostrar a clientes.
- **Donos de sites pequenos** sem orçamento para ferramentas enterprise de SEO/AEO.
- **Estudantes de SEO/AEO** que querem ver na prática como schema markup e Core Web Vitals afetam a visibilidade.

Contexto de uso: o usuário cola uma URL, espera alguns segundos por um job de auditoria, e depois lê um relatório denso com múltiplos scores, métricas e recomendações. A tarefa primária em qualquer tela é **ler um diagnóstico técnico e decidir o que corrigir primeiro** — não é uma experiência de navegação ou descoberta.

## Product Purpose

Dashboard full-stack que audita qualquer domínio em segundos: coleta dados de múltiplas fontes em paralelo (PageSpeed Insights, schema markup JSON-LD, Open Graph, detecção de CSR) e entrega um relatório com seis scores (Geral, SEO, AEO, Performance, Acessibilidade, Boas Práticas) e recomendações acionáveis geradas por IA.

O diferencial é o **AEO (Answer Engine Optimization)**: além do SEO tradicional, avalia o quão preparado um site está para ser entendido e citado por mecanismos de resposta baseados em IA (ChatGPT, Perplexity, Google AI Overviews).

Sucesso = o usuário entende, em poucos segundos de leitura, quais são os 2-3 problemas mais críticos do site e como resolvê-los — sem precisar interpretar jargão de ferramentas enterprise.

## Brand Personality

**Preciso, calmo, especialista.** Referências: **Linear** e **Vercel Dashboard** — clareza densa, sem enfeite. A UI se comporta como um especialista técnico apresentando um diagnóstico: direta, confiante, sem embelezamento decorativo. Hierarquia vem de tipografia e densidade de informação, não de cor ou ornamento.

## Anti-references

- Gradientes roxos / gradient text decorativo.
- Glassmorphism (blur, cards translúcidos) como estilo padrão.
- Card dentro de card (aninhamento visual sem propósito).
- Templates coloridos estilo Bootstrap/admin genérico (paleta multicolor, ícones em caixinhas coloridas, sombras pesadas).

## Design Principles

1. **Dados falam por si.** Cor comunica estado (bom/atenção/crítico), nunca decora. Um único acento de marca (azul) para ação/destaque.
2. **Clareza densa sobre decoração.** Como Linear/Vercel: muita informação técnica organizada com respiro e tipografia, não escondida atrás de enfeite visual.
3. **Confiança técnica via precisão, não enfeite.** A UI ganha credibilidade sendo exata (números, unidades, thresholds claros), não sendo bonita.
4. **Refinar, não redesenhar.** A identidade atual (dark-first, slate + azul, cantos arredondados) é o ponto de partida; evolução é incremental, documentada em `docs/DESIGN.md`.
5. **Calma visual.** Bordas sutis, sombra mínima no escuro, hierarquia por tamanho/peso tipográfico antes de cor — a leitura de um diagnóstico não deve competir com a interface.

## Accessibility & Inclusion

- **WCAG AA** como padrão: contraste mínimo AA para texto (`text`/`muted` sobre `surface`/`surface-raised` em ambos os temas).
- Foco sempre visível (`focus:border-ring` / `focus-visible:ring-2 ring-ring`).
- Motion sutil e, quando possível, respeitando `prefers-reduced-motion`.
- Nenhum requisito adicional declarado além do padrão AA.
