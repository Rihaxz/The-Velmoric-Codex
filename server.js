
/* =========================================================
   SERVER.JS
   Backend untuk The Velmoric Codex.
   Membaca API key dari .env, bukan dari browser.
   Membutuhkan Node.js 18 atau lebih baru.
   ========================================================= */

require("dotenv").config();

const express = require("express");
const path = require("path");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const AI_API_URL =
  process.env.AI_API_URL ||
  "https://platform.aitools.cfd/api/v1/chat/completions";

const AI_MODEL =
  process.env.AI_MODEL ||
  "zhipu/glm-4-flash";

app.disable("x-powered-by");

app.use(express.json({ limit: "100kb" }));

// Batasi jumlah permintaan agar endpoint AI tidak mudah disalahgunakan.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Terlalu banyak pesan. Coba lagi sebentar."
  }
});

// Endpoint chat AI.
app.post("/api/chat", chatLimiter, async (req, res) => {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: "API key AI belum dikonfigurasi di server."
    });
  }

  const message =
    typeof req.body.message === "string"
      ? req.body.message.trim()
      : "";

  if (!message) {
    return res.status(400).json({
      error: "Pesan tidak boleh kosong."
    });
  }

  if (message.length > 4000) {
    return res.status(413).json({
      error: "Pesan terlalu panjang. Maksimal 4000 karakter."
    });
  }

  // Batasi dan sanitasi data lore yang dikirim browser.
  const lore = Array.isArray(req.body.lore)
    ? req.body.lore.slice(0, 100).map((item) => ({
        nama: String(item?.nama || "").slice(0, 150),
        ras: String(item?.ras || "").slice(0, 100),
        deskripsi: String(item?.deskripsi || "").slice(0, 1000),
        latar: String(item?.latar || "").slice(0, 1000)
      }))
    : [];

  const loreText = lore.length
    ? lore.map((item) =>
        `Nama: ${item.nama || "-"} | ` +
        `Ras: ${item.ras || "-"} | ` +
        `Deskripsi: ${item.deskripsi || "-"} | ` +
        `Latar: ${item.latar || "-"}`
      ).join("\n")
    : "(Belum ada data karakter.)";

  const systemPrompt = `
Kamu adalah Arsitek Velmor, penjaga perpustakaan The Velmoric Codex.
Kepribadianmu bijaksana, sedikit misterius, ramah, dan natural.
Jika pengguna menyapa dengan santai, balas secara natural.
Jika ditanya tentang karakter atau lore, gunakan referensi yang tersedia.
Jangan mengarang fakta lore yang tidak ada dalam referensi.
Jika informasi tidak tersedia, katakan dengan jujur.

Referensi lore:
${loreText}
`.trim();

  try {
    const upstream = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 500
      }),
      signal: AbortSignal.timeout(45000)
    });

    const result = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      console.error("Penyedia AI menolak permintaan:", upstream.status);

      return res.status(502).json({
        error: "Penyedia AI gagal memproses permintaan. Periksa konfigurasi API."
      });
    }

    const reply = result?.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      console.error("Format respons AI tidak sesuai.");

      return res.status(502).json({
        error: "Penyedia AI mengembalikan respons yang tidak valid."
      });
    }

    return res.json({
      reply: reply.trim()
    });
  } catch (error) {
    console.error("Kesalahan koneksi AI:", error.message);

    return res.status(502).json({
      error: "Tidak dapat terhubung ke penyedia AI."
    });
  }
});

// File website: index.html, css/, js/.
app.use(express.static(path.join(__dirname)));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`The Velmoric Codex berjalan di port ${PORT}`);
});
