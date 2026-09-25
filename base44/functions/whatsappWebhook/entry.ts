import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { secrets, waitUntil } from 'base44:runtime';

// WhatsApp Business Cloud API webhook endpoint.
// GET  — Meta verification (hub.mode=subscribe + hub.verify_token → hub.challenge)
// POST — Inbound messages from WhatsApp; responds 200 immediately, saves lead async.
Deno.serve(async (req) => {
  try {
    // ── GET: Webhook verification ───────────────────────────
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      if (mode === 'subscribe' && token && token === secrets.get('WHATSAPP_VERIFY_TOKEN')) {
        return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
      }
      return new Response('Forbidden', { status: 403 });
    }

    // ── POST: Inbound message ──────────────────────────────
    if (req.method === 'POST') {
      const base44 = createClientFromRequest(req);
      const body = await req.json();

      // Respond 200 immediately (Meta requires fast response), process async
      waitUntil(processWhatsAppMessage(base44, body));

      return Response.json({ status: 'received' }, { status: 200 });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    console.error('[whatsappWebhook]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});

// Extract sender phone + text from the WhatsApp Cloud API payload and save to WhatsAppLead.
async function processWhatsAppMessage(base44, body) {
  try {
    const entries = body?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const messages = change?.value?.messages || [];
        for (const msg of messages) {
          const from = msg?.from;
          const textBody = msg?.text?.body;
          if (from && textBody) {
            await base44.asServiceRole.entities.WhatsAppLead.create({
              phone: from,
              message: textBody,
            });
            console.log(`[whatsappWebhook] Lead salvo — de ${from}: ${textBody}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('[whatsappWebhook] processMessage', error.message);
  }
}