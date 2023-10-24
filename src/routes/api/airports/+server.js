export async function GET({ fetch, url }) {
  const query = await url.searchParams.get('query');

  const res = await fetch("https://www.google.com/_/TravelFrontendUi/data/batchexecute", {
    "headers": {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    "body": `f.req=${encodeURIComponent(`[[["H028ib","[\\"${query}\\",[1,2,3,5],null,[2],1]",null,"generic"]]]`)}`,
    "method": "POST"
  });
  
  const text = await res.text();
  
  try {
    const json = JSON.parse(text.slice(6));
    const data = JSON.parse(json[0][2])[0];
  
    if (!data) return new Response(JSON.stringify({}));
  
    const airports = {};
  
    for (const item of data) {
      if (item[0][0] === 1) {
        airports[item[0][5]] = item[0][1];
      } else if (item[0][0] === 3) {
        for (const airport of item[1]) {
          if (airport[0][0] === 1) {
            airports[airport[0][5]] = airport[0][1];
          }
        }
      }
    }
  
    return new Response(JSON.stringify(airports))
  } catch (e) {
    return new Response(JSON.stringify({}));
  }
}