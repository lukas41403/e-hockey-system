// Bank messages: short, plain ASCII (banks render diacritics inconsistently).

const DIACRITICS: Record<string, string> = {
  á: 'a', ä: 'a', č: 'c', ď: 'd', é: 'e', ě: 'e', í: 'i', ĺ: 'l', ľ: 'l', ň: 'n', ó: 'o', ô: 'o',
  ö: 'o', ŕ: 'r', ř: 'r', š: 's', ť: 't', ú: 'u', ů: 'u', ü: 'u', ý: 'y', ž: 'z',
}

export function removeDiacritics(value: string): string {
  return value
    .replace(/[^\u0020-\u007e]/g, (char) => {
      const lower = char.toLowerCase()
      const mapped = DIACRITICS[lower] ?? lower.normalize('NFD').replace(/[̀-ͯ]/g, '')
      return char === lower ? mapped : mapped.toUpperCase()
    })
    .replace(/[^ -~]/g, '')
}

export function toBankText(value: string, maxLength: number): string {
  return removeDiacritics(value).replace(/\s+/g, ' ').trim().slice(0, maxLength)
}
