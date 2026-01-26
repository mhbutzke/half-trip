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

    // Construct URL for AviationStack
    // Note: Free tier might not support historical data far back or future data too far ahead properly without specific addon,
    // but usually works for "active" flights.
    // For specific date, AviationStack uses 'flight_date' or 'flight_status'.
    // If date is provided, we try to filter.

    // Example URL: http://api.aviationstack.com/v1/flights?access_key=KEY&flight_iata=AA100
    const url = new URL('http://api.aviationstack.com/v1/flights');
    url.searchParams.append('access_key', apiKey);
    url.searchParams.append('flight_iata', normalizedFlightNumber); // Assuming IATA code like 'AA100'
    // limit to 1 result for simplicity in this demo, usually we want the most relevant
    url.searchParams.append('limit', '1');

    if (date) {
      // aviationstack expects YYYY-MM-DD? No, it often just returns recent.
      // We might not be able to strict filter on free plan easily without checking docs on 'flight_date'.
      // Let's not strict filter in API call yet to avoid empty results if API is picky,
      // we can filter in memory or just return what we find.
    }

    const response = await fetch(url.toString());
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
