# Google Merchant Center / Shopify Feed – Produktaudit

**Datum:** 02.07.2026  
**Merchant Center:** kbelements-shop (5816291202)  
**Datenquelle:** Shopify App API  
**Umfang:** 65 von 65 Merchant-Center-Produkten  
**Änderungen:** keine

## Management Summary

- 65 genehmigt, 0 eingeschränkt, 0 abgelehnt, 0 in Prüfung.
- 65/65 mit Vendor **KB ELEMENTS**.
- 65/65 mit eindeutiger SKU und gültiger, eindeutiger EAN/GTIN.
- 65/65 mit Shopify Product Type **Herdset**.
- 65/65 mit manueller Google Product Category **684 (Backöfen)** in beiden Google-relevanten Metafields.
- 65/65 mit Shopify-Taxonomie **Heim & Garten > Küche & Esszimmer > Küchengeräte > Backöfen**.
- 65/65 mit Energieklasse A+, Energielabel und Produktdatenblatt-URL.
- Alle 27 eindeutigen Energielabel-/Datenblatt-Dateien sind öffentlich erreichbar (HTTP 200).
- 65/65 mit Hauptbild mindestens 1000 × 1000 Pixel und Alt-Text.
- 65/65 mit Preis, Bestand größer 0 und Merchant-Verfügbarkeit „In stock“.
- 10 Produkte besitzen einen Vergleichspreis/Angebotspreis.
- 3 Shopify-Titel überschreiten Googles Grenze von 150 Zeichen.
- Alle Titel sind relativ lang (106–156 Zeichen; Durchschnitt 134). Die Merchant-Center-Anzeige verwendet bereits verkürzte Feedtitel.

## Bewertung nach Attribut

| Attribut | Ergebnis | Bewertung |
|---|---|---|
| Google Product Category | 65/65 = 684, manuell in mm-google-shopping und mc-facebook | Vollständig; für Sets technisch vertretbar, aber sehr pauschal |
| product_type | 65/65 = Herdset | Zu grob für Kampagnensegmentierung; Priorität 2 |
| GTIN / EAN | 65/65 vorhanden, gültige Prüfziffer, keine Duplikate | Sauber |
| MPN / SKU | 65/65 vorhanden und eindeutig | Sauber; SKU dient als MPN-Basis |
| Brand | 65/65 KB ELEMENTS | Sauber |
| Condition | Keine Ablehnung; Standardzustand der Shopify-Google-Integration ist als Neuware zu bestätigen | Kein akuter Fehler, Kontrolle empfohlen |
| Energieeffizienzklasse | 65/65 A+ | Vollständig |
| Energielabel | 65/65 vorhanden und öffentlich erreichbar | Sauber |
| EU-Produktdatenblatt | 65/65 vorhanden und öffentlich erreichbar | Sauber; ein Datenblatt liegt als JPG statt PDF vor |
| Versand | Keine Merchant-Ablehnung; produktbezogene Versandwerte werden global/profilbasiert geliefert | Globalen Abgleich regelmäßig kontrollieren |
| Rückgabe | Keine Merchant-Ablehnung | Globale Merchant-Richtlinie regelmäßig kontrollieren |
| Preis / Angebotspreis | 65/65 Preis; 10 mit Vergleichspreis | Sauber |
| Verfügbarkeit | 65/65 Bestand > 0; Merchant zeigt In stock | Sauber |
| Hauptbild | 65/65 mindestens 1000 px und mit Alt-Text | Sauber |
| Titel | 3 über 150 Zeichen; alle lang | 3 × Priorität 1, übrige Priorität 2 |

## Produktbezogene Diagnose

