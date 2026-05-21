const SHEETS_ERROR_COPY = {
  sheets_rate_limited:
    'För många förfrågningar mot kalkylbladet — vänta en minut och försök igen.',
  sheets_unavailable: 'Tjänsten är tillfälligt otillgänglig — försök igen om en stund.',
  sheets_forbidden: 'Kunde inte nå kalkylbladet — be en tränare kontrollera uppsättningen.',
  sheet_setup_invalid: 'Medlemsarket är felkonfigurerat — be en tränare fixa kalkylbladet.',
  member_create_failed: 'Kunde inte skapa profil — försök igen.',
};

export function sheetsErrorMessage(code) {
  return SHEETS_ERROR_COPY[code] ?? 'Något gick fel — försök igen.';
}
