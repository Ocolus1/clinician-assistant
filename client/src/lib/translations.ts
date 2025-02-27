import { Language } from "@/components/summary/LanguageSelector";

type TranslationKey = string;
type TranslatedText = Record<Language, string>;
type TranslationMap = Record<TranslationKey, TranslatedText>;

// Define translations for various parts of the application
// This is a very basic implementation - in a real app, you'd use a proper i18n library like i18next
const translations: TranslationMap = {
  // General UI
  "confidential_report": {
    english: "Confidential Report",
    french: "Rapport confidentiel",
    spanish: "Informe confidencial",
    other: "Confidential Report",
  },
  "generated_on": {
    english: "Generated on",
    french: "Généré le",
    spanish: "Generado el",
    other: "Generated on",
  },
  
  // Personal Information Section
  "personal_information": {
    english: "Personal Information",
    french: "Information Personnelle",
    spanish: "Información Personal",
    other: "Personal Information",
  },
  "name": {
    english: "Name",
    french: "Nom",
    spanish: "Nombre",
    other: "Name",
  },
  "date_of_birth": {
    english: "Date of Birth",
    french: "Date de Naissance",
    spanish: "Fecha de Nacimiento",
    other: "Date of Birth",
  },
  "client_id": {
    english: "Client ID",
    french: "Identifiant du Client",
    spanish: "ID del Cliente",
    other: "Client ID",
  },
  "funds_management": {
    english: "Funds Management",
    french: "Gestion des Fonds",
    spanish: "Gestión de Fondos",
    other: "Funds Management",
  },
  
  // Allies Section
  "allies": {
    english: "Allies",
    french: "Alliés",
    spanish: "Aliados",
    other: "Allies",
  },
  "relationship": {
    english: "Relationship",
    french: "Relation",
    spanish: "Relación",
    other: "Relationship",
  },
  "preferred_language": {
    english: "Preferred Language",
    french: "Langue préférée",
    spanish: "Idioma preferido",
    other: "Preferred Language",
  },
  "therapeutics_access": {
    english: "Therapeutics Access",
    french: "Accès Thérapeutique",
    spanish: "Acceso a Terapéutica",
    other: "Therapeutics Access",
  },
  "financial_access": {
    english: "Financial Access",
    french: "Accès Financier",
    spanish: "Acceso Financiero",
    other: "Financial Access",
  },
  
  // Goals Section
  "goals_and_subgoals": {
    english: "Goals and Subgoals",
    french: "Objectifs et Sous-objectifs",
    spanish: "Objetivos y Subobjetivos",
    other: "Goals and Subgoals",
  },
  "priority": {
    english: "Priority",
    french: "Priorité",
    spanish: "Prioridad",
    other: "Priority",
  },
  "no_subgoals_defined": {
    english: "No subgoals defined",
    french: "Aucun sous-objectif défini",
    spanish: "No hay subobjetivos definidos",
    other: "No subgoals defined",
  },
  "loading_subgoals": {
    english: "Loading subgoals...",
    french: "Chargement des sous-objectifs...",
    spanish: "Cargando subobjetivos...",
    other: "Loading subgoals...",
  },
  
  // Budget Section
  "budget_summary": {
    english: "Budget Summary",
    french: "Résumé du Budget",
    spanish: "Resumen del Presupuesto",
    other: "Budget Summary",
  },
  "available_funds": {
    english: "Available Funds",
    french: "Fonds Disponibles",
    spanish: "Fondos Disponibles",
    other: "Available Funds",
  },
  "end_of_plan": {
    english: "End of Plan",
    french: "Fin du Plan",
    spanish: "Fin del Plan",
    other: "End of Plan",
  },
  "planned_funds": {
    english: "Planned Funds",
    french: "Fonds Planifiés",
    spanish: "Fondos Planificados",
    other: "Planned Funds",
  },
  "plan_duration": {
    english: "Plan Duration",
    french: "Durée du Plan",
    spanish: "Duración del Plan",
    other: "Plan Duration",
  },
  "item_code": {
    english: "Item Code",
    french: "Code",
    spanish: "Código",
    other: "Item Code",
  },
  "description": {
    english: "Description",
    french: "Description",
    spanish: "Descripción",
    other: "Description",
  },
  "unit_price": {
    english: "Unit Price",
    french: "Prix Unitaire",
    spanish: "Precio Unitario",
    other: "Unit Price",
  },
  "quantity": {
    english: "Qty",
    french: "Qté",
    spanish: "Cant",
    other: "Qty",
  },
  "total": {
    english: "Total",
    french: "Total",
    spanish: "Total",
    other: "Total",
  },
  "total_budget": {
    english: "Total Budget",
    french: "Budget Total",
    spanish: "Presupuesto Total",
    other: "Total Budget",
  },
  "remaining_balance": {
    english: "Remaining Balance",
    french: "Solde Restant",
    spanish: "Saldo Restante",
    other: "Remaining Balance",
  },
  
  // Footer
  "confidentiality_notice": {
    english: "This document is confidential and contains information protected by law.",
    french: "Ce document est confidentiel et contient des informations protégées par la loi.",
    spanish: "Este documento es confidencial y contiene información protegida por la ley.",
    other: "This document is confidential and contains information protected by law.",
  },
  "copyright_notice": {
    english: "© Speech Therapy Clinic - All rights reserved",
    french: "© Speech Therapy Clinic - Tous droits réservés",
    spanish: "© Speech Therapy Clinic - Todos los derechos reservados",
    other: "© Speech Therapy Clinic - All rights reserved",
  },
};

/**
 * Get a translated string based on the key and language
 * @param key The translation key to look up
 * @param language The target language for translation
 * @returns The translated string or the key if translation is not found
 */
export function getTranslation(key: string, language: Language): string {
  if (!translations[key]) {
    console.warn(`Translation key not found: ${key}`);
    return key;
  }
  
  return translations[key][language] || translations[key].english;
}

/**
 * Function to determine if the app should show bilingual content
 * @param language The selected language
 * @returns Boolean indicating if bilingual content should be shown
 */
export function isBilingual(language: Language | null): boolean {
  return language !== null && language !== "english";
}