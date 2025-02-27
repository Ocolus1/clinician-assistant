import { Language } from "@/components/summary/LanguageSelector";

// Cache for translations to avoid redundant API calls
type TranslationCache = Record<string, Record<Language, string>>;
const cache: TranslationCache = {};

/**
 * Status of translation process
 */
export enum TranslationStatus {
  IDLE = "idle",
  TRANSLATING = "translating",
  COMPLETE = "complete",
  ERROR = "error"
}

/**
 * Translates text using the Lingva Translate API
 * @param text The text to translate
 * @param targetLanguage The language to translate to
 * @returns The translated text
 */
export async function translateText(
  text: string,
  targetLanguage: Language
): Promise<string> {
  // Early return for empty text or English target
  if (!text.trim() || targetLanguage === "english") {
    return text;
  }
  
  // Check cache first
  const textKey = text.trim();
  if (cache[textKey] && cache[textKey][targetLanguage]) {
    console.log("Translation cache hit for:", textKey.substring(0, 20) + "...");
    return cache[textKey][targetLanguage];
  }
  
  try {
    // Map our language codes to Lingva codes
    const lingvaLanguageCode = {
      "english": "en",
      "mandarin": "zh",
      "arabic": "ar",
      "punjabi": "pa",
      "cantonese": "zh", // Use Mandarin as fallback
      "vietnamese": "vi",
      "italian": "it",
      "greek": "el",
      "hindi": "hi",
      "spanish": "es",
      "tagalog": "tl",
      "urdu": "ur",
      "french": "fr",
      "other": "en" // fallback to English for unsupported languages
    }[targetLanguage];
    
    // Using Lingva Translate API (free and doesn't require API key)
    const url = `https://lingva.ml/api/v1/en/${lingvaLanguageCode}/${encodeURIComponent(text)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Translation error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const translation = data.translation || text;
    
    // Cache the result
    if (!cache[textKey]) {
      cache[textKey] = {} as Record<Language, string>;
    }
    cache[textKey][targetLanguage] = translation;
    
    return translation;
  } catch (error) {
    console.error("Translation error:", error);
    // Return original text on error
    return text;
  }
}

/**
 * Translates all provided sections in batch
 * @param sections Object with sections to translate
 * @param targetLanguage The language to translate to
 * @returns Promise with translated sections
 */
export async function translateSections(
  sections: Record<string, string>,
  targetLanguage: Language
): Promise<Record<string, string>> {
  // Early return if English is the target language
  if (targetLanguage === "english") {
    return sections;
  }
  
  const results: Record<string, string> = {};
  
  // For demonstration, we'll use a simulated batch translation with a delay
  // In production, you'd want to use a real translation service API with batch capabilities
  try {
    // Process translations concurrently in small batches to avoid rate limiting
    const sectionKeys = Object.keys(sections);
    const batchSize = 5;
    
    for (let i = 0; i < sectionKeys.length; i += batchSize) {
      const batch = sectionKeys.slice(i, i + batchSize);
      const translations = await Promise.all(
        batch.map(async (key) => {
          const text = sections[key];
          // Only translate if there's actually text content
          if (text && text.trim()) {
            return {
              key,
              translation: await translateText(text, targetLanguage)
            };
          }
          return { key, translation: text };
        })
      );
      
      // Store the results
      translations.forEach(({ key, translation }) => {
        results[key] = translation;
      });
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < sectionKeys.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error in batch translation:", error);
    throw error;
  }
}

/**
 * Helper to safely get translated text when available
 * @param originalText The original text
 * @param translations Object of translations
 * @param sectionId The section id to look up translation
 * @param targetLanguage The current target language 
 * @returns The translated text if available, otherwise the original
 */
export function getTranslatedText(
  originalText: string,
  translations: Record<string, string>,
  sectionId: string,
  targetLanguage: Language | null
): string {
  // Return original text for English or if no language is selected
  if (!targetLanguage || targetLanguage === "english") {
    return originalText;
  }
  
  // Return translation if available, otherwise original text
  return translations[sectionId] || originalText;
}