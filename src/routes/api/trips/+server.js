export async function POST({ request }) {
  const { origins, destinations, firstDepartureDate, lastArrivalDate, minDuration, maxDuration, stops, carryOnBag } = await request.json();
  const promises = [];
  let trips = {}, departures = {}, arrivals = {};
  
  for (const from of origins) {
    for (const to of destinations) {
      promises.push(fetchTrips(from, to, firstDepartureDate, lastArrivalDate, carryOnBag, stops, minDuration, maxDuration).then(t => trips = { ...trips, ...t }));
      promises.push(fetchPrices(from, to, firstDepartureDate, lastArrivalDate, carryOnBag, stops).then(flights => {
        for (const date in flights) {
          departures[date] = [...(departures[date] || []), flights[date]];
        }
      }));
      promises.push(fetchPrices(to, from, firstDepartureDate, lastArrivalDate, carryOnBag, stops).then(flights => {
        for (const date in flights) {
          arrivals[date] = [...(arrivals[date] || []), flights[date]];
        }
      }));
    }
  }

  await Promise.all(promises);

  for (let d = minDuration; d <= maxDuration; d++) {
    for (const date in departures) {
      const arrivalDate = new Date(date);
      arrivalDate.setDate(arrivalDate.getDate() + d);
      const arrivalDateString = arrivalDate.toISOString().split('T')[0];
      if (arrivals[arrivalDateString]) {
        for (const departure of departures[date]) {
          for (const arrival of arrivals[arrivalDateString]) {
            const key = `${departure.date}-${departure.from}-${departure.to}-${arrival.date}-${arrival.from}-${arrival.to}`;
            if (!trips[key] || departure.price + arrival.price + 1 < trips[key].total) {
              trips[key] = { departure, arrival, duration: d, total: departure.price + arrival.price };
            }
          }
        }
      }
    }
  }

  return new Response(JSON.stringify(Object.values(trips).sort((a, b) => a.total - b.total).slice(0, 200)));
}

function wait(delay) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function fetchRetry(url, delay, tries, fetchOptions = {}) {
  function onError() {
      if (tries <= 1) {
        throw "Too many retries";
      };
      return wait(delay).then(() => fetchRetry(url, delay, tries - 1, fetchOptions));
  }
  return fetch(url, fetchOptions).then(res => res.text()).then(text => {
    if (text.includes('Our systems have detected unusual traffic from your computer network.')) {
      return onError();
    }
    return text;
  }).catch(onError);
}

async function fetchPrices(from, to, firstDepartureDate, lastArrivalDate, carryOnBag, stops) {
  const flights = {};
  const promises = [];
  for (let d = new Date(firstDepartureDate); d <= new Date(lastArrivalDate); d = new Date(new Date(d).getTime() + 17193600000)) {
    const startDate = new Date(d).toISOString().split('T')[0];
    const endDate = new Date(Math.min(new Date(d).getTime() + 17193600000, new Date(lastArrivalDate).getTime(), new Date().getTime() + 28339200000)).toISOString().split('T')[0];
    promises.push(fetchRetry("https://www.google.com/_/TravelFrontendUi/data/travel.frontend.flights.FlightsFrontendService/GetCalendarGraph", 1000, 5, {
      "headers": {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      "body": `f.req=${encodeURIComponent(`[null,"[null,[null,null,2,null,[],1,[1,0,0,0],null,null,null,${carryOnBag ? "[1,0]" : "null"},null,null,[[[[[\\"${from}\\",0]]],[[[\\"${to}\\",0]]],null,${stops},[],[],\\"2023-02-02\\",null,[],[],[],null,null,[],3]],null,null,null,true,null,null,null,null,null,[],null,null,null],[\\"${startDate}\\",\\"${endDate}\\"]]"]`)}`,
      "method": "POST"
    }).then(text => {
      const items = text.matchAll(/\\"\d{4}-\d{2}-\d{2}\\",null,\[\[null,\d+\]/g);
      for (const item of items) {
        const date = item[0].split(',')[0].replace(/\\\"/g, '');
        const price = Number(item[0].split(',')[3].replace(/\]/g, ''));
        flights[date] = { from, to, date, price };
      }
    }));
  }
  await Promise.all(promises);
  return flights;
}

async function fetchTrips(from, to, firstDepartureDate, lastArrivalDate, carryOnBag, stops, minDuration, maxDuration) {
  const trips = {};
  const promises = [];
  for (let d = new Date(firstDepartureDate); d <= new Date(lastArrivalDate); d = new Date(new Date(d).getTime() + 17193600000)) {
    const startDate = new Date(d).toISOString().split('T')[0];
    const endDate = new Date(Math.min(new Date(d).getTime() + 17193600000, new Date(lastArrivalDate).getTime(), new Date().getTime() + 28339200000)).toISOString().split('T')[0];
    const increment = Math.floor(16416000000 / (new Date(endDate) - new Date(startDate))) - 1;
    for (let d = minDuration; d <= maxDuration; d += Math.max(increment, 1)) {
      promises.push(fetchRetry("https://www.google.com/_/TravelFrontendUi/data/travel.frontend.flights.FlightsFrontendService/GetCalendarGraph", 1000, 5, {
        "headers": {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        "body": `f.req=${encodeURIComponent(`[null,"[null,[null,null,1,null,[],1,[1,0,0,0],null,null,null,${carryOnBag ? "[1,0]" : "null"},null,null,[[[[[\\"${from}\\",0]]],[[[\\"${to}\\",0]]],null,${stops},[],[],\\"2023-02-02\\",null,[],[],[],null,null,[]],[[[[\\"${to}\\",0]]],[[[\\"${from}\\",0]]],null,${stops},[],[],\\"2023-02-02\\",null,[],[],[],null,null,[],1]],null,null,null,true,null,null,null,null,null,[],null,null,null,null],[\\"${startDate}\\",\\"${endDate}\\"],null,[${d},${Math.min(d + increment, maxDuration)}]]"]`)}`,
        "method": "POST"
      }).then(text => {
        const items = text.matchAll(/\\"\d{4}-\d{2}-\d{2}\\",\\"\d{4}-\d{2}-\d{2}\\",\[\[null,\d+\]/g);
        for (const item of items) {
          const departureDate = item[0].split(',')[0].replace(/\\\"/g, '');
          const arrivalDate = item[0].split(',')[1].replace(/\\\"/g, '');
          const total = Number(item[0].split(',')[3].replace(/\]/g, ''));
          const duration = Math.round((new Date(arrivalDate) - new Date(departureDate)) / 86400000);
          if (new Date(arrivalDate) > new Date(lastArrivalDate)) continue;
          trips[`${departureDate}-${from}-${to}-${arrivalDate}-${to}-${from}`] = { departure: { from, to, date: departureDate }, arrival: { from: to, to: from, date: arrivalDate }, duration, total }
        }
      }));
    }
  }
  await Promise.all(promises);
  return trips;
}