# KB ELEMENTS – Shopify QA-Berichte vom 02.07.2026

## Rahmen

- Shop: https://kbelements-shop.de
- Bearbeitetes Theme: `Kopie von FinalVersion-3`
- Theme-ID: `198612058376`
- Live-Theme: nicht verändert
- Theme `FinalVersion-3`: nicht verändert
- Veröffentlichung: keine

## Gesamtstatus

- Aktive Produkte geprüft: 110
- Produkte mit Bewertungen: 2
- Aktuelle Product-/ProductGroup-JSON-LD-Dopplungen: 2
- Produkte ohne Bewertungen mit Dopplung: keine gefunden
- Neue JSON- oder JavaScript-Fehler: keine festgestellt

## 1. Root-Cause-Analyse der doppelten Product-JSON-LD-Daten

### Shopify-Ausgabe

- Datei: `sections/product-information.liquid`
- Ausgabe: Shopify `structured_data`
- Typ: abhängig vom Produkt `Product` oder `ProductGroup`
- Bewertung: technisch vollständige primäre Shopify-Ausgabe
- Entscheidung: beibehalten

### Eigener KB-JSON-LD-Block

- Datei: `sections/kb-jsonld.liquid`
- Bisherige Einbindung: Abschnitt `kb_jsonld` in `templates/product.json`
- Problem: zusätzlicher Product-JSON-LD-Block und dadurch Dopplung
- Entscheidung: nur die Einbindung im Produkt-Template deaktivieren
- Die Datei `sections/kb-jsonld.liquid` wurde nicht gelöscht.

### Zusätzlicher Bewertungsblock

- Datei: `sections/kb-product-enhancements.liquid`
- Betroffener Bereich: ehemaliger JSON-LD-Block in Zeilen 1–21
- Ausgabe: unvollständiger Product-/AggregateRating-Block
- Problem: weitere mögliche strukturierte Daten-Dopplung
- Entscheidung: ausschließlich diesen JSON-LD-Block deaktivieren
- Sichtbare Bewertungen, Badges und Widgets blieben erhalten.

### Judge.me

- Ausgabe: Script mit Klasse `jdgm-aggregate-rating-jld`
- Verhalten: wird aktuell bei Produkten mit Bewertungen ausgegeben
- Problem: erzeugt zusätzlich zur Shopify-Ausgabe einen weiteren Product-Block
- Status: weiterhin aktiv und noch nicht vollständig deaktiviert

## 2. Heute umgesetzte Theme-Anpassungen

### Datei `templates/product.json`

- Abschnitt `kb_jsonld` entfernt.
- `kb_jsonld` aus der `order` entfernt.
- Keine weiteren Abschnitte verändert.
- `sections/kb-jsonld.liquid` nicht gelöscht.
- `sections/product-information.liquid` unverändert gelassen.
- Shopify `structured_data` bleibt aktiv.

### Datei `sections/kb-product-enhancements.liquid`

- Nur den zusätzlichen unvollständigen Product-/AggregateRating-JSON-LD-Block deaktiviert.
- Sichtbare Bewertungsbereiche nicht entfernt.
- Judge.me-Badges und Bewertungswidgets nicht entfernt.
- Keine Design-, CSS- oder sonstigen Produktseitenfunktionen geändert.

## 3. Prüfung nach dem Judge.me-Deaktivierungsversuch

| Produkt | Handle | Bewertungen | Judge.me JSON-LD | Theme-JSON-LD | Dopplung | Bewertungswidget | Fehler |
|---|---|---:|---|---|---|---|---|
| ELK156S60B | `kb-elements-dunstabzugshaube-60-cm` | 12 | vorhanden | Product | ja, 2 × Product | sichtbar | keine |
| ELK75DV1 | `kb-elements-einbaubackofen-60-cm-air-fry-full-touch-display-aqua-clean-15-funktionen-a` | 1 | vorhanden | ProductGroup | ja, ProductGroup + Product | sichtbar | keine |
| ELK60PB1, ohne Bewertungen | `kb-elements-induktionskochfeld-60-cm-4-zonen-flexzone-3500-w-touch-control-schuko-stecker-schwarz` | 0 | nicht vorhanden | Product | nein | Widget vorhanden, Anzeige „Keine Bewertungen“ | keine |

