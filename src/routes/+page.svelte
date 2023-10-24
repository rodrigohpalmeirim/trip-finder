<script>
    import Fa from 'svelte-fa'
    import { faCompass, faPlane } from '@fortawesome/free-solid-svg-icons'
    import MultiSelect from "$lib/MultiSelect.svelte";
    import DoubleSlider from "$lib/DoubleSlider.svelte";

    let trips = [], airports = {}, airportOptions;
    let from, to;
    let origins, destinations, minDuration = 5, maxDuration = 10, carryOnBag = false, stops = 0, firstDepartureDate, lastArrivalDate;
    let hoveredTrip, hovering, loading, grabbing;

    $: if (!firstDepartureDate) firstDepartureDate = new Date().toISOString().split("T")[0];
    $: if (!lastArrivalDate) lastArrivalDate = new Date(new Date().getTime() + 1209600000).toISOString().split("T")[0];
    
    $: if ((origins?.length || destinations?.length) && !grabbing) {
        loading = true;
        const inputs = JSON.stringify({ origins, destinations, firstDepartureDate, lastArrivalDate, minDuration, maxDuration, carryOnBag, stops });
        fetch("/api/trips", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: inputs,
        }).then((res) => res.json()).then((results) => {
            if (inputs == JSON.stringify({ origins, destinations, firstDepartureDate, lastArrivalDate, minDuration, maxDuration, carryOnBag, stops })) {
                trips = results;
                loading = false;
            }
        });
    };

    $: if (from || to) {
        const query = from || to;
        fetch(`/api/airports?query=${query}`).then((res) => res.json()).then((results) => {
            if (query == (from || to)) {
                airportOptions = results;
                for (const airport in results) {
                    airports[airport] = results[airport];
                }
            }
        });
    };

    const parseDate = (date) => new Date(date.replace("(\d{2})/|-(\d{2})/|-(\d{4})", "$3-$2-$1"));
    const daysBetween = (date1, date2) => Math.round(Math.abs((parseDate(date2) - parseDate(date1)) / 86400000));
</script>