| Produkt / SKU | Status | Problem | Ursache | Priorität | Empfohlene Lösung |
|---|---|---|---|---|---|
| KB ELEMENTS 2er-Set Backofen Touch A+ + Induktion Schuko Silber / **ELK75DV3/ELK60PB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + AntiScratch Silber / **ELK75DV3/ELK111AS** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + Glaskeramik 77 cm + Kopffreihaube / **ELK75EV1P/ELK77CR1/ELK151H80** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 4er-Set Backofen + Gaskochfeld + Kopffreihaube + MW / **ELK75EV1P/ELK60GH2/ELK150H60/ELK25MB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 4-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Induktion 60 cm Silber / **ELK75DV3/ELK60FB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 4er-Set Backofen + AntiScratch + Kopffreihaube + MW / **ELK75EV1P/ELK111AS/ELK150H60/ELK25MB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 4-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 4er-Set Backofen + Induktion + Kopffreihaube + MW / **ELK75EV1P/ELK60FB1/ELK150H60/ELK25MB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 4-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + AntiScratch 2 Flex + Kopffreihaube / **ELK75EV1P/ELK111AS/ELK150H60** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + Induktion 77 cm + Kopffreihaube / **ELK75EV1P/ELK105PF/ELK151H80** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen A+ + Induktion 90 cm S/S / **ELK75EV2P/ELK106PF** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Induktion 60 cm Schwarz / **ELK75DV1/ELK60FB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen A+ + AntiScratch 2 Flexzonen S/S / **ELK75EV2P/ELK111AS** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 4er-Set Backofen + Schuko + Haube + Mikrowelle / **ELK75EV1P/ELK60PB1/ELK156S60B/ELK25MB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 4-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen A+ + AntiScratch Schuko S/S / **ELK75EV2P/ELK112AS** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + AntiScratch Schuko Silber / **ELK75DV3/ELK112AS** | Genehmigt | Shopify-Titel 154 Zeichen; zusätzlich product_type zu grob | Vollständige Merkmalsliste überschreitet 150 Zeichen | 1 | Titel auf höchstens 150 Zeichen kürzen; wichtigste Suchbegriffe zuerst; product_type hierarchisch gliedern |
| KB ELEMENTS 3er-Set Backofen + AntiScratch Schuko + Kopffreihaube / **ELK75EV1P/ELK112AS/ELK150H60** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 4er-Set Backofen + Induktion + Haube + Mikrowelle / **ELK75EV1P/ELK60FB1/ELK156S60B/ELK25MB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 4-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + Induktion Schuko + Kopffreihaube / **ELK75EV1P/ELK60PB1/ELK150H60** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Gaskochfeld 70 cm Silber / **ELK75DV3/ELK70GH1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen 45 cm + Domino Induktion + Haube / **ELK45EV1/ELK29PB1/ELK156S60B** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Gaskochfeld 90 cm Silber / **ELK75DV3/ELK90GH1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + Induktion Schuko + Haube 60 cm / **ELK75EV2P/ELK60PB1/ELK156S60S** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + Glaskeramik 77 cm + Kopffreihaube / **ELK75EV2P/ELK77CR1/ELK151H80** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Induktion Schuko S/S / **ELK75DV2/ELK60PB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen A+ + Induktion 77 cm 5 Zonen S/S / **ELK75EV2P/ELK105PF** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Glaskeramik 60 cm / **ELK75DV1/ELK60CR1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + Induktion 90 cm + Haube 90 cm / **ELK75EV2P/ELK106PF/ELK156S90S** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + Glaskeramik 60 cm + Kopffreihaube / **ELK75EV2P/ELK60CR1/ELK150H60** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + AntiScratch Schuko S/S / **ELK75DV2/ELK112AS** | Genehmigt | Shopify-Titel 152 Zeichen; zusätzlich product_type zu grob | Vollständige Merkmalsliste überschreitet 150 Zeichen | 1 | Titel auf höchstens 150 Zeichen kürzen; wichtigste Suchbegriffe zuerst; product_type hierarchisch gliedern |
| KB ELEMENTS 4er-Set Backofen + Gaskochfeld + Haube + Mikrowelle / **ELK75EV1P/ELK60GH2/ELK156S60B/ELK25MB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 4-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen A+ + Gaskochfeld 76 cm S/S / **ELK75EV2P/ELK76GH1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen A+ + Gaskochfeld 60 cm S/S / **ELK75EV2P/ELK60GH1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + AntiScratch Schuko / **ELK75DV1/ELK112AS** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen 90 cm Rotisserie + Induktion 90 cm / **ELK90DV1/ELK106PF** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Glaskeramik 60 cm Silber / **ELK75DV3/ELK60CR1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + AntiScratch 2 Flex + Haube / **ELK75EV1P/ELK111AS/ELK156S60B** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 4er-Set Backofen + Glaskeramik + Kopffreihaube + MW / **ELK75EV1P/ELK60CR1/ELK150H60/ELK25MB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 4-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 4er-Set Backofen + Glaskeramik + Haube + Mikrowelle / **ELK75EV1P/ELK60CR1/ELK156S60B/ELK25MB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 4-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Gaskochfeld 60 cm Silber / **ELK75DV3/ELK60GH2** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + Induktion 60 cm + Kopffreihaube / **ELK75EV1P/ELK60FB1/ELK150H60** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen A+ + Induktion Schuko 60 cm S/S / **ELK75EV2P/ELK60PB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Induktion 60 cm S/S / **ELK75DV2/ELK60FB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Glaskeramik 77 cm Silber / **ELK75DV3/ELK77CR1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + Induktion 60 cm + Haube / **ELK75EV1P/ELK60FB1/ELK156S60B** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 4er-Set Backofen + AntiScratch Schuko + Kopffreihaube / **ELK75EV1P/ELK112AS/ELK150H60/ELK25MB1** | Genehmigt | Shopify-Titel 156 Zeichen; zusätzlich product_type zu grob | Vollständige Merkmalsliste überschreitet 150 Zeichen | 1 | Titel auf höchstens 150 Zeichen kürzen; wichtigste Suchbegriffe zuerst; product_type hierarchisch gliedern |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Induktion 90 cm Schwarz / **ELK75DV1/ELK106PF** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + Glaskeramik 60 cm + Kopffreihaube / **ELK75EV1P/ELK60CR1/ELK150H60** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + AntiScratch 2 Zonen / **ELK75DV1/ELK111AS** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + AntiScratch Schuko + Haube / **ELK75EV1P/ELK112AS/ELK156S60B** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + Glaskeramik 60 cm + Haube 60 cm / **ELK75EV2P/ELK60CR1/ELK156S60S** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Induktion 77 cm Silber / **ELK75DV3/ELK105PF** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 4er-Set Backofen + Schuko + Kopffreihaube + MW / **ELK75EV1P/ELK60PB1/ELK150H60/ELK25MB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 4-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Glaskeramik 77 cm S/S / **ELK75DV2/ELK77CR1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Glaskeramik 77 cm / **ELK75DV1/ELK77CR1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Glaskeramik 60 cm S/S / **ELK75DV2/ELK60CR1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Induktion 77 cm Schwarz / **ELK75DV1/ELK105PF** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen 45 cm A+ + Domino Induktion 30 cm / **ELK45EV1/ELK29PB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Induktion Schuko Schwarz / **ELK75DV1/ELK60PB1** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Induktion 90 cm S/S / **ELK75DV2/ELK106PF** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + Induktion 90 cm + Haube 90 cm / **ELK75EV1P/ELK106PF/ELK156S90B** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Induktion 90 cm Silber / **ELK75DV3/ELK106PF** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + Induktion Schuko + Haube / **ELK75EV1P/ELK60PB1/ELK156S60B** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + Induktion 77 cm S/S / **ELK75DV2/ELK105PF** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 2er-Set Backofen Touch A+ + AntiScratch S/S / **ELK75DV2/ELK111AS** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 2-teilig > Kochfeldart aufbauen |
| KB ELEMENTS 3er-Set Backofen + Induktion 60 cm + Haube 60 cm / **ELK75EV2P/ELK60FB1/ELK156S60S** | Genehmigt | Keine Pflichtfeldlücke; product_type „Herdset“ ist für Shopping-Segmentierung zu grob | Alle Setarten werden nur als Herdset gruppiert | 2 | product_type z. B. Küche > Herdsets > 3-teilig > Kochfeldart aufbauen |

