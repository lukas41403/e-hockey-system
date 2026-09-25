// Maps stable error codes from database functions (and auth / network errors) to Slovak
// messages that say what happened and what to do next.

const MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: 'Prihlásenie vypršalo. Prihlás sa znova.',
  NOT_SUPERADMIN: 'Túto stránku vidí len správca appky.',
  NOT_GROUP_ADMIN: 'Na toto potrebuješ práva admina partičky.',
  NOT_GROUP_MEMBER: 'Nie je to člen tejto partičky.',
  GROUP_NOT_FOUND: 'Partičku sa nepodarilo nájsť.',
  INVALID_GROUP_NAME: 'Názov partičky musí mať 2 až 80 znakov.',
  CITY_REQUIRED: 'Vyplň mesto.',
  COUNTRY_REQUIRED: 'Vyber krajinu.',
  ACCOUNT_HOLDER_REQUIRED: 'Vyplň meno majiteľa účtu.',
  INVALID_WHATSAPP_URL: 'Odkaz na skupinu musí začínať https://chat.whatsapp.com/',
  CURRENCY_LOCKED: 'Krajinu už nemožno zmeniť, partička má platby v pôvodnej mene.',
  INVALID_INVITE_CODE: 'Pozvánka už neplatí. Popýtaj admina o nový odkaz.',
  LAST_ADMIN: 'Partička musí mať aspoň jedného admina. Najprv urob adminom niekoho iného.',
  MEMBER_HAS_BALANCE: 'Člen má nevyrovnaný zostatok. Najprv zapíš platbu alebo opravu.',
  INVALID_ROLE: 'Vyber platnú rolu.',

  FULL_NAME_REQUIRED: 'Vyplň meno a priezvisko.',
  NICKNAME_TOO_LONG: 'Prezývka môže mať najviac 30 znakov.',
  INVALID_JERSEY_NUMBER: 'Číslo dresu musí byť od 0 do 99.',
  INVALID_PHONE: 'Telefónne číslo nie je platné. Zadaj ho napríklad ako 0905 123 456.',
  INVALID_IBAN: 'IBAN nie je platný. Skontroluj ho, napríklad SK31 1200 0000 1987 4263 7541.',

  SESSION_NOT_FOUND: 'Termín sa nepodarilo nájsť.',
  SESSION_IN_PAST: 'Začiatok termínu musí byť v budúcnosti.',
  START_REQUIRED: 'Zadaj začiatok termínu.',
  VENUE_REQUIRED: 'Zadaj miesto termínu.',
  NOTES_TOO_LONG: 'Poznámka môže mať najviac 500 znakov.',
  PRICE_REQUIRED: 'Pri fixnej cene zadaj cenu pre hráča.',
  INVALID_DURATION: 'Dĺžka musí byť od 15 do 300 minút.',
  INVALID_CAPACITY: 'Kapacita hráčov v poli musí byť od 1 do 100.',
  INVALID_GOALIE_SLOTS: 'Počet brankárov musí byť od 0 do 4.',
  INVALID_ROUNDING_STEP: 'Krok zaokrúhlenia nie je platný.',
  INVALID_CANCELLATION_HOURS: 'Bezplatné odhlásenie môže byť najviac 168 hodín pred začiatkom.',
  INVALID_REPEAT: 'Opakovať môžeš 1 až 12 týždňov.',
  CAPACITY_BELOW_CONFIRMED: 'Kapacita nemôže byť nižšia ako počet prihlásených. Najprv odober hráčov.',
  SESSION_FINALIZED: 'Termín je uzavretý. Ak ho chceš meniť, najprv ho otvor znova.',
  SESSION_CANCELLED: 'Termín je zrušený.',

  SESSION_FULL: 'Termín je plný.',
  REGISTRATION_CLOSED: 'Prihlasovanie na tento termín je uzavreté.',
  ALREADY_REGISTERED: 'Na tento termín už si prihlásený.',
  NO_GOALIE_SLOTS: 'Tento termín nemá miesta pre brankárov.',
  SPOT_NOT_OFFERED: 'Na tento termín sa môžu prihlásiť len členovia partičky.',
  REGISTRATION_NOT_FOUND: 'Registráciu sa nepodarilo nájsť. Obnov stránku.',
  NOT_REGISTRATION_OWNER: 'Odhlásiť môžeš len seba.',
  REGISTRATION_NOT_ACTIVE: 'Táto registrácia už nie je aktívna.',
  REGISTRATION_NOT_PENDING: 'O tejto žiadosti už je rozhodnuté.',
  NOTHING_OFFERED: 'Vyber, či ponúkaš miesta v poli, pre brankárov alebo oboje.',
  NOTE_TOO_LONG: 'Poznámka môže mať najviac 280 znakov.',

  ALREADY_FINALIZED: 'Termín už je uzavretý.',
  SESSION_NOT_FINALIZED: 'Termín ešte nie je uzavretý.',
  SESSION_NOT_STARTED: 'Termín ešte nezačal. Uzavrieť ho môžeš po začiatku.',
  ATTENDANCE_INCOMPLETE: 'Označ dochádzku pri každom prihlásenom hráčovi a brankárovi.',
  INVALID_ATTENDANCE: 'Súpiska sa medzitým zmenila. Obnov stránku a označ dochádzku znova.',

  PAYMENT_NOT_FOUND: 'Platbu sa nepodarilo nájsť.',
  PAYMENT_NOT_REPORTABLE: 'Túto platbu už nemožno nahlásiť.',
  PAYMENT_NOT_CANCELLABLE: 'Túto platbu už nemožno zrušiť.',
  PAYMENT_NOT_CONFIRMABLE: 'Túto platbu nemožno potvrdiť.',
  PAYMENT_ALREADY_CONFIRMED: 'Platba už je potvrdená.',
  PAYMENT_NOT_REJECTABLE: 'Túto platbu už nemožno zamietnuť.',
  PAYOUT_EXCEEDS_BALANCE: 'Suma je vyššia, ako partička brankárovi dlhuje.',
  NOT_A_GOALIE: 'Vyplácať sa dá len brankárom, ktorí majú odmenu.',
  INVALID_AMOUNT: 'Zadaj platnú sumu.',
  NOTE_REQUIRED: 'Pri oprave zostatku napíš poznámku.',
  LEDGER_IMMUTABLE: 'Záznamy v denníku sa nedajú meniť. Zapíš opravu.',
}

