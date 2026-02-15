import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const reference = request.nextUrl.searchParams.get('reference');
  const maxwidth = request.nextUrl.searchParams.get('maxwidth') ?? '400';

  if (!reference) {
    return NextResponse.json({ error: 'reference é obrigatório' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Chave da API do Google Places não configurada' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/${reference}/media?maxWidthPx=${maxwidth}&key=${apiKey}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Falha ao buscar foto do local' },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Error fetching place photo:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar foto do local' }, { status: 500 });
  }
}
