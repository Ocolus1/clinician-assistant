import { Language } from "@/components/summary/LanguageSelector";

// Translation cache to avoid redundant API calls
type TranslationCache = Record<string, Record<Language, string>>;
const cache: TranslationCache = {};

// Map our language codes to Lingva language codes
const languageCodeMap: Record<Language, string> = {
  english: "en",
  french: "fr",
  spanish: "es",
  other: "en" // Fallback
};

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
  // Don't translate if target is English or text is empty
  if (targetLanguage === "english" || !text.trim()) {
    return text;
  }

  // Check cache first
  if (cache[text]?.[targetLanguage]) {
    console.log(`Using cached translation for "${text.substring(0, 20)}..." to ${targetLanguage}`);
    return cache[text][targetLanguage];
  }

  // Get language code
  const langCode = languageCodeMap[targetLanguage];
  
  try {
    // Lingva Translate API URL format
    const apiUrl = `https://lingva.ml/api/v1/en/${langCode}/${encodeURIComponent(text)}`;
    
    console.log(`Translating "${text.substring(0, 20)}..." to ${targetLanguage}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Translation failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    const translation = data.translation;
    
    // Cache the result
    if (!cache[text]) {
      cache[text] = {} as Record<Language, string>;
    }
    cache[text][targetLanguage] = translation;
    
    return translation;
  } catch (error) {
    console.error("Translation error:", error);
    // Return original text if translation fails
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
  // Don't translate if target is English
  if (targetLanguage === "english") {
    return sections;
  }

  const result: Record<string, string> = {};
  const translationPromises: Promise<void>[] = [];

  for (const [key, text] of Object.entries(sections)) {
    const promise = translateText(text, targetLanguage).then(translation => {
      result[key] = translation;
    });
    translationPromises.push(promise);
  }

  await Promise.all(translationPromises);
  return result;
}

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
 * Helper to safely translate text when available
 * @param originalText The original text
 * @param translations Object of translations, keyed by section id
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
  if (targetLanguage === null || targetLanguage === "english") {
    return originalText;
  }
  
  return translations[sectionId] || originalText;
}