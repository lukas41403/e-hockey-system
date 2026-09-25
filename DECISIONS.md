# Rozhodnutia

Každé netriviálne rozhodnutie jednou vetou: čo a prečo.

## Prostredie a nástroje

- Projekt beží na Node 24 LTS (`.nvmrc`), lebo Vitest 5, React Router 8 a jsdom 30 už Node 20 nepodporujú a Node 20 je mimo podpory.
- TypeScript je 6.0, nie 7.0, lebo typescript-eslint zatiaľ podporuje len TypeScript < 6.1.
- Supabase CLI je devDependency (`npx supabase`), aby čistý klon nepotreboval globálnu inštaláciu.
- V lokálnom Supabase sú vypnuté Studio, Storage, Analytics a Edge runtime, lebo appka ich nepotrebuje a šetrí to pamäť.
- `auto_expose_new_tables = false`: každý grant pre `anon` a `authenticated` je v migrácii explicitne, nič nie je sprístupnené omylom.
- Archivo sa načítava s osou šírky (`wdth` 62 až 125 %), takže záložný Barlow nie je potrebný.

## Doménové pravidlá

- Čas biznis logiky ide cez `private.current_ts()`; seed a pgTAP (priame spojenie ako `postgres`) môžu čas pripnúť cez `set app.now`, aby história vznikla tými istými funkciami, API požiadavky (`authenticator`) to nedokážu.
- Poradie na čakacej listine je `created_at` a potom `seq` (identity stĺpec), takže nikdy nevznikne duplicitné poradie ani pri rovnakom čase.
- Uvoľnenie neskorého odhlásenia: keď vznikne nová `confirmed` registrácia (prihlásenie, pridanie adminom alebo schválenie hosťa), najprv sa uvoľní vlastné `late_cancelled` toho istého človeka, ak ho má (nikto neplatí dvakrát), inak najstaršie `late_cancelled` (podľa času odhlásenia) rovnakej pozície. Postup z čakacej listiny uvoľní len vlastné `late_cancelled`, lebo postupujúci obsadzuje miesto riadne odhláseného, nie neskoro odhláseného.
- Brankár sa pri neskorom odhlásení bez náhrady dostane do `late_cancelled` (admin vidí, kto chýba), ale pri uzávierke nikdy nič neplatí.
- Dôvod zrušenia registrácie sa ukladá do `cancel_reason`, aby appka vedela hráčovi vysvetliť, prečo neplatí alebo platí.
- Samostatné prihlásenie a odhlásenie je možné len pred začiatkom termínu; admin môže pridávať a odoberať hráčov aj po začiatku (hráč, ktorý prišiel bez prihlásenia), až do uzávierky. Postup z čakacej listiny prebieha len pred začiatkom.
- Hosť (rola `guest`) aj nečlen sa môžu prihlásiť len na termín s aktívnym príspevkom v burze, ktorý ponúka danú pozíciu; so zapnutým schvaľovaním vzniká `pending`, inak `confirmed` alebo `waitlist` a zároveň členstvo `guest`.
- Uzávierka vyžaduje dochádzku (true/false) pre každú `confirmed` registráciu a termín, ktorý už začal.
- Odobratie člena zlyhá (`MEMBER_HAS_BALANCE`), ak má nenulový zostatok, aby žiadne peniaze nezostali mimo členov partičky a finančný invariant platil; admin najprv zapíše platbu alebo adjustment.
- Vyplatenie cez `create_goalie_payout` vytvorí čakajúcu odchádzajúcu platbu s VS (kvôli QR); predchádzajúca nepotvrdená výplata toho istého brankára sa zruší. Záznam `goalie_payout` vznikne až potvrdením a zostatok sa kontroluje pri vytvorení aj pri potvrdení.
- Vyplácať sa dá len členovi, ktorý má aspoň jeden `goalie_earning` v partičke, lebo typ záznamu je `goalie_payout`.
- Krajinu (a tým menu) partičky možno zmeniť, len kým v nej nie sú žiadne platby ani záznamy v denníku.
