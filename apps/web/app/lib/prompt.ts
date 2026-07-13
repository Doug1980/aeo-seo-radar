import type { AuditFindings, DomainAudit } from "@aeo-seo-radar/shared";
import { prioritize } from "./priority";

/** Lista, em linguagem direta, os problemas concretos a partir dos findings. */
function problemsFrom(f: AuditFindings): string {
	const problems: string[] = [];

	if (!f.title) problems.push("Title ausente");
	else if (f.titleLength > 60)
		problems.push(`Title muito longo (${f.titleLength} caracteres)`);

	if (!f.metaDescription) problems.push("Meta description ausente");
	else if (f.metaDescriptionLength > 160)
		problems.push(
			`Meta description muito longa (${f.metaDescriptionLength} caracteres)`,
		);

	if (f.h1Count === 0) problems.push("Nenhum H1 na página");
	else if (f.h1Count > 1) problems.push(`Mais de um H1 (${f.h1Count})`);

	if (!f.canonical) problems.push("Sem link canonical");
	if (!f.lang) problems.push("Atributo lang ausente no <html>");
	if (!f.hasOgTitle || !f.hasOgDescription)
		problems.push("Open Graph incompleto (título/descrição)");
	if (!f.hasOgImage) problems.push("Sem imagem Open Graph");
	if (!f.hasViewport) problems.push("Sem meta viewport (mobile)");

	if (f.schemaTypes.length === 0) problems.push("Sem schema JSON-LD");
	else {
		if (
			!f.schemaTypes.includes("Organization") &&
			!f.schemaTypes.includes("WebSite")
		)
			problems.push("Falta schema Organization/WebSite");
		if (!f.schemaTypes.includes("FAQPage"))
			problems.push("Falta schema FAQPage (forte para AEO)");
	}

	if (f.isLikelyCSR)
		problems.push(
			"Site renderizado no cliente (CSR): conteúdo e schema podem não ser lidos por buscadores e IAs",
		);

	return problems.length
		? problems.map((p) => `- ${p}`).join("\n")
		: "- Nenhum problema estrutural crítico detectado.";
}

/**
 * Monta um prompt remediador pronto para colar no ChatGPT/Claude, derivado
 * do diagnóstico da auditoria (scores + findings + recomendações). Função
 * pura, sem custo de LLM — roda no cliente.
 */
export function buildRemediationPrompt(audit: DomainAudit): string {
	const { domain, scores, findings } = audit;

	const recs = prioritize(audit.recommendations);
	const recLines = recs.length
		? recs
				.map((r, i) => `${i + 1}. [${r.severity}] ${r.title} — ${r.description}`)
				.join("\n")
		: "- (nenhuma recomendação gerada)";

	const problems = findings
		? problemsFrom(findings)
		: "- (achados detalhados indisponíveis nesta auditoria)";

	return `Você é um especialista sênior em SEO e AEO (Answer Engine Optimization).
Preciso corrigir o site ${domain}. Abaixo está o diagnóstico técnico completo.

## Scores (0-100)
- Score geral: ${scores.overall}
- SEO: ${scores.seo}
- AEO: ${scores.aeo}
- Performance: ${scores.performance}
- Schema markup: ${scores.schemaMarkup}

## Problemas detectados
${problems}

## Recomendações priorizadas
${recLines}

## O que preciso de você
Para cada problema acima, entregue a correção pronta para aplicar:
- O código ou conteúdo exato (HTML, meta tags, JSON-LD, etc.) pronto para colar.
- Onde exatamente inserir no projeto.
- Comece pelos itens de maior impacto e menor esforço.

Responda em português do Brasil, de forma objetiva e prática.`;
}
