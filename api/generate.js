export default async function handler(req, res) {
  // 1. N'accepter que les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // 2. Récupérer ta clé secrète stockée sur Vercel
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Clé API Gemini non configurée sur le serveur Vercel.' });
  }

  try {
    const { productName, features, targetAudience, tone } = req.body;

    if (!productName || !features) {
      return res.status(400).json({ error: 'Le nom du produit et les caractéristiques sont obligatoires.' });
    }

    // 3. Préparer le prompt système pour Vendoz
    const systemInstruction = `Tu es un expert en copywriting e-commerce et SEO francophone. Tu rédiges des fiches produits haute conversion optimisées pour Google et Shopify.
Réponds UNIQUEMENT avec un objet JSON valide respectant strictement cette structure :
{
  "title": "Titre H1 accrocheur incluant le mot-clé principal",
  "hook": "Phrase d'accroche courte et percutante (1 à 2 phrases)",
  "description": "Description persuasive de 2 paragraphes séparés par \\n\\n orientée bénéfices clients",
  "bullets": ["Bénéfice 1 : explication", "Bénéfice 2 : explication", "Bénéfice 3 : explication", "Bénéfice 4 : explication", "Bénéfice 5 : explication"],
  "seoTitle": "Titre SEO optimisé (strictement moins de 60 caractères)",
  "seoMeta": "Méta-description engageante avec appel à l'action (strictement moins de 155 caractères)"
}`;

    const userPrompt = `Rédige la fiche produit complète pour :
- Nom du produit : ${productName}
- Caractéristiques principales : ${features}
- Public cible : ${targetAudience || 'Grand public'}
- Ton souhaité : ${tone || 'Persuasif et moderne'}`;

    // 4. Appel sécurisé à l'API Google Gemini (gemini-2.5-flash)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Erreur lors de la communication avec Gemini'
      });
    }

    // 5. Extraire le JSON généré et le renvoyer au navigateur
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsedProduct = JSON.parse(rawText);

    return res.status(200).json(parsedProduct);

  } catch (error) {
    console.error('Erreur serveur Vendoz:', error);
    return res.status(500).json({ error: 'Erreur interne lors de la génération de la fiche.' });
  }
}
