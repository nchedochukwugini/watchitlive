const COUNTRY_CODES: Record<string, string> = {
  'Argentina': 'AR', 'Australia': 'AU', 'Belgium': 'BE', 'Bolivia': 'BO',
  'Brazil': 'BR', 'Cameroon': 'CM', 'Canada': 'CA', 'Chile': 'CL',
  'Colombia': 'CO', 'Costa Rica': 'CR', 'Croatia': 'HR', 'Czech Republic': 'CZ',
  'Denmark': 'DK', 'Ecuador': 'EC', 'Egypt': 'EG', 'England': 'GB-ENG',
  'France': 'FR', 'Germany': 'DE', 'Ghana': 'GH', 'Greece': 'GR',
  'Honduras': 'HN', 'Hungary': 'HU', 'Iceland': 'IS', 'Indonesia': 'ID',
  'Iran': 'IR', 'Iraq': 'IQ', 'Ireland': 'IE', 'Italy': 'IT',
  'Ivory Coast': 'CI', 'Jamaica': 'JM', 'Japan': 'JP', 'Mexico': 'MX',
  'Morocco': 'MA', 'Netherlands': 'NL', 'New Zealand': 'NZ', 'Nigeria': 'NG',
  'North Korea': 'KP', 'Norway': 'NO', 'Panama': 'PA', 'Paraguay': 'PY',
  'Peru': 'PE', 'Poland': 'PL', 'Portugal': 'PT', 'Qatar': 'QA',
  'Romania': 'RO', 'Russia': 'RU', 'Saudi Arabia': 'SA', 'Scotland': 'GB-SCT',
  'Senegal': 'SN', 'Serbia': 'RS', 'Slovakia': 'SK', 'Slovenia': 'SI',
  'South Africa': 'ZA', 'South Korea': 'KR', 'Spain': 'ES', 'Sweden': 'SE',
  'Switzerland': 'CH', 'Tunisia': 'TN', 'Turkey': 'TR', 'Ukraine': 'UA',
  'Uruguay': 'UY', 'USA': 'US', 'Wales': 'GB-WLS',
};

export function getCountryCode(name: string): string {
  return COUNTRY_CODES[name] || 'UN';
}

export function getFlagUrl(name: string): string {
  const code = getCountryCode(name);
  // Use flagcdn for simple, reliable flag images
  if (code.startsWith('GB-')) {
    // England, Scotland, Wales use special codes
    const sub = code.split('-')[1].toLowerCase();
    return `https://flagcdn.com/w80/${sub === 'eng' ? 'gb-eng' : sub === 'sct' ? 'gb-sct' : 'gb-wls'}.png`;
  }
  return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
}
