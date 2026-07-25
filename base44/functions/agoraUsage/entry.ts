import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { from_date, to_date, force_refresh } = body;

    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const fmt = (d) => d.toISOString().split('T')[0];

    const fromDate = from_date || fmt(firstOfMonth);
    const toDate = to_date || fmt(today);
    const cacheKey = `${fromDate}_${toDate}`;

    // Check cache (30 min TTL) unless force_refresh
    if (!force_refresh) {
      const cached = await base44.asServiceRole.entities.AgoraUsageCache.filter({ cache_key: cacheKey }, '-fetched_at', 1);
      if (cached.length > 0) {
        const c = cached[0];
        const ageMs = Date.now() - new Date(c.fetched_at).getTime();
        if (ageMs < 30 * 60 * 1000) {
          return Response.json({
            usages: c.usages,
            total_audio_minutes: c.total_audio_minutes,
            total_video_minutes: c.total_video_minutes,
            fetched_at: c.fetched_at,
            from_cache: true,
          });
        }
      }
    }

    // Build Agora API request
    const customerId = Deno.env.get('AGORA_CUSTOMER_ID');
    const customerSecret = Deno.env.get('AGORA_CUSTOMER_SECRET');
    const appId = Deno.env.get('VITE_AGORA_APP_ID');

    if (!customerId || !customerSecret || !appId) {
      return Response.json({ error: 'Agora credentials not configured' }, { status: 500 });
    }

    const credentials = btoa(`${customerId}:${customerSecret}`);
    const url = `https://api.agora.io/dev/v3/usage?project_id=${appId}&from_date=${fromDate}&to_date=${toDate}&business=default`;

    const agoraRes = await fetch(url, {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (agoraRes.status === 401) {
      return Response.json({ error: 'Credenciais Agora inválidas (401). Verifique o Customer ID e Secret.' }, { status: 401 });
    }
    if (agoraRes.status === 429) {
      return Response.json({ error: 'Rate limit da API Agora excedido (429). Aguarde alguns minutos.' }, { status: 429 });
    }
    if (!agoraRes.ok) {
      const txt = await agoraRes.text();
      return Response.json({ error: `Erro da API Agora: ${agoraRes.status} — ${txt}` }, { status: 502 });
    }

    const data = await agoraRes.json();
    const usages = (data.usages || []).map((day) => ({
      date: day.date,
      audio_minutes: Math.round((day.durationAudioAll || 0) / 60),
      video_hd_minutes: Math.round((day.durationVideoHd || 0) / 60),
      video_1080p_minutes: Math.round((day.durationVideo1080P || 0) / 60),
      video_2k_minutes: Math.round((day.durationVideo2K || 0) / 60),
      video_4k_minutes: Math.round((day.durationVideo4K || 0) / 60),
      video_hdp_minutes: Math.round((day.durationVideoHdp || 0) / 60),
    }));

    const totalAudio = usages.reduce((s, d) => s + d.audio_minutes, 0);
    const totalVideo = usages.reduce((s, d) =>
      s + d.video_hd_minutes + d.video_1080p_minutes + d.video_2k_minutes + d.video_4k_minutes + d.video_hdp_minutes, 0
    );
    const fetchedAt = new Date().toISOString();

    // Upsert cache
    try {
      const existing = await base44.asServiceRole.entities.AgoraUsageCache.filter({ cache_key: cacheKey }, '-fetched_at', 1);
      if (existing.length > 0) {
        await base44.asServiceRole.entities.AgoraUsageCache.update(existing[0].id, {
          usages, total_audio_minutes: totalAudio, total_video_minutes: totalVideo, fetched_at: fetchedAt,
        });
      } else {
        await base44.asServiceRole.entities.AgoraUsageCache.create({
          cache_key: cacheKey, from_date: fromDate, to_date: toDate,
          usages, total_audio_minutes: totalAudio, total_video_minutes: totalVideo, fetched_at: fetchedAt,
        });
      }
    } catch (_) { /* cache write failure is non-fatal */ }

    return Response.json({
      usages,
      total_audio_minutes: totalAudio,
      total_video_minutes: totalVideo,
      fetched_at: fetchedAt,
      from_cache: false,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});