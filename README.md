# Trip Finder

Google Flights is a very useful tool for searching flights and comparing prices, but it lacks a few features. Namely, it does not support searching for round-trip flights that use different airports for the departure and return flights. Additionally, the UI for comparing trips with a flexible duration is not intuitive.

Trip Finder is a web app that finds all the possible combinations of round-trip flights and presents them in an intuitive way. Users can select multiple origin and destination airports, the time window for the trip, the minimum and maximum duration of the trip, the number of stops and the need for a carry-on bag. The results are sorted by price and displayed in a list resembling a Gantt chart, with links to the corresponding Google Flights pages.

> [!WARNING]
> Since Google Flights does not provide an open API, this app mimics the requests sent by the browser when accessing https://flights.google.com, which might be against Google's ToS. Run at your own risk.

## Installation

### Local

```sh
# Clone and install
git clone https://github.com/rodrigohpalmeirim/trip-finder.git
cd trip-finder
npm install

# Build and run
npm run build
node build/
```

#### Development server
```sh
npm run dev
```