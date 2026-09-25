# Partička v1: plán

Stav práce po míľnikoch. `[x]` hotové a overené, `[ ]` zostáva, `[-]` vedome vynechané (dôvod v poznámke).
Rozhodnutia sú v `DECISIONS.md`.

## Prostredie

- Node 24 LTS (`.nvmrc`), Docker Desktop, Supabase CLI ako devDependency (`npx supabase`).
- Príkazy spúšťaj s Node 24: `nvm use`.

## M0 Projekt, nástroje, testovacia infraštruktúra

- [x] git, `.nvmrc`, `package.json`, závislosti
- [x] TypeScript strict, Vite 8, Tailwind 4, ESLint 10, Prettier
- [x] `supabase init`, `config.toml` (OTP šablóny, vypnuté nepotrebné služby, explicitné granty)
- [x] Vitest (unit + integration projekty), Testing Library setup
- [x] Playwright (mobil 390 px, desktop 1440 px), fixtúra padá pri chybe v konzole, príprava e2e (reset DB, `.env.local`)
- [x] `npm run check` (typecheck, lint, unit, db, e2e)
- [x] commit M0

## M1 Schéma, RLS, DB funkcie, pgTAP

- [x] typy, tabuľky, obmedzenia, indexy
- [x] nemenný denník (trigger aj pre service_role, aj TRUNCATE)
- [x] pomocné funkcie (čas, IBAN, cena, oprávnenia)
- [x] RLS politiky a granty (jedna záverečná migrácia s explicitnými grantmi)
- [x] funkcie: partičky a profil
- [x] funkcie: termíny a registrácie (kapacita, čakacia listina, storno)
- [x] funkcie: uzávierka a znovuotvorenie
- [x] funkcie: platby, vyplácanie brankárov, adjustmenty
- [x] funkcie: burza, verejný príspevok, kontakty
- [x] pohľady `member_balances`, `session_summaries`, `group_finance_summary` (+ `member_finance`, `ledger_entries_classified`)
- [x] realtime publikácia (registrations, sessions, payments)
- [x] pgTAP: cena, kapacita, storno, uzávierka, platby, denník, RLS, burza, partičky, invariant (239 testov)
- [x] seed dáta cez DB funkcie (39 používateľov, 3 partičky)
- [x] generované typy
- [x] integračný test súbežných registrácií
- [x] commit M1

## Čisté moduly (lib) s unit testami

- [x] money, dates, iban, phone, pricing, paybysquare, spd, whatsapp, csv, og, errors

## M2 až M6: stav kódu (napísané, typecheck, lint a unit testy zelené; e2e zatiaľ nie)

Kód je napísaný a ručne overený v prehliadači len čiastočne (Domov, detail termínu so súpiskou, Moje financie, platba s QR). Ostatné toky sú napísané, ale neoverené v prehliadači ani e2e.

- [x] Supabase klient, auth provider, chránené routy, onboarding redirect
- [x] prihlásenie OTP (e-mail + 6-miestny kód), rýchle prihlásenie len v DEV (lazy, vypadne z produkčného buildu; treba overiť grepom `dist`)
- [x] onboarding, profil, téma (systém / svetlá / tmavá)
- [x] založenie partičky, pozvánka (odkaz, zdieľanie, pregenerovanie), členovia (roly, odobratie, WhatsApp), nastavenia
- [x] dizajnový systém (tokeny, Archivo s osou šírky, 44 px ciele, spodný panel na mobile)
- [x] Domov (upozornenie na postup, najbližší termín, ďalšie termíny, zostatky), overené v prehliadači
- [x] detail termínu so súpiskou na ľade (SVG, na výšku / na šírku, môj slot, animácia), overené v prehliadači
- [x] prihlasovanie, čakacia listina, odhlásenie s dialógom pri neskorom odhlásení, optimistické aktualizácie, realtime
- [x] admin: vytvorenie (opakovanie), úprava, pridanie a odobratie hráča, schválenie hostí, zrušenie termínu
- [x] platby: Pay by square / SPD, QR, kopírovanie údajov, „Zaplatil som“, zrušenie; Moje financie s históriou (overené v prehliadači)
- [x] dochádzka a uzávierka so súhrnom, znovuotvorenie
- [x] financie partičky: súhrn, platby na potvrdenie, hotovosť, oprava zostatku, vyplácanie brankárov (QR / hotovosť), tabuľky hráčov a termínov, CSV
- [x] burza s filtrami, verejná stránka príspevku, zverejnenie a stiahnutie, OG middleware (unit test), `vercel.json`
- [x] superadmin `/admin`
- [x] PWA ikony a OG obrázok (`public/`)
- [ ] commity M2 až M6 samostatne (zatiaľ jeden spoločný commit „M2–M6 WIP“)

## Zostáva (ďalšia session)

- [ ] opraviť v seede časy (upravené `pg_temp.at`, treba `npx supabase db reset` a znova `supabase test db`)
- [ ] ručne overiť v prehliadači: prihlásenie kódom, onboarding, pozvánka, partička, admin akcie, uzávierka, vyplácanie, burza, verejný príspevok
- [ ] e2e testy (7 tokov zo sekcie 11, mobil aj desktop) + axe; odstrániť `e2e/smoke.spec.ts` alebo rozšíriť
- [ ] offline hláška v app shelle overiť (service worker cez vite-plugin-pwa)
- [ ] dizajnová kontrola 8.6 (390 / 1440 px, obe témy), kontrast tmavej témy
- [ ] overiť, že produkčný build neobsahuje panel rýchleho prihlásenia (`grep -r hokej123 dist`)
- [ ] README (požiadavky, lokálne spustenie, seed účty, nasadenie Supabase Cloud + Vercel, e-mailová šablóna, premenné prostredia)
- [ ] `npm run check` celý na čistom klone
- [ ] akceptačné kritériá (sekcia 14) jedno po druhom
