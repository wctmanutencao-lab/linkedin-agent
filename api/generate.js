export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { area, formato, contexto, tom } = req.body;

  if (!contexto || contexto.length < 20) {
    return res.status(400).json({ error: 'Contexto muito curto.' });
  }

  const systemPrompt = `Você é um especialista em conteúdo LinkedIn para profissionais técnicos industriais — engenheiros, técnicos de manutenção, gestores de planta. Você cria posts que combinam autoridade técnica com impacto real.

REGRAS ABSOLUTAS:
- Nunca use linguagem de coach motivacional ou frases genéricas
- Nunca comece com "Hoje quero compartilhar" ou clichês similares
- Use linguagem técnica real do setor industrial brasileiro
- Cada post deve ter: hook forte (1-2 linhas), desenvolvimento técnico, conclusão acionável
- Hashtags no final: 3-5 tags técnicas e específicas, não genéricas
- Limite: 1200 a 1800 caracteres por post
- Tom: ${tom}
- Área: ${area}
- Formato: ${formato}

Gere EXATAMENTE 3 variações distintas. Retorne SOMENTE JSON válido, sem markdown, sem texto fora do JSON:
{"posts": [{"variacao": "Variação 1", "titulo": "titulo curto do angulo", "texto": "texto completo do post"}, {"variacao": "Variação 2", "titulo": "...", "texto": "..."}, {"variacao": "Variação 3", "titulo": "...", "texto": "..."}]}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Área técnica: ${area}\nFormato: ${formato}\nTom: ${tom}\n\nContexto:\n${contexto}\n\nGere 3 variações com ângulos completamente diferentes.`
        }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || 'Erro na API Anthropic' });
    }

    const data = await response.json();
    const rawText = data.content.map(b => b.text || '').join('');
    const clean = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
