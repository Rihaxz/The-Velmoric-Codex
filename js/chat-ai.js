
/* =========================================================
   CHAT-AI.JS
   Chat AI untuk The Velmoric Codex.
   API key tidak disimpan atau dikirim dari browser.
   ========================================================= */

const aiChatModal = document.getElementById("aiChatModal");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");

function tambahPesanChat(teks, tipe) {
  if (!chatMessages) return null;

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${tipe}`;
  bubble.textContent = teks;

  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return bubble;
}

async function kirimPesanAI() {
  if (!chatInput || !chatMessages) return;

  const pesan = chatInput.value.trim();

  if (!pesan) return;

  const sendButton = document.getElementById("sendChat");

  if (sendButton) sendButton.disabled = true;

  tambahPesanChat(pesan, "chat-user");
  chatInput.value = "";

  const loadingBubble = tambahPesanChat(
    "Arsitek Velmor sedang berpikir...",
    "chat-ai"
  );

  try {
    // Ambil konteks lore dari data yang sudah dimuat di halaman.
    const daftarKarakter = Array.isArray(characters)
      ? characters
      : [];

    const lore = daftarKarakter.map((karakter) => ({
      nama: karakter.nama || "",
      ras: karakter.ras || "",
      deskripsi: karakter.deskripsi || "",
      latar: karakter.latar || ""
    }));

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: pesan,
        lore
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || `Permintaan gagal (${response.status}).`
      );
    }

    if (!data.reply || typeof data.reply !== "string") {
      throw new Error("Server tidak mengirim jawaban AI yang valid.");
    }

    if (loadingBubble) loadingBubble.remove();

    tambahPesanChat(data.reply, "chat-ai");
  } catch (error) {
    console.error("Chat AI error:", error);

    if (loadingBubble) loadingBubble.remove();

    tambahPesanChat(
      `Gagal menghubungi AI: ${error.message}. Periksa server dan konfigurasi API.`,
      "chat-ai"
    );
  } finally {
    if (sendButton) sendButton.disabled = false;

    chatMessages.scrollTop = chatMessages.scrollHeight;
    chatInput.focus();
  }
}

function initChatAI() {
  const sendButton = document.getElementById("sendChat");

  sendButton?.addEventListener("click", kirimPesanAI);

  chatInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      kirimPesanAI();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initChatAI, {
    once: true
  });
} else {
  initChatAI();
}
