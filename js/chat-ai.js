
(() => {
  "use strict";

  const chatModal = document.getElementById("aiChatModal");
  const chatMessages = document.getElementById("chatMessages");
  const chatInput = document.getElementById("chatInput");
  const sendButton = document.getElementById("btnSendChat");
  const openButton = document.getElementById("btnChatAI");
  const closeButton = document.getElementById("closeChatAI");

  // Ganti dengan URL backend milikmu setelah backend selesai di-host.
  // Contoh: https://nama-backend.example.com/api/chat
  const AI_API_URL = "GANTI_DENGAN_URL_BACKEND/api/chat";

  function tambahPesanChat(teks, pengirim = "ai") {
    if (!chatMessages) return;

    const message = document.createElement("div");
    message.className = `chat-message ${pengirim === "user" ? "user" : "ai"}`;

    // Menggunakan textContent agar teks pengguna tidak dieksekusi sebagai HTML.
    message.textContent = String(teks ?? "");
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return message;
  }

  function bukaChatAI() {
    if (!chatModal) return;

    chatModal.hidden = false;
    chatModal.classList.add("active");

    if (chatInput) {
      chatInput.focus();
    }
  }

  function tutupChatAI() {
    if (!chatModal) return;

    chatModal.classList.remove("active");
    chatModal.hidden = true;
  }

  async function kirimPesanAI() {
    if (!chatInput || !sendButton) return;

    const pesan = chatInput.value.trim();
    if (!pesan) return;

    if (
      AI_API_URL.startsWith("GANTI_DENGAN_URL") ||
      !/^https?:\/\//i.test(AI_API_URL)
    ) {
      tambahPesanChat(
        "Backend AI belum dikonfigurasi. Selesaikan pemasangan backend terlebih dahulu."
      );
      return;
    }

    tambahPesanChat(pesan, "user");
    chatInput.value = "";
    chatInput.disabled = true;
    sendButton.disabled = true;

    const loadingMessage = tambahPesanChat("AI sedang berpikir...");

    try {
      const response = await fetch(AI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: pesan
        })
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("Server mengirim respons yang tidak valid.");
      }

      if (!response.ok) {
        throw new Error(data.error || `Permintaan gagal (${response.status}).`);
      }

      const jawaban =
        typeof data.reply === "string"
          ? data.reply
          : typeof data.message === "string"
            ? data.message
            : "";

      if (!jawaban) {
        throw new Error("Respons AI tidak berisi jawaban.");
      }

      if (loadingMessage) loadingMessage.remove();
      tambahPesanChat(jawaban);
    } catch (error) {
      if (loadingMessage) loadingMessage.remove();

      console.error("Chat AI error:", error);
      tambahPesanChat(
        `Gagal menghubungi AI: ${error.message || "Periksa koneksi dan konfigurasi backend."}`
      );
    } finally {
      chatInput.disabled = false;
      sendButton.disabled = false;
      chatInput.focus();
    }
  }

  if (openButton) {
    openButton.addEventListener("click", bukaChatAI);
  }

  if (closeButton) {
    closeButton.addEventListener("click", tutupChatAI);
  }

  if (sendButton) {
    sendButton.addEventListener("click", kirimPesanAI);
  }

  if (chatInput) {
    chatInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        kirimPesanAI();
      }
    });
  }

  // Menyediakan fungsi untuk dipakai file lain jika diperlukan.
  window.kirimPesanAI = kirimPesanAI;
  window.tambahPesanChat = tambahPesanChat;
  window.bukaChatAI = bukaChatAI;
  window.tutupChatAI = tutupChatAI;
})();
