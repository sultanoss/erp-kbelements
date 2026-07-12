# KB ELEMENTS – Google Merchant Center Feed-Architektur

**Datum:** 2. Juli 2026  
**Merchant-Center-Konto:** kbelements-shop (5816291202)  
**Prüfart:** ausschließlich lesende Analyse  
**Durchgeführte Änderungen:** keine

## 1. Aktuelle Feed-Architektur

| Bereich | Ist-Zustand |
|---|---|
| Primäre Produktquelle | Shopify Google & YouTube App |
| Merchant-Datenquellentyp | Merchant API |
| Name der Datenquelle | Shopify App API |
| Source-ID | 10679611358 |
| Anzahl Produkte | 70 |
| Zielland | Deutschland |
| Sprache | Deutsch |
| Feed-Label | EUR_102949617928 |
| Synchronisierung | API |
| XML-/Datei-Feed | Nicht vorhanden |
| Supplemental Feed | Nicht vorhanden |
| Attribut-/Feedregeln | Nicht aktiviert |
| Advanced Data Source Management | Verfügbar, aber nicht aktiviert |

Die Produkte werden direkt durch die Shopify-App über die Merchant API synchronisiert. Es besteht kein eigenständiger XML- oder CSV-Hauptfeed.

## 2. Tatsächlich übertragene Attribute

Die Prüfung der Merchant-Rohdaten und der verarbeiteten Produktdaten ergab folgende übertragene Attribute:

| Google-Attribut | Beispiel | Quelle |
|---|---|---|
| id / Product ID | Shopify Produkt- und Varianten-ID | Automatisch durch Shopify-App |
| title | Herdset mit Glaskeramikkochfeld … | Shopify SEO-Titel |
| description | Shopify Meta Description | Shopify SEO-Feld |
| link | Produkt-URL mit Varianten-ID und Google-UTM | Automatisch |
| image_link | Shopify-Hauptbild | Shopify Produktmedien |
| additional_image_link | Weitere Produktbilder | Shopify Produktmedien |
| price | Regulärer Variantenpreis | Shopify Variante |
| sale_price | Reduzierter Preis | Shopify Preis und Compare-at-Preis |
| availability | in_stock | Shopify Bestand |
| brand | KB ELEMENTS | Shopify Vendor |
| gtin | EAN/Barcode | Shopify Varianten-Barcode |
| color | schwarz | Shopify Produkt-/Kategorieattribute |
| google_product_category | 684 | Merchant-Metafield |
| product_type | Herdset | Shopify Product Type |
| shipping_weight | 45 kg | Shopify Variantengewicht |
| identifier_exists | true | Automatisch berechnet |
| sell_on_google_quantity | 100 | Shopify Bestand |
| merchant_item_id | Shopify Varianten-GID | Automatisch |
| Marketingmethoden | Free Listings und Shopping Ads | Merchant-Einstellung |
| Zielland | Deutschland | Datenquellen-Einstellung |
| Sprache | Deutsch | Datenquellen-Einstellung |

Wichtige Feststellung: Die im Merchant Center angezeigten Shopping-Titel entsprechen den Shopify-SEO-Titeln und nicht zwingend den sichtbaren Shopify-Produkttiteln.

## 3. Pflegequelle je Attribut

| Attribut | Aktuelle Pflegequelle |
|---|---|
| Shopping-Titel | Shopify SEO-Titel |
| Beschreibung | Shopify Meta Description |
| Marke | Shopify Vendor |
| GTIN | Shopify Varianten-Barcode |
| Preis und Angebotspreis | Shopify Variante |
| Verfügbarkeit | Shopify Bestand |
| Produktlink | Automatisch erzeugt |
| Bilder | Shopify Produktmedien |
| product_type | Shopify Product Type |
| Google Product Category | mm-google-shopping.google_product_category und mc-facebook.google_product_category |
| Versandgewicht | Shopify Variantengewicht |
| Farbe | Shopify Kategorie-/Produktattribute |
| Energieklasse | In Shopify vorhanden, aber nicht als Google-Energieattribut sichtbar |
| Energielabel | Shopify-Metafield/Datei, nicht als separates Feedattribut sichtbar |
| EU-Produktdatenblatt | Shopify-Metafield/Datei, nicht als separates Feedattribut sichtbar |
| condition | Nicht ausdrücklich übertragen |
| MPN | Nicht übertragen |
| shipping_label | Nicht übertragen |
| custom_label_0 bis custom_label_4 | Nicht übertragen |

