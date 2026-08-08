import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";
import { requireOtp } from "../../shared/requireOtp.js";
import { CATALOG } from "../../shared/paymentCatalog.js";

// Admin-only — cria (uma única vez) os Products e Prices reais na Stripe,
// espelhando o catálogo do paymentCatalog.js. É idempotente: se um product
// com o mesmo external_reference já existir (via metadata), reutiliza-o e
// busca um price ativo existente antes de criar um novo.
//
// Retorna o mapeamento external_reference → { product_id, price_id } para
// que o admin cole no base44/shared/stripeCatalog.js.
//
// Planos (plan:*)  → recurring monthly (subscription)
// Pacotes (pack:*) → one-time (payment)
// "pack:teste" é ignorado (item de teste, não faz parte do catálogo de produção).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const secretKey = secrets.get("STRIPE_SECRET_KEY");
    if (!secretKey) return Response.json({ error: "STRIPE_SECRET_KEY não configurado" }, { status: 500 });

    const auth = `Bearer ${secretKey}`;
    const formHeaders = { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" };

    const result: Record<string, { product_id: string; price_id: string; mode: string }> = {};

    for (const [externalRef, item] of Object.entries(CATALOG)) {
      // Ignora o item de teste — não pertence ao catálogo de produção.
      if (externalRef === "pack:teste") continue;

      const isPlan = externalRef.startsWith("plan:");
      const mode = isPlan ? "subscription" : "payment";

      // 1) Busca product existente pelo metadata.external_reference (idempotência).
      let productId = "";
      let existingPriceId = "";

      const searchRes = await fetch(
        `https://api.stripe.com/v1/products/search?query=${encodeURIComponent(`metadata['external_reference']:'${externalRef}'`)}`,
        { headers: { Authorization: auth } }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.data && searchData.data.length > 0) {
          productId = searchData.data[0].id;
          // Busca um price ativo neste product.
          const pricesRes = await fetch(
            `https://api.stripe.com/v1/prices?product=${productId}&active=true&limit=1`,
            { headers: { Authorization: auth } }
          );
          if (pricesRes.ok) {
            const pricesData = await pricesRes.json();
            if (pricesData.data && pricesData.data.length > 0) {
              existingPriceId = pricesData.data[0].id;
            }
          }
        }
      }

      // 2) Cria o product se não existir.
      if (!productId) {
        const productBody = new URLSearchParams({
          name: item.title,
          metadata_external_reference: externalRef,
        });
        // Stripe metadata via form: "metadata[external_reference]=value"
        const productRes = await fetch("https://api.stripe.com/v1/products", {
          method: "POST",
          headers: formHeaders,
          body: `name=${encodeURIComponent(item.title)}&metadata[external_reference]=${encodeURIComponent(externalRef)}`,
        });
        const productData = await productRes.json();
        if (!productRes.ok) {
          console.error(`[stripeCreateCatalog] product error for ${externalRef}:`, JSON.stringify(productData));
          return Response.json({ error: productData.error?.message || `Falha ao criar product ${externalRef}` }, { status: 400 });
        }
        productId = productData.id;
      }

      // 3) Cria o price se não existir (ou reutiliza o existente).
      if (existingPriceId) {
        result[externalRef] = { product_id: productId, price_id: existingPriceId, mode };
        continue;
      }

      const unitAmount = Math.round(item.price * 100);
      let priceBody: string;
      if (isPlan) {
        priceBody = `currency=brl&product=${productId}&unit_amount=${unitAmount}&recurring[interval]=month&recurring[interval_count]=1`;
      } else {
        priceBody = `currency=brl&product=${productId}&unit_amount=${unitAmount}`;
      }

      const priceRes = await fetch("https://api.stripe.com/v1/prices", {
        method: "POST",
        headers: formHeaders,
        body: priceBody,
      });
      const priceData = await priceRes.json();
      if (!priceRes.ok) {
        console.error(`[stripeCreateCatalog] price error for ${externalRef}:`, JSON.stringify(priceData));
        return Response.json({ error: priceData.error?.message || `Falha ao criar price ${externalRef}` }, { status: 400 });
      }

      result[externalRef] = { product_id: productId, price_id: priceData.id, mode };
    }

    return Response.json({
      success: true,
      message: "Catálogo criado/verificado na Stripe. Cole o mapeamento abaixo em base44/shared/stripeCatalog.js",
      catalog: result,
    });
  } catch (error) {
    console.error("[stripeCreateCatalog] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}