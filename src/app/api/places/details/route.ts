import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/utils/rate-limit';

// 30 requests per minute per user
const RATE_LIMIT = { limit: 30, windowSeconds: 60 } as const;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const rl = rateLimit(`places-details:${user.id}`, RATE_LIMIT);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em breve.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const placeId = request.nextUrl.searchParams.get('place_id');

  if (!placeId) {
    return NextResponse.json({ error: 'place_id é obrigatório' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check cache first
  const { data: cached } = await admin
    .from('place_details_cache')
    .select('*')
    .eq('place_id', placeId)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (cached) {
    return NextResponse.json(cached);
  }

  // Fetch from Google Places API (New)
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Chave da API do Google Places não configurada' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'displayName,formattedAddress,rating,userRatingCount,websiteUri,nationalPhoneNumber,regularOpeningHours,photos,priceLevel,types',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Places API error:', errorText);
      return NextResponse.json(
        { error: 'Falha ao buscar detalhes do local' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform to cache format
    const priceLevelMap: Record<string, number> = {
      PRICE_LEVEL_FREE: 0,
      PRICE_LEVEL_INEXPENSIVE: 1,
      PRICE_LEVEL_MODERATE: 2,
      PRICE_LEVEL_EXPENSIVE: 3,
      PRICE_LEVEL_VERY_EXPENSIVE: 4,
    };

    const cacheEntry = {
      place_id: placeId,
      name: data.displayName?.text ?? null,
      formatted_address: data.formattedAddress ?? null,
      rating: data.rating ?? null,
      user_ratings_total: data.userRatingCount ?? null,
      website: data.websiteUri ?? null,
      formatted_phone_number: data.nationalPhoneNumber ?? null,
      opening_hours: data.regularOpeningHours?.weekdayDescriptions
        ? { weekday_text: data.regularOpeningHours.weekdayDescriptions }
        : null,
      photo_references: data.photos
        ? data.photos.slice(0, 3).map((p: { name: string }) => p.name)
        : [],
      price_level: data.priceLevel ? (priceLevelMap[data.priceLevel] ?? null) : null,
      types: data.types ?? null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Upsert into cache
    await admin.from('place_details_cache').upsert(cacheEntry, { onConflict: 'place_id' });

    return NextResponse.json(cacheEntry);
  } catch (error) {
    console.error('Error fetching place details:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar detalhes do local' },
      { status: 500 }
    );
  }
}