### Ergebnis

Die Deaktivierung in Judge.me hat bei den Produkten mit Bewertungen noch nicht gegriffen. Das Script mit der Klasse `jdgm-aggregate-rating-jld` wird bei ELK156S60B und ELK75DV1 weiterhin ausgegeben.

Die sichtbaren Bewertungen funktionieren weiterhin. Die geprüften JSON-LD-Scripte sind syntaktisch gültig. Es wurden keine neuen JavaScript-Fehler festgestellt.

## 4. Katalogweite Prüfung

Alle 110 aktiven Produkte wurden katalogweit erfasst und ihre Bewertungsstände geprüft.

| Produkt oder Gruppe | Bewertungen | Judge.me JSON-LD | Theme-JSON-LD | Dopplung |
|---|---:|---|---|---|
| ELK156S60B / `kb-elements-dunstabzugshaube-60-cm` | 12 | ja | ja | ja |
| ELK75DV1 / `kb-elements-einbaubackofen-60-cm-air-fry-full-touch-display-aqua-clean-15-funktionen-a` | 1 | ja | ja | ja |
| Übrige 108 aktive Produkte | 0 | nein | ja | nein |

### Klares Gesamtergebnis

- Produkte mit Bewertungen, aber ohne Dopplung: keine
- Produkte ohne Bewertungen mit Dopplung: keine gefunden
- Aktuell betroffen sind nur ELK156S60B und ELK75DV1.

## 5. Technische Qualitätsprüfung

| Prüfpunkt | Ergebnis |
|---|---|
| JSON-LD syntaktisch parsebar | ja, keine Parse-Fehler auf den geprüften Seiten |
| Shopify Product/ProductGroup aktiv | ja |
| Eigener `kb-jsonld`-Product-Block | nicht mehr über das Produkt-Template eingebunden |
| Zusätzlicher Block aus `kb-product-enhancements` | deaktiviert |
| Sichtbare Bewertungsbadges und Widgets | weiterhin vorhanden |
| Neue JavaScript-Fehler | keine festgestellt |
| Live-Theme verändert | nein |
| Theme veröffentlicht | nein |

## 6. Offener Punkt

Judge.me erzeugt auf den beiden bewerteten Produkten weiterhin zusätzliches Product-/AggregateRating-JSON-LD.

Empfohlene weitere Prüfung:

1. Judge.me öffnen.
2. Zu `Settings → Google and SEO → SEO Rich Snippets` wechseln.
3. Prüfen, ob `Add JSON-LD snippets (Default)` wirklich deaktiviert und gespeichert ist.
4. Eine mögliche Übernahme- oder Cache-Zeit abwarten.
5. Anschließend ELK156S60B und ELK75DV1 erneut im Preview von `Kopie von FinalVersion-3` prüfen.

Erfolgskriterium:

- Kein Script mit Klasse `jdgm-aggregate-rating-jld` mehr vorhanden.
- Pro Produkt bleibt nur noch der Shopify-Product- beziehungsweise ProductGroup-Block übrig.
- Sichtbare Judge.me-Bewertungen bleiben unverändert.

## 7. Geänderte Dateien

| Datei | Änderung |
|---|---|
| `templates/product.json` | Abschnitt `kb_jsonld` und Eintrag in `order` entfernt |
| `sections/kb-product-enhancements.liquid` | zusätzlichen JSON-LD-Bewertungsblock deaktiviert; sichtbare Bewertungen erhalten |

Nicht gelöscht oder verändert:

- `sections/kb-jsonld.liquid`
- `sections/product-information.liquid`

## 8. Google Merchant Center – aktueller Prüfbericht

### Konto und Datenquelle

- Merchant-Center-Konto: `kbelements-shop`
- Merchant-Center-ID: `5816291202`
- Erfasste Produkte im Merchant Center: 65
- Datenquelle: `Shopify App API`
- Die in der Produktliste sichtbaren Produkte sind auf Lager gemeldet.
- Sichtbare letzte Produktaktualisierungen: 01.07.2026

### Produktstatus

