import { useState, useCallback } from 'react';

export interface EmailValidationResult {
  email: string;
  isValid: boolean;
  hasTypo: boolean;
  suggestion?: string;
  message?: string;
  confidence?: number;
}


const DOMAIN_TYPOS: Record<string, string> = {
  'hmail.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmalll.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'otmail.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yaho0.com': 'yahoo.com',
  'outloook.com': 'outlook.com',
  'outlok.com': 'outlook.com',
  'outlo0k.com': 'outlook.com',
};


const POPULAR_DOMAINS = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'icloud.com'];


function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null)
  );

  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  return track[str2.length][str1.length];
}


function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return Math.round(((maxLength - distance) / maxLength) * 100);
}

function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function extractDomain(email: string): string {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : '';
}


function findDomainSuggestion(domain: string): { suggestion?: string; confidence?: number } {
  
  if (DOMAIN_TYPOS[domain]) {
    return {
      suggestion: DOMAIN_TYPOS[domain],
      confidence: 95,
    };
  }

  
  let bestMatch = { domain: '', similarity: 0 };
  for (const popularDomain of POPULAR_DOMAINS) {
    const similarity = calculateSimilarity(domain, popularDomain);
    if (similarity > bestMatch.similarity && similarity >= 75) {
      bestMatch = { domain: popularDomain, similarity };
    }
  }

  if (bestMatch.domain) {
    return {
      suggestion: bestMatch.domain,
      confidence: bestMatch.similarity,
    };
  }

  return {};
}

export function useEmailValidation() {
  const [validationResult, setValidationResult] = useState<EmailValidationResult | null>(null);

  const validate = useCallback((email: string): EmailValidationResult => {
    const trimmedEmail = email.trim().toLowerCase();

   
    if (!trimmedEmail) {
      const result: EmailValidationResult = {
        email: trimmedEmail,
        isValid: false,
        hasTypo: false,
        message: 'Vui lòng nhập email',
      };
      setValidationResult(result);
      return result;
    }

    if (!isValidEmailFormat(trimmedEmail)) {
      const result: EmailValidationResult = {
        email: trimmedEmail,
        isValid: false,
        hasTypo: false,
        message: 'Định dạng email không hợp lệ',
      };
      setValidationResult(result);
      return result;
    }

   
    const domain = extractDomain(trimmedEmail);
    const { suggestion, confidence } = findDomainSuggestion(domain);

    // Only show warning if suggestion is different from current domain
    if (suggestion && suggestion !== domain) {
      const suggestedEmail = trimmedEmail.replace(domain, suggestion);
      const result: EmailValidationResult = {
        email: trimmedEmail,
        isValid: true, 
        hasTypo: true,
        suggestion: suggestedEmail,
        confidence,
        message: `Có phải bạn muốn dùng ${suggestion}?`,
      };
      setValidationResult(result);
      return result;
    }

   
    const result: EmailValidationResult = {
      email: trimmedEmail,
      isValid: true,
      hasTypo: false,
      message: 'Email hợp lệ',
    };
    setValidationResult(result);
    return result;
  }, []);

  const clearValidation = useCallback(() => {
    setValidationResult(null);
  }, []);

  return {
    validate,
    validationResult,
    clearValidation,
  };
}
