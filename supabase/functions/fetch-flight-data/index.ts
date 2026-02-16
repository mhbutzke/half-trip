import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Function-Version': '5',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { flight_number, date } = await req.json();

    // Normalize flight number - remove spaces and convert to uppercase
    const normalizedFlightNumber = flight_number?.replace(/\s/g, '').toUpperCase();

    if (!normalizedFlightNumber) {
      throw new Error('Flight number is required');
    }

    const apiKey = Deno.env.get('AVIATIONSTACK_API_KEY');
    if (!apiKey) {
      console.error('Missing AVIATIONSTACK_API_KEY');
      return new Response(JSON.stringify({ found: false, error: 'Server configuration error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Searching for flight ${normalizedFlightNumber} on ${date || 'today'}`);

    // Always use HTTPS for outbound requests (API key is in query string).
    const url = new URL('https://api.aviationstack.com/v1/flights');
    url.searchParams.append('access_key', apiKey);
    url.searchParams.append('flight_iata', normalizedFlightNumber);
    url.searchParams.append('limit', '1');

    if (date) {
      url.searchParams.append('flight_date', date);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(url.toString(), { signal: controller.signal });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('AviationStack API timeout (10s)');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`AviationStack API HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`API Error: ${data.error.info || data.error.message}`);
    }

    // Transform response to our standardized format
    // AviationStack structure: { pagination: {...}, data: [ { flight_date, flight_status, departure: {...}, arrival: {...}, airline: {...}, ... } ] }

    const flightData = data.data && data.data[0];

    if (!flightData) {
      return new Response(JSON.stringify({ found: false, message: 'Flight not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = {
      found: true,
      carrier: flightData.airline?.name,
      flight_number: flightData.flight?.iata,
      departure: {
        airport: flightData.departure?.airport,
        iata: flightData.departure?.iata,
        scheduled: flightData.departure?.scheduled,
        terminal: flightData.departure?.terminal,
        gate: flightData.departure?.gate,
      },
      arrival: {
        airport: flightData.arrival?.airport,
        iata: flightData.arrival?.iata,
        scheduled: flightData.arrival?.scheduled,
        terminal: flightData.arrival?.terminal,
        gate: flightData.arrival?.gate,
      },
      duration: flightData.flight?.duration, // sometimes null
      status: flightData.flight_status,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching flight data:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(JSON.stringify({ found: false, error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
