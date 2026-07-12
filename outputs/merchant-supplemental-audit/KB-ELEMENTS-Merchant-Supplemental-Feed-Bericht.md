# KB ELEMENTS – Phase 1 Supplemental-Feed-Vorbereitung

**Stand:** 2. Juli 2026  
**Merchant-Konto:** 5816291202  
**Feed-Quelle:** Shopify App API / Merchant API  
**Source-ID:** 10679611358  
**Zielland:** Deutschland  
**Feed-Label:** EUR_102949617928  
**Änderungen durchgeführt:** Keine

## Umfang

Alle 70 Produkte, die in Shopify für den Kanal „Google & YouTube“ veröffentlicht sind, wurden ausgelesen. Die Zahl stimmt exakt mit den 70 Produkten der Merchant-Datenquelle „Shopify App API“ überein.

Für jedes Produkt wurden SKU, Titel, Shopify- und Merchant-IDs, Produkttyp, Google Product Category, Brand, GTIN, Versandgewicht, Status, Zielland und Feed-Quelle erfasst. Die vollständige Produkttabelle befindet sich in der begleitenden Excel-Datei.

## Vollständigkeitsprüfung

| Prüfung | Ergebnis |
|---|---:|
| Merchant-Produkte | 70 |
| Shopify-Produkte in Google-&-YouTube-Publikation | 70 |
| Eindeutige Shopify Product IDs | 70 |
| Eindeutige Variant IDs | 70 |
| Doppelte Variant IDs | 0 |
| Doppelte Merchant Item IDs | 0 |
| Doppelte Merchant Offer IDs | 0 |
| Doppelte SKUs | 0 |
| Fehlende SKUs | 0 |
| Fehlende GTIN | 0 |
| Fehlende Versandgewichte | 0 |
| Fehlende Merchant Item IDs | 0 |

## Empfohlener Schlüssel

Für den Supplemental Feed sollte das Google-Attribut **id** verwendet werden.

Der Wert muss der Merchant Offer ID entsprechen:

`shopify_ZZ_{Shopify Product ID}_{Shopify Variant ID}`

Beispiel: `shopify_ZZ_12043298898184_58070011347208`

### Begründung

- Dieser Wert entspricht exakt der im Merchant Center sichtbaren Product ID beziehungsweise Offer ID.
- Er verbindet Shopify Product ID und Variant ID eindeutig.
- Alle 70 Offer IDs sind vorhanden und eindeutig.
- Er ist der direkte Standardschlüssel für die Verbindung eines Supplemental Feeds mit der bestehenden primären Datenquelle.
- Die Variant ID allein ist nicht der vollständige Google-Angebotsschlüssel.
- SKU ist eindeutig, würde aber benutzerdefiniertes Matching erfordern.
- GTIN ist kein geeigneter technischer Primärschlüssel für die Feed-Verknüpfung.
- Merchant Item ID entspricht hier der Shopify Variant GID und ist nicht der sichtbare Google-Offer-Schlüssel.

## Antworten

### 1. Welcher Schlüssel soll verwendet werden?

`id` mit dem Wert der Merchant Offer ID.

### 2. Ist die Datenbasis vollständig?

Ja. Alle 70 Produkte sind vorhanden. Es bestehen keine doppelten IDs oder SKUs und keine fehlenden GTIN, Versandgewichte oder Merchant Item IDs.

### 3. Kann der Supplemental Feed aufgebaut werden?

Ja. Die technische Datenbasis ist vollständig und eindeutig. Als nächster Schritt können `shipping_label`, `title`, `product_type`, `condition` und `custom_label_0` bis `custom_label_4` vorbereitet werden.

## Sicherheitsstatus

Es wurden keine Shopify-Produkte, Metafields, Merchant-Einstellungen, Feed-Regeln, Theme-Dateien oder Google-Daten verändert.
