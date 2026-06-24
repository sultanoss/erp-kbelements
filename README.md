# KB ELEMENTS ERP

Web-ERP mit Next.js 15, TypeScript, Tailwind CSS, PostgreSQL, Prisma und rollenbasiertem Login.

## Start

1. `.env.example` nach `.env` kopieren.
2. `DATABASE_URL`, `AUTH_SECRET` und `AUTH_URL` setzen.
3. Pakete installieren:

```bash
npm install
```

4. Datenbank migrieren und Admin-Benutzer anlegen:

```bash
npx prisma migrate dev
npx prisma db seed
```

5. App starten:

```bash
npm run dev
```

## Seed Login

- E-Mail: `radwansultan@hotmail.de`
- Passwort: `Admin123!`
- Rolle: `Admin`

## Rollen

- Admins verwalten Benutzer, Rollen, Lagerbestand und alle Lagerbewegungen.
- User/Mitarbeiter sehen das Dashboard und erfassen Verkaeufe, Wareneingaenge und Korrekturen.

Artikel werden in der Oberflaeche ueber `SKU` gefuehrt. Es wird keine sichtbare Artikel-ID verwendet.
