import { EthicalTerminology, PatientProfileRecord } from '../types/medha';

export interface TerminologyOptions {
  patient?: PatientProfileRecord | null;
  setting?: EthicalTerminology;
  lang?: string;
  context?: 'singular' | 'plural' | 'possessive' | 'action' | 'relationship';
}

const TERMINOLOGY_TRANSLATIONS: Record<string, Record<EthicalTerminology, string>> = {
  en: {
    loved_one: 'Loved One',
    elder: 'Elder',
    name_only: 'First Name Only',
    care_partner: 'Care Partner',
    senior: 'Senior',
  },
  as: {
    loved_one: 'আপোনজন',
    elder: 'জেষ্ঠজন',
    name_only: 'কেৱল নাম',
    care_partner: 'যত্ন সংগী',
    senior: 'প্ৰবীণ',
  },
  bn: {
    loved_one: 'প্রিয়জন',
    elder: 'প্রবীণ',
    name_only: 'শুধুমাত্র নাম',
    care_partner: 'যত্ন সঙ্গী',
    senior: 'জ্যেষ্ঠজন',
  },
  hi: {
    loved_one: 'परिजन',
    elder: 'वरिष्ठ जन',
    name_only: 'केवल नाम',
    care_partner: 'देखभाल साथी',
    senior: 'बुजुर्ग',
  },
};

export function getEthicalTermName(term: EthicalTerminology = 'loved_one', lang: string = 'en'): string {
  const dict = TERMINOLOGY_TRANSLATIONS[lang] || TERMINOLOGY_TRANSLATIONS.en;
  return dict[term] || TERMINOLOGY_TRANSLATIONS.en[term] || 'Loved One';
}

export function getPersonLabel({
  patient,
  setting = 'loved_one',
  lang = 'en',
  context = 'singular',
}: TerminologyOptions): string {
  const firstName = patient?.name ? patient.name.trim().split(' ')[0] : '';
  const fullName = patient?.name ? patient.name.trim() : '';

  // 1. If profile has a specific preferred term (e.g. "Father", "Mother", "Aita", "Koka")
  if (patient?.preferredTerm && patient.preferredTerm.trim()) {
    if (context === 'possessive') {
      return `${patient.preferredTerm}'s`;
    }
    return patient.preferredTerm;
  }

  // 2. Setting-based resolution
  if (setting === 'name_only' && firstName) {
    if (context === 'possessive') {
      return `${firstName}'s`;
    }
    return firstName;
  }

  if (setting === 'elder') {
    const term = getEthicalTermName('elder', lang);
    if (context === 'plural') return lang === 'en' ? 'Elders' : term;
    if (context === 'possessive') return `${term}'s`;
    return term;
  }

  if (setting === 'care_partner') {
    const term = getEthicalTermName('care_partner', lang);
    if (context === 'plural') return lang === 'en' ? 'Care Partners' : term;
    if (context === 'possessive') return `${term}'s`;
    return term;
  }

  if (setting === 'senior') {
    const term = getEthicalTermName('senior', lang);
    if (context === 'plural') return lang === 'en' ? 'Seniors' : term;
    if (context === 'possessive') return `${term}'s`;
    return term;
  }

  // Default: loved_one
  const term = getEthicalTermName('loved_one', lang);
  if (context === 'plural') return lang === 'en' ? 'Loved Ones' : term;
  if (context === 'possessive') return `${term}'s`;
  return term;
}

export function getPersonDisplayName(
  patient?: PatientProfileRecord | null,
  fallback: string = 'Loved One'
): string {
  if (patient?.name && patient.name.trim()) {
    return patient.name.trim();
  }
  return fallback;
}
