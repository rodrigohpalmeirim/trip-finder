<script>
    export let min, max, lower, upper, grabbing;
    $: lower = Math.max(Math.min(lower, upper), min);
    $: upper = Math.max(Math.min(upper, max), min);
</script>

<div class="relative w-32 h-5 {$$props.class}">
    <div class="absolute bg-base-100 w-full h-1 my-[8px]" />
    <div class="relative w-auto mx-[10px]">
        <div class="absolute bg-base-content h-5" style="left: {((lower - min) / Math.max(max - min, 1)) * 100}%; width: {((upper - lower) / Math.max(max - min, 1)) * 100}%;" />
    </div>
    <input type="range" {min} {max} bind:value={lower} on:mousedown={() => grabbing = true} on:mouseup={() => grabbing = false} />
    <input type="range" {min} {max} bind:value={upper} on:mousedown={() => grabbing = true} on:mouseup={() => grabbing = false} />
</div>

<style>
    input {
        @apply absolute w-full bg-transparent pointer-events-none appearance-none;
    }
    input::-webkit-slider-thumb {
        @apply w-5 h-5 bg-base-100 border-solid border-[3px] border-base-content rounded-full pointer-events-auto cursor-pointer;
        -webkit-appearance: none;
    }

    input::-moz-range-thumb {
        @apply w-5 h-5 bg-base-100 border-solid border-[3px] border-base-content rounded-full pointer-events-auto cursor-pointer;
        -moz-appearance: none;
    }
</style>
