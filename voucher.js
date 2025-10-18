const fs = require("fs");
const path = require("path");

const stockPath = path.join(__dirname, "voucher_stock.json");

function getStock() {
  if (!fs.existsSync(stockPath)) return [];
  return JSON.parse(fs.readFileSync(stockPath));
}

function saveStock(data) {
  fs.writeFileSync(stockPath, JSON.stringify(data, null, 2));
}

async function addVoucher(sock, sender, args) {
  if (!args[0]) {
    await sock.sendMessage(sender, { text: "⚠️ Format salah!\nGunakan: *.addvoucher KODEVOUCHER*" });
    return;
  }

  const code = args[0].trim();
  const stock = getStock();

  if (stock.includes(code)) {
    await sock.sendMessage(sender, { text: "⚠️ Voucher sudah ada di stok." });
    return;
  }

  stock.push(code);
  saveStock(stock);
  await sock.sendMessage(sender, { text: `✅ Voucher *${code}* berhasil ditambahkan ke stok.` });
}

async function kirimVoucher(sock, user) {
  const stock = getStock();

  if (stock.length === 0) {
    await sock.sendMessage(user, { text: "⚠️ Stok voucher kosong, silakan hubungi admin." });
    return "empty";
  }

  const voucher = stock.shift();
  saveStock(stock);

  await sock.sendMessage(user, {
    text: `🎟️ *Voucher WiFi Anda*\n\nKode: *${voucher}*\nHarga: Rp2.500\n\nTerima kasih telah membeli 🙏`
  });

  return voucher;
}

module.exports = { addVoucher, kirimVoucher };
