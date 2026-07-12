# QA-Bericht – fünf aktualisierte Herdsets

Prüfdatum: 01.07.2026  
Geprüftes Theme: **Kopie von FinalVersion-3** (Theme-ID 198612058376, Draft)  
Prüfart: ausschließlich lesend; keine Änderungen und keine Veröffentlichung

## Ergebnis

| Produkt | Produktseite | Collection | Mobile | SEO | URLs | Ergebnis |
| --- | --- | --- | --- | --- | --- | --- |
| ELK75EV1P/ELK60CR1 | Bestanden | Bestanden | Bestanden | Bestanden | Bestanden | Bestanden |
| ELK75EV1P/ELK60FB1 | Bestanden | Bestanden | Bestanden | Bestanden | Bestanden | Bestanden |
| ELK75EV1P/ELK60PB1 | Bestanden | Bestanden | Bestanden | Bestanden | Bestanden | Bestanden |
| ELK75EV1P/ELK111AS | Bestanden | Bestanden | Bestanden | Bestanden | Bestanden | Bestanden |
| ELK75EV1P/ELK112AS | Bestanden | Bestanden | Bestanden | Bestanden | Bestanden | Bestanden |

## Prüfschritte

1. **Produktseiten, Desktop:** Alle fünf neuen Shopify-Titel erscheinen als H1 vollständig. Es besteht keine horizontale Überbreite.
2. **Produktseiten, Mobile 375 × 667:** Alle H1-Titel sind im DOM vollständig, ohne CSS-Clipping und ohne horizontale Überbreite.
3. **SEO:** Pro Produkt existieren genau ein HTML-`<title>` und eine Meta Description. Beide stimmen exakt mit den vorgegebenen SEO-Daten überein.
4. **Strukturierte Daten:** Der jeweilige neue Produkttitel ist in den Product-JSON-LD-Daten vorhanden.
5. **Collections:** Alle fünf unveränderten Produkt-Handles werden in „Sets & Kombinationen“ gefunden; beide AntiScratch-Produkte sind zusätzlich weiterhin „AntiScratch Kochfelder & Sets“ zugeordnet. Desktop und Mobile weisen keine horizontale Überbreite auf.
6. **Shopify-Suche:** Die Suchergebnisse enthalten alle fünf Produkte mit den neuen Titeln.
7. **Predictive Search:** Aktiv und funktionsfähig; beide AntiScratch-Produkte werden bei passender Eingabe gefunden.
8. **URLs:** Alle fünf bisherigen Handles und Canonical-URLs sind unverändert. Beim direkten Aufruf entstand keine Weiterleitung auf einen neuen Handle.
9. **Unveränderte Produktdaten:** Jedes Produkt besitzt weiterhin genau eine Default-Variante mit der erwarteten SKU. Preise, Vergleichspreise, Barcodes, Beschreibungen, Tags, Collections und Download-Metafelder sind vorhanden. Die Bedienungsanleitungen und Datenblätter sind auf den Produktseiten verlinkt.
10. **Bewertungen:** Judge.me-Daten sind weiterhin vorhanden; alle fünf Produkte stehen aktuell bei 0 Bewertungen.
11. **Breadcrumbs:** Funktionieren und zeigen die bisherigen Collection-/SKU-Pfade.
12. **Fehlerprüfung:** Keine produktbezogenen JavaScript- oder Liquid-Fehler gefunden.

## Gefundene Auffälligkeit

**Predictive Search – geringe UX-Auffälligkeit (kein Funktionsfehler):**  
Die langen Produkttitel werden in den Vorschlagskarten visuell mit Auslassungspunkten gekürzt. Die vollständigen neuen Titel sind technisch vorhanden und die richtigen Produkte werden gefunden. Ursache ist die vorhandene Begrenzung der Kartenüberschrift. Konkrete optionale Lösung: in einem späteren, freigegebenen Theme-Änderungsschritt die Zeilenbegrenzung der Predictive-Search-Titel auf zwei bis drei Zeilen erhöhen oder die Kartenbreite anpassen.

## Unabhängiger technischer Hinweis

Im Browserprotokoll erschien eine Warnung des Meta Pixels wegen eines ungültigen `pixel_id`-Parameters. Sie stammt aus Shopifys Checkout-/Tracking-Skript und steht nicht im Zusammenhang mit den fünf Titel-/SEO-Änderungen.

## Belege

Die Screenshots 01–10 dokumentieren alle fünf Produktseiten auf Desktop und Mobile. Die Screenshots 11, 12, 15 und 16 dokumentieren Collection, Mobile-Collection, Suchergebnisse und Predictive Search.