## 4. Relevante, aktuell nicht übertragene Attribute

- condition
- mpn
- shipping_label
- custom_label_0
- custom_label_1
- custom_label_2
- custom_label_3
- custom_label_4
- energy_efficiency_class
- min_energy_efficiency_class
- max_energy_efficiency_class
- certification
- sale_price_effective_date
- material
- pattern
- size
- adult
- unit_pricing_measure
- unit_pricing_base_measure
- shipping_length
- shipping_width
- shipping_height
- ships_from_country
- product_highlight
- product_detail
- excluded_destination
- promotion_id

Nicht alle Attribute sind für Küchengeräte erforderlich. Versandlabels, Custom Labels, condition, Energie- und Zertifizierungsattribute sind jedoch für KB ELEMENTS besonders relevant.

## 5. Performance-Max-Prioritäten

### Hohe Priorität

- Google-spezifische Shopping-Titel
- Hierarchischer product_type
- shipping_label
- custom_label_0: Produktgruppe
- custom_label_1: Versandgruppe
- custom_label_2: Marge oder Preisklasse
- custom_label_3: Set-Größe
- custom_label_4: Premium oder Standard
- condition = new
- Energieeffizienz- und Zertifizierungsattribute
- Korrekte Merchant-Versandregeln

### Mittlere Priorität

- product_highlight
- product_detail
- sale_price_effective_date
- material
- pattern
- Weitere Kampagnensegmentierung

### Niedrige Priorität oder nicht relevant

- size
- adult
- Unit-Pricing
- Bekleidungsattribute
- Variantenattribute bei Produkten ohne echte Auswahlvarianten

## 6. Unterstützte Funktionen

| Funktion | Aktuell aktiv | Technisch möglich |
|---|---:|---:|
| Dediziertes shopping_title | Nein | Über Google-Attribut title möglich |
| shipping_label | Nein | Ja |
| custom_label_0–4 | Nein | Ja |
| Feed Rules / Attributregeln | Nein | Ja |
| Supplemental Feed | Nein | Ja |
| Merchant Feed Override | Kein stabiler Override eingerichtet | Über Supplemental Feed/Attributregeln möglich |
| Unabhängiger product_type | Nein | Ja |
| Unabhängiger Google-Titel | Nein | Ja |

Voraussetzung ist die Aktivierung des Merchant-Center-Add-ons „Advanced data source management“. Dieses Add-on ist im Konto verfügbar, aber derzeit nicht aktiviert.

## 7. Google-spezifische Shopping-Titel

Google verwendet das Attribut `title`. Ein separates Standardattribut namens `shopping_title` existiert nicht.

Unabhängige Google-Titel können über eine ergänzende Datenquelle gepflegt werden:

1. Supplemental Data Source mit Produkt-ID und title erstellen.
2. Mit der Shopify-Hauptquelle verbinden.
3. Attributregel so konfigurieren, dass der ergänzende Titel übernommen wird.

Damit bleiben Shopify-Produkttitel und SEO-Titel unverändert.

## 8. Unabhängiger product_type

Ein eigener Google-product_type kann über einen Supplemental Feed übergeben werden.

Beispiel:

`Küche > Herdsets > 2-teilig > Premium Plug & Play`

Diese Lösung beeinflusst weder Shopify-Collections noch interne Shopify-Prozesse.

## 9. Versandlabels

Google unterstützt `shipping_label` zur Zuordnung unterschiedlicher Versandkosten und Lieferzeiten.

Empfohlene Werte:

