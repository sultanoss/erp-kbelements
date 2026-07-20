import type { InvWithItems } from "./invoice-pdf";

const SELLER_NAME = "KB ELEMENTS GmbH";
const SELLER_STREET = "Im Weidchen 21";
const SELLER_ZIP = "52353";
const SELLER_CITY = "Düren";
const SELLER_COUNTRY = "DE";
const SELLER_VAT_ID = "DE323000595";
const IBAN = "DE25395501101201385497";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmt(n: number): string {
  return round2(n).toFixed(2);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(d: Date | string): string {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function parseCountry(raw: string): string {
  const s = raw.trim();
  if (s.length === 2) return s.toUpperCase();
  const map: Record<string, string> = {
    germany: "DE", deutschland: "DE", netherlands: "NL", niederlande: "NL",
    austria: "AT", österreich: "AT", switzerland: "CH", schweiz: "CH",
    france: "FR", frankreich: "FR", belgium: "BE", belgien: "BE",
    poland: "PL", polen: "PL", italy: "IT", italien: "IT",
    spain: "ES", spanien: "ES",
  };
  return map[s.toLowerCase()] ?? "DE";
}

function cleanText(s: string): string {
  return s.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

export function generateZugferdXml(inv: InvWithItems): string {
  const dateStr = fmtDate(inv.date);
  const typeCode = inv.docType === "gutschrift" ? "381" : "380";
  const isCash = inv.paymentMethod === "bar";

  // Parse buyer address (format: "Straße\nPLZ Stadt\nDE")
  const addrLines = (inv.customerAddress ?? "").split("\n");
  const buyerStreet = (addrLines[0] ?? "").trim();
  const zipCity = (addrLines[1] ?? "").trim();
  const countryRaw = (addrLines[2] ?? "DE").trim();
  const zipMatch = zipCity.match(/^(\S+)\s+(.*)/);
  const buyerZip = zipMatch?.[1] ?? "";
  const buyerCity = (zipMatch?.[2] ?? zipCity).trim();
  const buyerCountry = parseCountry(countryRaw);

  // Amounts — unitPrice and shippingCost are BRUTTO (incl. VAT)
  const mwst = inv.mwstRate;
  const shipping = inv.shippingCost ?? 0;
  const shipMwst = inv.shippingMwst ?? 19;

  // Build line items (products)
  const lineItems: Array<{
    idx: number; name: string; qty: number; netUnit: number; lineNet: number; rate: number;
  }> = inv.items.map((it, i) => {
    const netUnit = mwst > 0 ? it.unitPrice / (1 + mwst / 100) : it.unitPrice;
    return {
      idx: i + 1,
      name: cleanText(it.description ?? "Artikel"),
      qty: it.quantity,
      netUnit: round2(netUnit),
      lineNet: round2(it.quantity * netUnit),
      rate: mwst,
    };
  });

  // Shipping as extra line item
  if (shipping > 0) {
    const netUnit = shipMwst > 0 ? shipping / (1 + shipMwst / 100) : shipping;
    lineItems.push({
      idx: lineItems.length + 1,
      name: "Versand / Transport",
      qty: 1,
      netUnit: round2(netUnit),
      lineNet: round2(netUnit),
      rate: shipMwst,
    });
  }

  // Totals
  const lineTotalAmount = round2(lineItems.reduce((s, l) => s + l.lineNet, 0));
  const taxBasisTotal = lineTotalAmount;
  const grossTotal = round2(
    inv.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0) + shipping
  );
  const taxTotal = round2(grossTotal - taxBasisTotal);

  // Tax groups (one entry per distinct rate)
  const taxMap = new Map<number, { basis: number; tax: number }>();
  for (const li of lineItems) {
    const g = taxMap.get(li.rate) ?? { basis: 0, tax: 0 };
    g.basis = round2(g.basis + li.lineNet);
    taxMap.set(li.rate, g);
  }
  for (const [rate, g] of taxMap) {
    g.tax = round2(g.basis * rate / 100);
  }

  // ─── Render XML sections ───

  const lineItemsXml = lineItems.map((li) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${li.idx}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${esc(li.name)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${fmt(li.netUnit)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${li.qty.toFixed(2)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${li.rate > 0 ? "S" : "Z"}</ram:CategoryCode>
          <ram:RateApplicablePercent>${li.rate.toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${fmt(li.lineNet)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`).join("");

  const taxSummaryXml = [...taxMap.entries()].map(([rate, g]) => `
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${fmt(g.tax)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${fmt(g.basis)}</ram:BasisAmount>
        <ram:CategoryCode>${rate > 0 ? "S" : "Z"}</ram:CategoryCode>
        <ram:RateApplicablePercent>${rate.toFixed(2)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`).join("");

  const paymentMeansXml = isCash
    ? `<ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>10</ram:TypeCode></ram:SpecifiedTradeSettlementPaymentMeans>`
    : `<ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${IBAN}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
      </ram:SpecifiedTradeSettlementPaymentMeans>`;

  const buyerAddrXml = (buyerStreet || buyerZip || buyerCity)
    ? `<ram:PostalTradeAddress>
          ${buyerStreet ? `<ram:LineOne>${esc(buyerStreet)}</ram:LineOne>` : ""}
          ${buyerZip ? `<ram:PostcodeCode>${esc(buyerZip)}</ram:PostcodeCode>` : ""}
          ${buyerCity ? `<ram:CityName>${esc(buyerCity)}</ram:CityName>` : ""}
          <ram:CountryID>${esc(buyerCountry)}</ram:CountryID>
        </ram:PostalTradeAddress>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:xs="http://www.w3.org/2001/XMLSchema"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">

  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:en16931</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <rsm:ExchangedDocument>
    <ram:ID>${esc(inv.number)}</ram:ID>
    <ram:TypeCode>${typeCode}</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${dateStr}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>

  <rsm:SupplyChainTradeTransaction>
    ${lineItemsXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${esc(SELLER_NAME)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${esc(SELLER_STREET)}</ram:LineOne>
          <ram:PostcodeCode>${esc(SELLER_ZIP)}</ram:PostcodeCode>
          <ram:CityName>${esc(SELLER_CITY)}</ram:CityName>
          <ram:CountryID>${SELLER_COUNTRY}</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${esc(SELLER_VAT_ID)}</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${esc(inv.customerName)}</ram:Name>
        ${buyerAddrXml}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>

    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${dateStr}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>

    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${esc(inv.number)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      ${paymentMeansXml}
      ${taxSummaryXml}
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>Zahlbar sofort ohne Abzug</ram:Description>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${fmt(lineTotalAmount)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${fmt(taxBasisTotal)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${fmt(taxTotal)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${fmt(grossTotal)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${fmt(grossTotal)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

export function generateZugferdXmp(): string {
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description
      xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/"
      xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#"
      xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#"
      rdf:about="">
      <pdfaExtension:schemas>
        <rdf:Bag>
          <rdf:li rdf:parseType="Resource">
            <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
            <pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
            <pdfaSchema:prefix>fx</pdfaSchema:prefix>
            <pdfaSchema:property>
              <rdf:Seq>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>DocumentFileName</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>name of the embedded XML invoice file</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>DocumentType</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>INVOICE</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>Version</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>The actual version of the Factur-X XML schema</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>ConformanceLevel</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>The conformance level of the Factur-X data</pdfaProperty:description>
                </rdf:li>
              </rdf:Seq>
            </pdfaSchema:property>
          </rdf:li>
        </rdf:Bag>
      </pdfaExtension:schemas>
    </rdf:Description>
    <rdf:Description
      xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#"
      rdf:about="">
      <fx:DocumentType>INVOICE</fx:DocumentType>
      <fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>
      <fx:Version>1.0</fx:Version>
      <fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}
