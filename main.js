const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const { buatOrder } = require("./order");
const { addVoucher } = require("./voucher");
const { startRelay, endRelay, getRelayTarget } = require("./relay");
const { owner } = require("./config");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const sock = makeWASocket({ auth: state, printQRInTerminal: true });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async m => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    // relay session chat
    const target = getRelayTarget(from);
    if (target) {
      if (text === "!endsesi" && from === owner) {
        endRelay(sock, from);
        await sock.sendMessage(from, { text: "🛑 Sesi admin ditutup." });
      } else {
        await sock.sendMessage(target, { text });
      }
      return;
    }

    if (text.toLowerCase() === "menu") {
      await sock.sendMessage(from, {
        text: "📋 *Katalog Voucher WiFi*\n💸 Harga: Rp2.500\nKlik tombol di bawah untuk beli:",
        buttons: [{ buttonId: "buy_voucher", buttonText: { displayText: "💸 Beli Voucher WiFi" }, type: 1 }],
        headerType: 1
      });
    }

    if (text.startsWith(".addvoucher") && from === owner) {
      const args = text.split(" ").slice(1);
      await addVoucher(sock, from, args);
    }

    if (text.toLowerCase().includes("hubungi admin")) {
      await sock.sendMessage(from, { text: "📨 Pesan kamu dikirim ke admin, tunggu respon ya." });
      await sock.sendMessage(owner, { text: `📩 User ${from} ingin hubungi admin.\nBalas pesan ini untuk merespons.` });
      startRelay(sock, from, owner);
      return;
    }

    if (msg.message.buttonsResponseMessage?.selectedButtonId === "buy_voucher") {
      await buatOrder(sock, from);
    }
  });
}

startBot();
