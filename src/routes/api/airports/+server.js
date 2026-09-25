const AUTOCOMPLETE_URL = 'https://www.google.com/_/FlightsFrontendUi/data/batchexecute';

export async function GET({ fetch, url }) {
  const query = url.searchParams.get('query')?.trim();
  if (!query) return Response.json({});
  if (query.length > 100) return Response.json({ error: 'Search is too long' }, { status: 400 });

  try {
    const body = new URLSearchParams({
      'f.req': JSON.stringify([[['H028ib', JSON.stringify([query, [1, 2, 3, 5, 4], null, [1, 1, 1], 1]), null, 'generic']]])
    });
    const response = await fetch(AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body
    });
    if (!response.ok) throw new Error(`Autocomplete HTTP ${response.status}`);
    const frame = (await response.text()).split('\n').find(line => line.startsWith('[["wrb.fr"'));
    if (!frame) throw new Error('Missing Google response frame');
    const data = JSON.parse(JSON.parse(frame)[0][2])?.[0];
    if (!Array.isArray(data)) throw new Error('Unrecognized autocomplete response');

    const airports = {};
    const addAirport = item => {
      const airport = item?.[0];
      if (airport?.[0] === 1 && typeof airport[5] === 'string' && typeof airport[1] === 'string') {
        airports[airport[5]] = airport[1];
      }
    };
    for (const item of data) {
      addAirport(item);
      if (item?.[0]?.[0] === 3 && Array.isArray(item[1])) {
        for (const airport of item[1]) addAirport(airport);
      }
    }
    return Response.json(airports);
  } catch (error) {
    console.error('Google Flights autocomplete request failed:', error);
    return Response.json({ error: 'Airport search is temporarily unavailable' }, { status: 502 });
  }
}
