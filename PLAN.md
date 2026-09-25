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

## M2 Prihlásenie, onboarding, profil, partičky

- [ ] Supabase klient, auth provider, chránené routy
- [ ] prihlásenie OTP, rýchle prihlásenie (len DEV)
- [ ] onboarding, profil, téma
- [ ] založenie partičky, pozvánka, členovia, nastavenia
- [ ] dizajnový systém (tokeny, typografia, komponenty)
- [ ] screenshot kontrola
- [ ] commit M2

## M3 Termíny

- [ ] zoznam termínov, domov
- [ ] detail so súpiskou na ľade
- [ ] prihlasovanie, čakacia listina, odhlásenie, upozornenie na postup
- [ ] admin: vytvorenie (opakovanie), úprava, pridanie a odobratie hráča, zrušenie
- [ ] realtime
- [ ] commit M3

## M4 Platby

- [ ] Pay by square, SPD, QR, kopírovanie údajov
- [ ] nahlásenie, zrušenie, potvrdenie, zamietnutie, hotovosť
- [ ] moje financie
- [ ] commit M4

## M5 Uzávierka a financie partičky

- [ ] dochádzka a uzávierka, znovuotvorenie
- [ ] vyplácanie brankárov
- [ ] financie partičky, tabuľky, CSV export
- [ ] commit M5

## M6 Burza a zdieľanie

- [ ] burza s filtrami, zverejnenie, schvaľovanie hostí
- [ ] verejná stránka príspevku
- [ ] Open Graph (Vercel middleware)
- [ ] WhatsApp odkazy, Web Share
- [ ] commit M6

## M7 Doladenie

- [ ] dizajnová kontrola 8.6 (390 / 1440, obe témy)
- [ ] PWA, offline shell, ikony
- [ ] prístupnosť, prázdne a chybové stavy
- [ ] kompletné e2e
- [ ] README
- [ ] akceptačné kritériá (sekcia 14)
- [ ] commit M7
