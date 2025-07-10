export const STYLE_PREFERENCE_PRESETS = [
  {
    label: 'Concise Briefs',
    value:
      'Keep answers concise. Use bullet lists rather than paragraphs and highlight the main takeaway up front. Omit details, and summarize information clearly for quick scanning.'
  },
  {
    label: 'Detailed Breakdown',
    value:
      'Provide a thorough, step-by-step explanation. Include context, pros and cons when helpful, and always close with recommended next actions or considerations for the reader.'
  },
  {
    label: 'Friendly Explainer',
    value:
      'Use a warm, friendly tone with approachable language. Include simple analogies or quick, concrete examples. Avoid dense jargon unless user specifically requests technical depth.'
  },
  {
    label: 'Research Mode',
    value:
      'Explicitly call out assumptions or uncertainties. When possible, suggest sources, citations, or data points that could increase confidence or clarify any open questions in the response.'
  }
] as const
