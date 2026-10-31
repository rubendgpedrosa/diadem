<script lang="ts">
	import "../app.css";
	import { ModeWatcher, setMode } from "mode-watcher";
	import Metadata from "@/components/utils/Metadata.svelte";
	import StatusScreen from "@/components/ui/StatusScreen.svelte";
	import InstanceGate from "@/components/ui/InstanceGate.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { onMount } from "svelte";
	import { getConfig } from "$lib/services/config/config";
	import { getInstanceUrl } from "$lib/native/runtime";

	let { children, data } = $props();

	// remove static loader
	onMount(() => {
        document.getElementById("initial-loader")?.remove();
        if (!data?.needsInstanceGate && !data?.configError) {
            setMode("dark");
        }
    });
</script>

{#if data?.needsInstanceGate}
	<InstanceGate />
{:else if data?.configError}
	{#if data.offline}
		<StatusScreen title={m.status_offline_title()} description={m.status_offline_desc()} />
	{:else}
		<StatusScreen
			title={m.status_unreachable_title({
				name: getConfig()?.general?.mapName || getInstanceUrl() || m.diadem_map()
			})}
			description={m.status_unreachable_desc()}
		/>
	{/if}
{:else}
	<Metadata />

	<ModeWatcher defaultMode="dark" track={false} />
	{@render children()}
{/if}
