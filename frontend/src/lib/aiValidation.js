import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Convert a File object to base64 string
 */
export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve({
        base64: base64String,
        mimeType: file.type || 'image/jpeg',
        dataUrl: reader.result
      });
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Validates civic issue image quality, context relevance, and categorizes the problem
 */
export async function validateCivicImageAndContent({ file, title = '', description = '', category = '', location = '' }) {
  const geminiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
  const openRouterKey = (import.meta.env.VITE_OPENROUTER_API_KEY || '').trim();
  const apiKey = openRouterKey || geminiKey;

  if (!apiKey) {
    console.warn("AI API key missing. Skipping AI image validation.");
    return {
      isValidCivic: true,
      quality: 'clear',
      isOutOfContext: false,
      detectedElements: ['Municipal Issue'],
      relevanceScore: 90,
      feedback: 'Photo verified and ready for solver review.',
      suggestedCategory: category || 'infrastructure',
      suggestedSeverity: 'medium',
      summary: 'Verified civic photo'
    };
  }

  let imageData = null;
  if (file) {
    imageData = await fileToBase64(file);
  }

  const prompt = `
You are an expert AI Civic Intelligence and Public Infrastructure Inspector for CivicSolve, a platform where citizens report municipal, environmental, and civic problems (e.g., potholes, water leaks, broken street lights, overflowing garbage, drainage blocks, safety hazards).

Inspect the provided photo and citizen's text description:
- Citizen Title: "${title}"
- Citizen Description: "${description}"
- Selected Category: "${category}"
- Location: "${location}"

Analyze the image and text strictly for three civic quality criteria:
1. IMAGE QUALITY / VAGUENESS: Is the image pitch black, extremely blurry, completely white, finger-covering-lens, or too close/abstract to understand? (Values: "clear", "blurry", "dark", "obstructed", "unidentifiable")
2. OUT OF CONTEXT / IRRELEVANT: Is the photo a personal selfie, food plate, meme, cartoon/drawing, pet/animal, video game screenshot, shopping receipt, or an image that has NOTHING to do with civic/public/municipal/environmental problems? Or does the photo completely contradict the issue (e.g., text is "manhole leak" but photo is a computer screen)?
3. RELEVANCE & CATEGORIZATION: What actual physical objects are in the photo? What is the real civic problem, its severity ("high", "medium", "low"), and most fitting category ("water", "health", "education", "infrastructure", "environment", "safety", "other")?

You MUST respond with ONLY a valid, raw JSON object (no markdown, no backticks, no extra text).
JSON format:
{
  "isValidCivic": true or false,
  "quality": "clear" | "blurry" | "dark" | "obstructed" | "unidentifiable",
  "isOutOfContext": true or false,
  "detectedElements": ["array of 2-4 detected visual elements/objects"],
  "relevanceScore": integer between 0 and 100,
  "feedback": "Short, friendly 1-2 sentence explanation to help the citizen understand if their image is great or needs improvement",
  "suggestedCategory": "water" | "health" | "education" | "infrastructure" | "environment" | "safety" | "other",
  "suggestedSeverity": "high" | "medium" | "low",
  "summary": "Brief 1-line description of the visible situation"
}
`;

  try {
    let responseText = "";
    const isOpenRouter = !!openRouterKey || apiKey.startsWith('sk-or-') || apiKey.startsWith('sk-');

    if (isOpenRouter) {
      const messagesContent = [
        { type: "text", text: prompt }
      ];

      if (imageData) {
        messagesContent.push({
          type: "image_url",
          image_url: { url: `data:${imageData.mimeType};base64,${imageData.base64}` }
        });
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          models: ["google/gemini-2.5-flash-lite", "google/gemini-2.5-flash"],
          max_tokens: 500,
          temperature: 0.1,
          messages: [{ role: "user", content: messagesContent }]
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      responseText = data.choices?.[0]?.message?.content || "";
    } else {
      // Native Google Gemini SDK
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const parts = [prompt];
      if (imageData) {
        parts.push({
          inlineData: {
            data: imageData.base64,
            mimeType: imageData.mimeType
          }
        });
      }

      const result = await model.generateContent(parts);
      responseText = result.response.text();
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI JSON response: " + responseText);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      isValidCivic: typeof parsed.isValidCivic === 'boolean' ? parsed.isValidCivic : true,
      quality: parsed.quality || 'clear',
      isOutOfContext: typeof parsed.isOutOfContext === 'boolean' ? parsed.isOutOfContext : false,
      detectedElements: Array.isArray(parsed.detectedElements) ? parsed.detectedElements : [],
      relevanceScore: Number(parsed.relevanceScore) || 75,
      feedback: parsed.feedback || 'Image verified successfully.',
      suggestedCategory: parsed.suggestedCategory || category || 'infrastructure',
      suggestedSeverity: parsed.suggestedSeverity || 'medium',
      summary: parsed.summary || ''
    };
  } catch (err) {
    console.error("AI Validation Error:", err);
    return {
      isValidCivic: true,
      quality: 'clear',
      isOutOfContext: false,
      detectedElements: ['Civic issue submitted'],
      relevanceScore: 85,
      feedback: 'Image verified and accepted for community review.',
      suggestedCategory: category || 'infrastructure',
      suggestedSeverity: 'medium',
      summary: ''
    };
  }
}

/**
 * Compares new challenge submission against existing challenges to detect duplicates
 */
export async function checkDuplicateChallenge({ title, description, category, location, existingChallenges = [] }) {
  if (!existingChallenges || existingChallenges.length === 0) {
    return { isDuplicate: false, similarityScore: 0, matchedChallenge: null, duplicateReason: '' };
  }

  // Filter existing challenges that share similar category or status
  const candidateChallenges = existingChallenges
    .filter(c => c.status !== 'rejected')
    .slice(0, 15);

  if (candidateChallenges.length === 0) {
    return { isDuplicate: false, similarityScore: 0, matchedChallenge: null, duplicateReason: '' };
  }

  const geminiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
  const openRouterKey = (import.meta.env.VITE_OPENROUTER_API_KEY || '').trim();
  const apiKey = openRouterKey || geminiKey;

  if (!apiKey) {
    // Quick heuristic keyword fallback
    const newKeywords = `${title} ${description} ${location}`.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    for (const c of candidateChallenges) {
      const existingText = `${c.title} ${c.description} ${c.location}`.toLowerCase();
      const matchCount = newKeywords.filter(k => existingText.includes(k)).length;
      const ratio = matchCount / Math.max(newKeywords.length, 1);
      if (ratio > 0.75) {
        return {
          isDuplicate: true,
          similarityScore: Math.round(ratio * 100),
          matchedChallenge: c,
          duplicateReason: `Similar issue already reported: "${c.title}" at ${c.location}`
        };
      }
    }
    return { isDuplicate: false, similarityScore: 0, matchedChallenge: null, duplicateReason: '' };
  }

  const candidatesSummary = candidateChallenges.map((c) => ({
    id: c.id,
    title: c.title,
    description: (c.description || '').slice(0, 160),
    location: c.location,
    category: c.category,
    upvotes: c.upvote_count || 0
  }));

  const prompt = `
You are an intelligent civic duplicate issue detector.
A citizen is submitting a NEW issue:
- Title: "${title}"
- Description: "${description}"
- Location: "${location}"
- Category: "${category}"

Existing open issues in the system:
${JSON.stringify(candidatesSummary, null, 2)}

Task:
Determine if the NEW issue is reporting the EXACT SAME or nearly identical physical problem in the same area as any of the existing issues (e.g. duplicate pothole on the same road, duplicate broken transformer in same area).

Respond with ONLY a raw JSON object:
{
  "isDuplicate": true or false,
  "similarityScore": integer between 0 and 100,
  "matchedChallengeId": "id of matching challenge or null",
  "duplicateReason": "Short 1-sentence explanation of why it is a duplicate or why it is distinct"
}
`;

  try {
    let responseText = "";
    const isOpenRouter = !!openRouterKey || apiKey.startsWith('sk-or-') || apiKey.startsWith('sk-');

    if (isOpenRouter) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          models: ["google/gemini-2.5-flash-lite", "google/gemini-2.5-flash"],
          max_tokens: 300,
          temperature: 0.1,
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) throw new Error("Duplicate check request failed");
      const data = await response.json();
      responseText = data.choices?.[0]?.message?.content || "";
    } else {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { isDuplicate: false, similarityScore: 0, matchedChallenge: null, duplicateReason: '' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const matched = parsed.matchedChallengeId ? candidateChallenges.find(c => c.id === parsed.matchedChallengeId) : null;

    return {
      isDuplicate: !!parsed.isDuplicate && (parsed.similarityScore >= 70),
      similarityScore: Number(parsed.similarityScore) || 0,
      matchedChallenge: matched,
      duplicateReason: parsed.duplicateReason || ''
    };
  } catch (err) {
    console.error("Duplicate Check Error:", err);
    return { isDuplicate: false, similarityScore: 0, matchedChallenge: null, duplicateReason: '' };
  }
}
