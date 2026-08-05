import { NextRequest, NextResponse } from "next/server";
import { DHLShippingProvider } from "@/lib/shipping/dhl";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("s");
  if (secret !== "kb-tmp-9x2z") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const dhl = new DHLShippingProvider();
    const result = await dhl.createShipment({
      orderId: "cms7rl94f000akv05cy0sep8q",
      orderNumber: "cbn4ytmr8z",
      carrier: "DHL",
      weight: 2,
      consignee: {
        name: "Sabine Weidl",
        street: "Meisenweg 7",
        zip: "57555",
        city: "Mudersbach",
        country: "DEU",
      },
      items: [{ internalSku: "Filter-ELK156S", quantity: 2, warehouse: "neuware" }],
    });

    return NextResponse.json({
      trackingNumber: result.trackingNumber,
      returnTrackingNumber: result.returnTrackingNumber,
      labelUrl: result.labelUrl,
      returnLabelUrl: result.returnLabelUrl,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
