
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency
 * @param amount The number to format
 * @param currency The currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export async function apiRequest(method: HttpMethod, path: string, data?: any) {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(path, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Request secrets from the user
 * @param secretKeys An array of secret keys to request
 * @returns An object with the requested secrets
 */
export async function ask_secrets(secretKeys: string[]): Promise<Record<string, string>> {
  // Check if the environment already has the secrets
  const existingSecrets: Record<string, string> = {};
  let allSecretsExist = true;

  // First, check if secrets already exist in environment variables
  for (const key of secretKeys) {
    const value = process.env[key] || localStorage.getItem(key);
    if (value) {
      existingSecrets[key] = value;
    } else {
      allSecretsExist = false;
    }
  }

  // If all secrets exist, return them
  if (allSecretsExist) {
    return existingSecrets;
  }

  // Otherwise, prompt the user for the missing secrets
  const message = `Please provide the following keys: ${secretKeys.join(', ')}`;
  const missingKeys = secretKeys.filter(key => !existingSecrets[key]);

  // For each missing key, prompt the user
  for (const key of missingKeys) {
    const value = prompt(`Please enter your ${key}:`);
    if (value) {
      existingSecrets[key] = value;
      // Store in localStorage for future use
      localStorage.setItem(key, value);
    }
  }

  return existingSecrets;
}