| Status | Anzahl | Bewertung |
|---|---:|---|
| Genehmigt | 65 | vollständig freigegeben |
| Eingeschränkt | 0 | keine Einschränkungen sichtbar |
| Nicht genehmigt | 0 | keine Ablehnungen sichtbar |
| In Prüfung | 0 | keine Produkte warten auf Prüfung |

Ergebnis: Alle derzeit im Merchant Center vorhandenen 65 Produkte sind genehmigt. Im aktuellen Übersichtsstatus sind keine Richtlinienablehnungen oder eingeschränkten Produkte sichtbar.

### Leistung und Werbung

- Gesamtklicks in den letzten 28 Tagen: 8
- Vergleichszeitraum: zuvor 0 Klicks
- Aktive beziehungsweise ausgewertete Werbekampagnen: keine Leistung sichtbar
- Merchant Center zeigt weiterhin die Möglichkeit `Start advertising` an.
- Für Performance Max ist der genehmigte Produktbestand eine gute technische Grundlage. Eine laufende Performance-Max-Kampagne wurde im Merchant Center nicht festgestellt.

### Produktfeed

| Prüfpunkt | Aktueller Zustand |
|---|---|
| Datenquelle | Shopify App API |
| Produktanzahl | 65 |
| Verfügbarkeit | sichtbare Produkte als `In stock` gemeldet |
| Preise | in der Produktliste vorhanden |
| Angebotspreise | bei einzelnen Produkten vorhanden |
| Produktstatus | alle 65 genehmigt |
| Klickpotenzial | bei sichtbaren Produkten überwiegend `Available soon` |

### Free Listings und Google Shopping

- Die Produkte sind grundsätzlich für Google freigegeben, da alle 65 Angebote genehmigt sind.
- Der aktuelle Überblick wurde mit `All marketing methods` angezeigt.
- Eine getrennte Detailbestätigung nur für kostenlose Produkteinträge konnte in der Marketingmethoden-Ansicht nicht abschließend ausgelesen werden.
- Eine aktive Shopping- oder Performance-Max-Werbekampagne wurde nicht festgestellt.

### Store Quality und Hinweise

- Merchant Center meldet: `Information about your store quality is not currently available`.
- Das bedeutet nicht automatisch einen Fehler; Google stellt derzeit noch keine Store-Quality-Auswertung bereit.
- Die Benachrichtigungsseite blieb während der Prüfung im Ladezustand. Deshalb konnten zusätzliche allgemeine Aufgabenhinweise dort nicht abschließend bewertet werden.
- Der maßgebliche Produktstatus ist dennoch eindeutig: 65 genehmigt, 0 eingeschränkt, 0 abgelehnt, 0 in Prüfung.

### Noch nicht abschließend auf Feldebene geprüft

Die folgenden Attribute wurden in dieser Statusprüfung nicht für jedes einzelne der 65 Angebote geöffnet und deshalb nicht als vollständig bestätigt markiert:

- Google Product Category
- `product_type`
- GTIN
- MPN
- Brand
- Condition
- Energiekennzeichnung
- Produktdatenblatt
- Versand- und Rückgaberichtlinien auf Angebotsebene

Diese Punkte benötigen bei Bedarf einen separaten Produktdaten-/Feed-Audit. Es wurden keine Merchant-Center-Einstellungen verändert.

### Merchant-Center-Gesamtergebnis

- Status: sehr gut
- Alle 65 vorhandenen Produkte sind genehmigt.
- Keine eingeschränkten oder abgelehnten Produkte sichtbar.
- Keine Produkte in Prüfung.
- Der Feed wird über die Shopify App API aktualisiert.
- 8 organische beziehungsweise Google-Flächen-Klicks in den letzten 28 Tagen sichtbar.
- Offene Optimierung: einzelne Feedattribute und Marketingmethoden separat auf Produktebene prüfen.

## 9. Sicherheitsstatus

Alle Theme-Arbeiten wurden ausschließlich im Entwurf `Kopie von FinalVersion-3` durchgeführt. Das Live-Theme und das Theme `FinalVersion-3` wurden nicht verändert. Es wurde nichts veröffentlicht.
