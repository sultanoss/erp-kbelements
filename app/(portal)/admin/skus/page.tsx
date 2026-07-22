import { createClient } from "@/lib/supabase/server";
import SkuAdminClient from "./SkuAdminClient";

export default async function SkuAdminPage() {
  const supabase = await createClient();
  const { data: skus } = await supabase
    .from("skus")
    .select("*")
    .order("sku");

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">SKU-Verwaltung</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          SKUs für die Retouren-Auswahl verwalten
        </p>
      </div>
      <SkuAdminClient initialSkus={skus ?? []} />
    </div>
  );
}
