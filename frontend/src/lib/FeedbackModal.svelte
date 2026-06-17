<script lang="ts">
  import axios from "axios";
  import { API_HOST } from "@/lib/config";
  import toast from "svelte-french-toast";
  import { CookieJar } from "tough-cookie";

  let { isOpen = $bindable(false) } = $props();

  let name = $state("");
  let message = $state("");
  let isSubmitting = $state(false);

  async function handleSubmit() {
    if (!name.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    isSubmitting = true;
    try {
      const w = await import("axios-cookiejar-support");

      const jar = new CookieJar();
      const client = w.wrapper(
        axios.create({
          jar,
          withCredentials: true,
        }),
      );

      await client.get(`https://api-mpop-backend.onrender.com/set-cookie`);

      await client.post(
        `https://api-mpop-backend.onrender.com/feedback/submit`,
        {
          userId: name,
          message,
          application: "KaraKokey",
        },
      );
      toast.success("Feedback submitted! Thank you.");
      name = "";
      message = "";
      isOpen = false;
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      isSubmitting = false;
    }
  }

  function close() {
    isOpen = false;
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    onclick={close}
    aria-hidden="true"
  >
    <div
      class="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
      onclick={(e) => e.stopPropagation()}
      aria-hidden="true"
    >
      <h2 class="text-3xl font-bold mb-2">Send Feedback</h2>
      <p class="text-zinc-400 mb-6 text-sm">We'd love to hear your thoughts!</p>

      <div class="space-y-4">
        <div>
          <label class="text-sm text-zinc-400 mb-2 block" for="name">Name</label
          >
          <input
            id="name"
            type="text"
            bind:value={name}
            placeholder="Your name"
            class="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/30 text-white"
          />
        </div>

        <div>
          <label class="text-sm text-zinc-400 mb-2 block" for="message"
            >Message</label
          >
          <textarea
            id="message"
            bind:value={message}
            placeholder="What's on your mind?"
            rows="4"
            class="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/30 text-white resize-none"
          ></textarea>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            class="flex-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 py-3 font-semibold transition active:scale-[0.98] text-white"
            onclick={close}
          >
            Cancel
          </button>
          <button
            class="flex-1 rounded-xl bg-red-500 hover:bg-red-400 py-3 font-semibold shadow-lg shadow-red-500/30 transition active:scale-[0.98] text-white disabled:opacity-50"
            onclick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
