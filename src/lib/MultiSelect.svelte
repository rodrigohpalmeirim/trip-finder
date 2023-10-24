<script>
    export let query = "";
    export let values = [];
    export let options = {};
    export let placeholder;
    let input;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="flex flex-wrap gap-1 input input-bordered min-h-[3rem] p-1 h-auto relative content-start {Object.keys(options).length ? "focus-within:rounded-b-none" : ""} {$$props.class}" on:click={() => input.focus()}>
    {#each values as value}
        <div class="flex items-center bg-base-300 rounded-lg py-2 pl-3 pr-9 h-10 relative">
            <span>{value}</span>
            <button
                type="button"
                class="btn btn-ghost btn-xs absolute w-6 h-6 right-2"
                on:click={() => {
                    values = values.filter((v) => v !== value);
                    input.focus();
                }}
            >
                ✕
            </button>
        </div>
    {/each}
    <input
        class="px-2 bg-transparent border-none outline-none peer py-2 w-0 min-w-[145px] max-w-full h-10"
        type="text"
        {placeholder}
        bind:value={query}
        bind:this={input}
        on:blur={() => query = ""}
    />
    <div
        class="absolute top-full left-0 w-full bg-base-100 rounded-b-lg shadow-lg hidden peer-focus:block active:block max-h-[500px] overflow-y-auto overflow-x-hidden z-10"
    >
        {#each Object.keys(options) as option}
            <label class="label cursor-pointer justify-start gap-2 p-3">
                <input
                    type="checkbox"
                    class="checkbox"
                    checked={values.includes(option)}
                    on:change={() => {
                        if (values.includes(option)) {
                            values = values.filter((v) => v !== option);
                        } else {
                            values = [...values, option];
                        }
                        input.focus();
                    }}
                />
                <div>
                    <span class="font-semibold">{options[option]}</span>
                    <span class="text-base-content text-sm text-opacity-50">{option}</span>
                </div>
            </label>
        {/each}
    </div>
</div>