- paket
- spedition_backofen
- spedition_2er
- spedition_3er
- spedition_4er

Die Shopify Google-&-YouTube-Quelle überträgt aktuell kein shipping_label. Das Label sollte deshalb über eine ergänzende Datenquelle geliefert werden.

## 10. Attributregeln

Attributregeln sind technisch möglich, aber noch nicht aktiviert.

Mögliche Anwendungen:

- shipping_weight = 45 kg in shipping_label = spedition_2er umwandeln
- Produktgruppen anhand von product_type zuordnen
- Titel für Google optimieren
- condition = new ergänzen
- Fehlende Standardwerte setzen

Für Versand sollte langfristig ein ausdrücklich gepflegtes shipping_label verwendet werden. Eine alleinige Gewichtserkennung ist weniger robust.

## 11. Supplemental Feed

Ein Supplemental Feed ist technisch möglich, aktuell jedoch nicht eingerichtet.

Empfohlene Struktur:

| id | title | product_type | shipping_label | custom_label_0 | custom_label_1 | custom_label_2 | custom_label_3 | custom_label_4 | condition |
|---|---|---|---|---|---|---|---|---|---|

Mögliche Übertragungsarten:

- Google Sheets
- Datei
- API

Für den Einstieg wird ein kontrolliertes Google Sheet empfohlen. Langfristig sollte das ERP den Supplemental Feed automatisiert erzeugen.

## 12. Empfohlene Enterprise-Architektur

Empfehlung: **C – Shopify plus Supplemental Feed**

### Aufbau

- Shopify Google & YouTube App bleibt die primäre Produktquelle.
- Shopify liefert Preise, Bestände, GTIN, URLs und Bilder.
- Ein ergänzender ERP-Feed liefert ausschließlich Google-spezifische Attribute.
- Merchant-Attributregeln verbinden Haupt- und Zusatzquelle.
- Merchant-Versandrichtlinien verwenden shipping_label.

### Vorteile

- Keine Auswirkung auf sichtbare Shopify-Titel.
- Keine Theme-Änderungen.
- Keine doppelte primäre Produktquelle.
- Google-Titel und Kampagnenlabels zentral steuerbar.
- Eindeutige Versandgruppen.
- Skalierbar für alle 70 Produkte.
- Bessere Performance-Max-Segmentierung.

Ein eigener vollständiger Primärfeed ist nicht empfohlen, weil Shopify Preise, Bestand und Produktverfügbarkeit bereits zuverlässig synchronisiert.

## 13. Reihenfolge der nächsten Optimierungen

1. Advanced Data Source Management aktivieren.
2. Produkt-, SKU- und Merchant-ID-Mapping aller 70 Produkte erstellen.
3. Versandgruppen für alle Produkte festlegen.
4. Supplemental Feed zunächst als Google Sheet erstellen.
5. shipping_label für Paket, Backofen sowie 2er-, 3er- und 4er-Sets übertragen.
6. Merchant-Versandrichtlinien anhand der Labels korrigieren.
7. Versandkosten im Merchant-Versandrechner testen.
8. Google-spezifische Shopping-Titel ergänzen.
9. Hierarchischen product_type ergänzen.
10. Custom Labels für Performance Max aufbauen.
11. Energie- und Zertifizierungsattribute ergänzen.
12. Nach erfolgreichem Pilot auf automatisierte ERP-API-Synchronisierung umstellen.

## Abschlussbewertung

Die aktuelle Shopify-API-Quelle ist stabil und synchronisiert die grundlegenden Produktdaten zuverlässig. Für Google-spezifische Optimierungen ist sie allein jedoch zu eingeschränkt.

Die empfohlene langfristige Lösung ist:

**Shopify als primäre Produktquelle plus ERP-gesteuerter Supplemental Feed für Google-Titel, product_type, Versandlabels, Custom Labels, condition sowie Energie- und Zertifizierungsattribute.**

## Durchgeführte Änderungen

Keine. Die gesamte Prüfung war ausschließlich lesend.
