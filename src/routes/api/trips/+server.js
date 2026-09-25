const CALENDAR_URL = 'https://www.google.com/_/FlightsFrontendUi/data/travel.frontend.flights.FlightsFrontendService/GetCalendarPicker?hl=en-US&rt=c';
const DAY = 86_400_000;
const WINDOW_DAYS = 30;

export async function POST({ request, fetch }) {
  const { origins, destinations, firstDepartureDate, lastArrivalDate, minDuration, maxDuration, stops, carryOnBag } = await request.json();
  const start = Date.parse(firstDepartureDate);
  const end = Date.parse(lastArrivalDate);

  if (!Array.isArray(origins) || !Array.isArray(destinations) ||
      !origins.every(isAirport) || !destinations.every(isAirport) ||
      !Number.isFinite(start) || !Number.isFinite(end) || start > end ||
      !Number.isInteger(minDuration) || !Number.isInteger(maxDuration) ||
      minDuration < 1 || maxDuration < minDuration || maxDuration > 365 ||
      !Number.isInteger(stops) || stops < 0 || stops > 3) {
    return Response.json({ error: 'Invalid trip search' }, { status: 400 });
  }
  if (!origins.length || !destinations.length) return Response.json([]);

  try {
    const trips = new Map();
    const departures = new Map();
    const arrivals = new Map();
    const searches = [];

    for (const from of origins) {
      for (const to of destinations) {
        searches.push(loadCalendar(fetch, from, to, start, end, stops, carryOnBag, [minDuration, maxDuration]).then(entries => {
          for (const [departureDate, arrivalDate, price] of entries) {
            if (!arrivalDate || arrivalDate > lastArrivalDate) continue;
            const departure = { from, to, date: departureDate };
            const arrival = { from: to, to: from, date: arrivalDate };
            addTrip(trips, departure, arrival, price);
          }
        }));
        searches.push(loadCalendar(fetch, from, to, start, end, stops, carryOnBag).then(entries => addFlights(departures, entries, from, to)));
        searches.push(loadCalendar(fetch, to, from, start, end, stops, carryOnBag).then(entries => addFlights(arrivals, entries, to, from)));
      }
    }
    await Promise.all(searches);

    for (const [date, outbound] of departures) {
      for (let duration = minDuration; duration <= maxDuration; duration++) {
        const arrivalDate = new Date(Date.parse(date) + duration * DAY).toISOString().slice(0, 10);
        if (arrivalDate > lastArrivalDate) continue;
        for (const departure of outbound) {
          for (const arrival of arrivals.get(arrivalDate) || []) {
            addTrip(trips, departure, arrival, departure.price + arrival.price);
          }
        }
      }
    }

    return Response.json([...trips.values()].sort((a, b) => a.total - b.total).slice(0, 200));
  } catch (error) {
    console.error('Google Flights calendar request failed:', error);
    return Response.json({ error: 'Flight prices are temporarily unavailable' }, { status: 502 });
  }
}

function isAirport(value) {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
}

function addFlights(flights, entries, from, to) {
  for (const [date, , price] of entries) {
    const day = flights.get(date) || [];
    day.push({ from, to, date, price });
    flights.set(date, day);
  }
}

function addTrip(trips, departure, arrival, total) {
  const key = [departure.date, departure.from, departure.to, arrival.date, arrival.from, arrival.to].join('-');
  const duration = Math.round((Date.parse(arrival.date) - Date.parse(departure.date)) / DAY);
  if (!trips.has(key) || total < trips.get(key).total) {
    trips.set(key, { departure, arrival, duration, total });
  }
}

function leg(from, to, stops) {
  return [[[[from, 0]]], [[[to, 0]]], null, stops];
}

async function loadCalendar(fetch, from, to, start, end, stops, carryOnBag, durations) {
  const entries = [];
  for (let windowStart = start; windowStart <= end; windowStart += WINDOW_DAYS * DAY) {
    const windowEnd = Math.min(windowStart + (WINDOW_DAYS - 1) * DAY, end);
    const filters = [null, null, durations ? 1 : 2, null, [], 1, [1, 0, 0, 0], null, null, null,
      carryOnBag ? [1, 0] : null, null, null,
      durations ? [leg(from, to, stops), leg(to, from, stops)] : [leg(from, to, stops)],
      null, null, null, 1];
    const dates = [windowStart, windowEnd].map(date => new Date(date).toISOString().slice(0, 10));
    const query = [null, filters, dates];
    if (durations) query.push(null, durations);
    const body = new URLSearchParams({ 'f.req': JSON.stringify([null, JSON.stringify(query)]) });
    const response = await fetch(CALENDAR_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'X-Goog-BatchExecute-Bgr': '[]'
      },
      body
    });
    if (!response.ok) throw new Error(`Calendar HTTP ${response.status}`);
    const payload = parseGoogleResponse(await response.text());
    if (!Array.isArray(payload?.[1])) throw new Error('Unrecognized calendar response');
    for (const item of payload[1]) {
      const price = item?.[2]?.[0]?.[1];
      if (typeof price === 'number' && price > 0 && item[0] >= dates[0] && item[0] <= dates[1]) {
        entries.push([item[0], item[1], price]);
      }
    }
  }
  return entries;
}

function parseGoogleResponse(text) {
  const frame = text.split('\n').find(line => line.startsWith('[["wrb.fr"'));
  if (!frame) throw new Error('Missing Google response frame');
  const payload = JSON.parse(frame)[0][2];
  if (!payload) throw new Error('Google returned no calendar data');
  return JSON.parse(payload);
}