const AUTH_MESSAGES: Record<string, string> = {
  otp_expired: 'Kód je nesprávny alebo vypršal. Skontroluj ho alebo si pošli nový.',
  over_email_send_rate_limit: 'Poslali sme priveľa kódov. Skús to znova o chvíľu.',
  over_request_rate_limit: 'Priveľa pokusov. Skús to znova o chvíľu.',
  email_address_invalid: 'E-mailová adresa nie je platná.',
  validation_failed: 'Skontroluj zadané údaje.',
  invalid_credentials: 'Nesprávny e-mail alebo heslo.',
  session_not_found: 'Prihlásenie vypršalo. Prihlás sa znova.',
}

export const GENERIC_ERROR = 'Niečo sa pokazilo. Skús to znova o chvíľu.'
export const NETWORK_ERROR = 'Nepodarilo sa spojiť so serverom. Skontroluj pripojenie a skús to znova.'

function field(error: unknown, key: string): unknown {
  return typeof error === 'object' && error !== null && key in error
    ? (error as Record<string, unknown>)[key]
    : undefined
}

/** Stable code of a database function error (e.g. "SESSION_FULL"), if there is one. */
export function errorCode(error: unknown): string | null {
  const message = field(error, 'message')
  return typeof message === 'string' && message in MESSAGES ? message : null
}

export function getErrorMessage(error: unknown): string {
  const code = errorCode(error)
  if (code) return MESSAGES[code]!

  const authCode = field(error, 'code')
  if (typeof authCode === 'string' && authCode in AUTH_MESSAGES) return AUTH_MESSAGES[authCode]!
  if (authCode === '42501') return 'Na toto nemáš oprávnenie.'
  if (authCode === '23514') return 'Niektorá hodnota je mimo povoleného rozsahu.'

  const message = field(error, 'message')
  if (typeof message === 'string' && /failed to fetch|networkerror|load failed/i.test(message)) {
    return NETWORK_ERROR
  }

  console.error('Unexpected error', error)
  return GENERIC_ERROR
}