<div class="flex flex-col items-center h-screen grow py-3 md:py-[7vh] gap-3">
    <div class="flex w-[95%] lg:w-[1000px] p-5 bg-base-300 rounded-xl flex-wrap gap-2 items-end">
        <div class="flex grow-[100]">
            <div class="form-control w-1/2">
                <span class="label label-text">From</span>
                <MultiSelect bind:query={from} bind:values={origins} options={airportOptions} placeholder="Departure airports" class="rounded-r-none grow" />
            </div>
            <div class="form-control w-1/2">
                <span class="label label-text">To</span>
                <MultiSelect bind:query={to} bind:values={destinations} options={airportOptions} placeholder="Arrival airports" class="rounded-l-none grow" />
            </div>
        </div>
        <div class="flex grow">
            <div class="form-control w-1/2">
                <span class="label label-text">First departure date</span>
                <input class="input input-bordered rounded-r-none w-full" type="date" required={true} min={new Date().toISOString().split("T")[0]} bind:value={firstDepartureDate} on:click={e => e.target.showPicker()}>
            </div>
            <div class="form-control w-1/2">
                <span class="label label-text">Last arrival date</span>
                <input class="input input-bordered rounded-l-none w-full" type="date" min={new Date((parseDate(firstDepartureDate)).getTime() + 86400000).toISOString().split("T")[0]} bind:value={lastArrivalDate} on:click={e => e.target.showPicker()}>
            </div>
        </div>
        <div class="flex flex-col grow min-w-[250px] sm:min-w-[350px]">
            <div class="flex justify-between gap-5">
                <span class="label label-text">Minimum trip<br> duration (days)</span>
                <span class="label label-text text-right">Maximum trip<br> duration (days)</span>
            </div>
            <div class="flex items-center gap-2">
                <input class="input input-sm input-bordered w-[60px]" type="number" min="1" bind:value={minDuration} />
                <DoubleSlider class="grow" min={1} max={daysBetween(firstDepartureDate, lastArrivalDate)} bind:lower={minDuration} bind:upper={maxDuration} bind:grabbing />
                <input class="input input-sm input-bordered w-[60px]" type="number" min="1" bind:value={maxDuration} />
            </div>
        </div>
        <div class="form-control grow sm:max-w-[50%]">
            <span class="label label-text">Stops</span>
            <select class="select select-bordered" bind:value={stops}>
                <option value={0}>Any number of stops</option>
                <option value={1}>Nonstop only</option>
                <option value={2}>1 stop or fewer</option>
                <option value={3}>2 stops or fewer</option>
            </select>
        </div>
        <div class="form-control">
            <label class="label cursor-pointer gap-2">
                <input type="checkbox" class="checkbox" bind:checked={carryOnBag} />
                <span class="label-text">Carry-on bag</span>
            </label>
        </div>
    </div>
    <div class="flex flex-col w-[95%] lg:w-[1000px] grow min-h-[300px] bg-base-300 rounded-xl overflow-hidden relative">
        <div class="bg-neutral w-full px-8 sm:px-24 rounded-t-xl relative">
            <div class="flex justify-between w-full py-5 relative">
                <span class="text-xs sm:text-sm -translate-x-1/2 font-semibold">{parseDate(firstDepartureDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <span class="text-xs sm:text-sm translate-x-1/2 font-semibold">{parseDate(lastArrivalDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <div class="absolute bottom-0 w-full flex justify-between">
                    {#each [... new Array(daysBetween(firstDepartureDate, lastArrivalDate) + 1).keys()] as day}
                        <div class="bg-base-100 w-[2px] h-2"></div>
                    {/each}
                </div>
                {#if hoveredTrip}
                    <div class="absolute bottom-0 -left-[2px] w-1 bg-blue-400 transition-all {(daysBetween(hoveredTrip.arrival.date, hoveredTrip.departure.date)) / daysBetween(firstDepartureDate, lastArrivalDate) > 100 / Math.min(window.innerWidth, 1000) ? "h-5" : "h-8"} {hovering ? "opacity-100" : "opacity-0"}" style="margin-left: {(daysBetween(firstDepartureDate, hoveredTrip.departure.date)) / daysBetween(firstDepartureDate, lastArrivalDate) * 100}%;">
                        <span class="absolute -top-6 p-1 -left-1/2 -translate-x-1/2 bg-neutral rounded-md text-sm text-blue-400 whitespace-nowrap font-semibold">{parseDate(hoveredTrip.departure.date).toLocaleDateString("en-US", { month: "short", weekday: "short", day: "numeric" })}</span>
                    </div>
                    <div class="absolute bottom-0 -left-[2px] w-1 bg-blue-400 transition-all {(daysBetween(hoveredTrip.arrival.date, hoveredTrip.departure.date)) / daysBetween(firstDepartureDate, lastArrivalDate) > 100 / Math.min(window.innerWidth, 1000) ? "h-5" : "h-3"} {hovering ? "opacity-100" : "opacity-0"}" style="margin-left: {(daysBetween(firstDepartureDate, hoveredTrip.arrival.date)) / daysBetween(firstDepartureDate, lastArrivalDate) * 100}%;">
                        <span class="absolute -top-6 p-1 -left-1/2 -translate-x-1/2 bg-neutral rounded-md text-sm text-blue-400 whitespace-nowrap font-semibold">{parseDate(hoveredTrip.arrival.date).toLocaleDateString("en-US", { month: "short", weekday: "short", day: "numeric" })}</span>
                    </div>
                {/if}
            </div>
        </div>
        <div class="absolute left-0 right-0 top-16 h-full mx-8 sm:mx-24 border-base-100 border-x-2 border-dashed"></div>
        <div class="flex flex-col p-5 px-8 sm:px-24 gap-2 grow relative overflow-y-scroll no-scrollbar {loading ? "opacity-50" : ""}">
            {#if trips.length > 0}
                {#each trips as trip}
                    <!-- svelte-ignore a11y-mouse-events-have-key-events -->
                    <label
                        for="modal"
                        class="flex justify-center items-center relative min-h-[30px] h-[30px] w-full bg-blue-400 rounded-md font-semibold cursor-pointer text-base-content"
                        title="{trip.duration} {trip.duration === 1 ? "day" : "days"} • €{trip.total}"
                        style="
                            width: {trip.duration / daysBetween(firstDepartureDate, lastArrivalDate) * 100}%;
                            margin-left: {daysBetween(firstDepartureDate, trip.departure.date) / daysBetween(firstDepartureDate, lastArrivalDate) * 100}%;
                        "
                        on:mouseover={() => { hoveredTrip = trip; hovering = true }}
                        on:mouseout={() => { hovering = false }}
                    >
                        <div class="absolute hidden sm:flex items-center gap-1 right-full text-sm whitespace-nowrap m-2">{trip.departure.from}<Fa icon={faPlane} />{trip.departure.to}</div>
                        <div class="flex flex-row-reverse justify-center items-center flex-wrap h-full overflow-hidden leading-[30px]">
                            <span class="h-[30px]"></span>
                            <span class="text-base-300">€{trip.total}</span>
                            <span class="text-base-300 mr-1">{trip.duration} {trip.duration === 1 ? "day" : "days"} • </span>
                        </div>
                        <div class="absolute hidden sm:flex items-center gap-1 left-full text-sm whitespace-nowrap m-2">{trip.arrival.from}<Fa icon={faPlane} />{trip.arrival.to}</div>
                    </label>
                {/each}
            {:else if !loading}
                <div class="flex justify-center items-center h-full">
                    <span>No results found</span>
                </div>
            {/if}
        </div>
        {#if loading}
            <div class="absolute top-14 left-0 right-0 bottom-0 flex justify-center items-center">
                <Fa icon={faCompass} class="animate-spin text-3xl" />
            </div>
        {/if}
    </div>
</div>

<input type="checkbox" id="modal" class="modal-toggle" />
<label for="modal" class="modal cursor-pointer">
    <label class="modal-box max-w-[601px] relative" for="">
        {#if hoveredTrip}
            <a
                class="flex flex-col items-center transition-colors {hoveredTrip.departure.price ? "gap-4" : "bg-base-300 hover:bg-base-200 rounded-xl shadow-lg"}"
                href={hoveredTrip.departure.price ? null : `https://www.google.com/travel/flights/search?tfs=CBwQAhogagcIARID${btoa(hoveredTrip.departure.from)}${btoa(`\x12\n${hoveredTrip.departure.date}`)}cgcIARID${btoa(hoveredTrip.departure.to)}KA${["0", "A", "E", "I"][stops]}aIGoHCAES${btoa(`\x03${hoveredTrip.arrival.from}\x12`).slice(0,6)}IK${btoa(`${hoveredTrip.arrival.date}r\x07`)}CAES${btoa(`\x03${hoveredTrip.arrival.to}(`).slice(0,6)}g${["0", "A", "B", "C"][stops]}cAGCAQsI____________AUABSAGYAQ${carryOnBag ? "FqBBABGAA" : "E"}`}
                target="_blank"
                rel="noreferrer"
            >
                <a
                    class="flex flex-col w-full gap-1 transition-colors rounded-xl {hoveredTrip.departure.price ? "bg-base-300 hover:bg-base-200 shadow-lg" : "rounded-b-none"} p-5"
                    href={hoveredTrip.departure.price ? `https://www.google.com/travel/flights/search?tfs=CBwQAhogagcIARID${btoa(hoveredTrip.departure.from)}${btoa(`\x12\n${hoveredTrip.departure.date}`)}cgcIARID${btoa(hoveredTrip.departure.to)}KA${["0", "B", "F", "J"][stops]}wAYIBCwj___________8BQAFIAZgBA${carryOnBag ? "moEEAEYAA" : "g"}` : null}
                    target="_blank"
                    rel="noreferrer"
                >
                    <div class="flex justify-between">
                        <span>{parseDate(hoveredTrip.departure.date).toLocaleDateString("en-US", { month: "long", weekday: "long", day: "numeric" })}</span>
                        {#if hoveredTrip.departure.price}
                            <span>€{hoveredTrip.departure.price}</span>
                        {/if}
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="font-semibold">{airports[hoveredTrip.departure.from]}
                            <span class="text-base-content text-sm text-opacity-50">{hoveredTrip.departure.from}</span>
                        </span>
                        <Fa icon={faPlane} />
                        <span class="font-semibold">{airports[hoveredTrip.departure.to]}
                            <span class="text-base-content text-sm text-opacity-50">{hoveredTrip.departure.to}</span>
                        </span>
                    </div>
                </a>
                {#if !hoveredTrip.departure.price}
                    <div class="px-5 w-full">
                        <div class="w-full h-[2px] bg-base-100"></div>
                    </div>
                {/if}
                <a
                    class="flex flex-col w-full gap-1 transition-colors rounded-xl {hoveredTrip.departure.price ? "bg-base-300 hover:bg-base-200 shadow-lg" : "rounded-t-none"} p-5"
                    href={hoveredTrip.departure.price ? `https://www.google.com/travel/flights/search?tfs=CBwQAhogagcIARID${btoa(hoveredTrip.arrival.from)}${btoa(`\x12\n${hoveredTrip.arrival.date}`)}cgcIARID${btoa(hoveredTrip.arrival.to)}KA${["0", "B", "F", "J"][stops]}wAYIBCwj___________8BQAFIAZgBA${carryOnBag ? "moEEAEYAA" : "g"}` : null}
                    target="_blank"
                    rel="noreferrer"
                >
                    <div class="flex justify-between">
                        <span>{parseDate(hoveredTrip.arrival.date).toLocaleDateString("en-US", { month: "long", weekday: "long", day: "numeric" })}</span>
                        {#if hoveredTrip.arrival.price}
                            <span>€{hoveredTrip.arrival.price}</span>
                        {/if}
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="font-semibold">{airports[hoveredTrip.arrival.from]}
                            <span class="text-base-content text-sm text-opacity-50">{hoveredTrip.arrival.from}</span>
                        </span>
                        <Fa icon={faPlane} />
                        <span class="font-semibold">{airports[hoveredTrip.arrival.to]}
                            <span class="text-base-content text-sm text-opacity-50">{hoveredTrip.arrival.to}</span>
                        </span>
                    </div>
                </a>
            </a>
            <div class="flex flex-col justify-between mt-5 px-3 text-lg font-semibold">Total: €{hoveredTrip.total}</div>
        {/if}
    </label>
</label>