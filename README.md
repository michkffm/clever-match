# TanzMatch

**Deutsch** | [English](README.en.md)

[Live-App](https://tanzmatch-web.onrender.com/)

TanzMatch ist eine Fullstack-App zum Finden von Tanzpartnern mit Profilen, Matching und Chat. Frontend und Backend laufen auf Render; die Daten werden in MongoDB Atlas gespeichert.

![TanzMatch – Anmeldung auf dem Desktop](docs/tanzmatch-desktop.png)

## Funktionen

- Registrierung, Anmeldung und eigener Gastzugang
- Profile bearbeiten und Tanzpartner entdecken
- Likes, gegenseitige Matches und Chat
- Events und Event-Anmeldungen
- Private Profile und Blockieren anderer Nutzer
- Deutsche und englische Oberfläche, Hell- und Dunkelmodus
- Bedienung per Tastatur, sichtbare Fokusmarkierung, größere Schrift und reduzierte Bewegung

## Mobile Ansicht

<img src="docs/tanzmatch-mobile.png" alt="TanzMatch – Anmeldung auf einem Smartphone" width="390">

Die Screenshots zeigen die veröffentlichte Anmeldung zum Zeitpunkt der Aufnahme. Die Oberfläche wird weiterentwickelt.

## Entwicklungsstand

TanzMatch bleibt kostenlos. Der Passwort-Reset über Resend und die Vervollständigung der Benachrichtigungen sind noch in Arbeit. Es gibt keine bezahlten Abos. Einzelne erweiterte Oberflächen enthalten noch nicht vollständig umgesetzte Funktionen oder Übersetzungen. Vorhandene Frontend-Lintfehler werden separat bereinigt. Eine vollständige Prüfung auf WCAG-Konformität wurde noch nicht durchgeführt.

## Lokal starten

Voraussetzungen: Node.js 22, npm und eine erreichbare MongoDB-Datenbank.

```bash
git clone https://github.com/michkffm/tanzmatch.git
cd tanzmatch
npm ci
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
npm run build -w packages/types
npm run dev:all
```

Trage vor dem Start die MongoDB-URI und einen zufälligen JWT-Schlüssel mit mindestens 32 Zeichen in `backend/.env` ein. Echte Zugangsdaten gehören niemals ins Repository.

Frontend: `http://localhost:5173` · API: `http://localhost:5000/api`

## Prüfen und bauen

```bash
npm run type-check
npm run lint
npm run test:e2e
npm run build
npm run start:backend
```

Der Produktionsbuild erstellt zuerst die gemeinsamen Typen, danach Frontend und Backend. Die Browserprüfungen starten einen lokalen Frontend-Testserver. `npm run lint` meldet derzeit noch bestehende Frontend-Probleme.

## Technologien und Struktur

| Bereich | Technologien / Verzeichnis |
| --- | --- |
| Frontend | React, TypeScript, Vite, Zustand · `frontend/` |
| Backend | Node.js, Express, Mongoose, WebSocket · `backend/` |
| Datenbank | MongoDB Atlas |
| Gemeinsame Typen | TypeScript · `packages/types/` |
| Browserprüfungen | Playwright · `e2e/` |
| Bereitstellung | Render Blueprint · `render.yaml` |

## Konfiguration und Bereitstellung

Die benötigten Variablen sind ohne geheime Werte in `backend/.env.example` und `frontend/.env.example` dokumentiert. `render.yaml` beschreibt die API und das statische Frontend.

- `MONGODB_URI`: MongoDB-Verbindung, auf Render als Secret speichern
- `JWT_SECRET`: zufälliger Schlüssel für Sitzungstokens
- `CORS_ORIGIN`: erlaubte Frontend-Adresse
- `VITE_API_HOST` oder `VITE_API_URL`: Backend-Adresse für das Frontend
- `CLOUDINARY_URL`: erforderlich für Profilfoto-Uploads
- `ENABLE_DEMO_SEED`: nur für ausdrücklich aktivierte lokale Demo-Daten

Passwort-Reset ist bis zur sicheren Einrichtung eines E-Mail-Versanddiensts deaktiviert. Secrets werden ausschließlich lokal oder im Hosting-Dienst gespeichert.

## Sicherheit und Datenschutz

Öffentliche Profile geben keine E-Mail-Adressen oder genauen Koordinaten aus. Access-Tokens sind kurzlebig und werden im Browser nur im Arbeitsspeicher gehalten. Chat-Zugriff setzt ein aktives gegenseitiges Match voraus. Lokale `.env`-Dateien, Abhängigkeiten und Build-Ausgaben sind von Git ausgeschlossen.

## Autor

Michael Koch · [GitHub](https://github.com/michkffm) · [Portfolio](https://michael-koch-portfolio.vercel.app/)