## Klare To-do-Liste

### Priorität 1 – muss korrigiert werden

1. Drei Shopify-Titel auf maximal 150 Zeichen kürzen:
   - ELK75DV3/ELK112AS – 154 Zeichen
   - ELK75DV2/ELK112AS – 152 Zeichen
   - ELK75EV1P/ELK112AS/ELK150H60/ELK25MB1 – 156 Zeichen
2. Prüfen, ob das als JPG hinterlegte Datenblatt für ELK156S60S als offizielles PDF verfügbar ist; öffentlich erreichbar ist es bereits.

### Priorität 2 – wichtig für bessere Shopping-Leistung

1. product_type von pauschal „Herdset“ auf eine sinnvolle Hierarchie erweitern.
2. Google-Shopping-Titel systematisch auf ungefähr 70–120 Zeichen optimieren: Marke, Setgröße, Backofen, Kochfeldart, Breite und stärkstes Merkmal zuerst.
3. Prüfen, ob Google Product Category 684 für alle Mehrgeräte-Sets bewusst beibehalten werden soll. Sie ist vollständig manuell gesetzt, aber für 3er-/4er-Sets nur die dominante Backofen-Kategorie.
4. Condition im Google-&-YouTube-Kanal explizit als new dokumentieren, auch wenn aktuell keine Diagnose vorliegt.
5. Versand- und Rückgaberichtlinien regelmäßig gegen Shopify prüfen, insbesondere Speditionspreise und Lieferzeiten.

### Priorität 3 – optionaler Feinschliff

1. Dateinamen der Energiedokumente vereinheitlichen und doppelte Endungen wie .pdf.pdf bereinigen.
2. Datenblätter bevorzugt einheitlich als PDF bereitstellen.
3. Kampagnenstruktur später anhand von Setgröße, Kochfeldart, Farbe und Preisgruppe aufbauen.
4. Bildvarianten für Performance Max um zusätzliche freigestellte Produkt- und Lifestyle-Aufnahmen ergänzen.

## Schlussfolgerung

Der Feed ist technisch deutlich besser als nur „genehmigt“: Pflichtdaten, Identifikatoren, Marke, Energieinformationen, Preise, Bestand und Bilder sind vollständig. Das größte Leistungspotenzial liegt nicht in fehlenden Pflichtfeldern, sondern in präziseren Produkttypen und kürzeren, stärker priorisierten Shopping-Titeln. Es wurden keine Änderungen vorgenommen.

