const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { buatTransaksi, cekStatus } = require("./pakasir");
const { kirimVoucher } = require("./voucher");
const { checkInterval, orderTimeout, voucherPrice, owner, groupNotif } = require("./config");

const dbPath = path.join(__dirname, "database.json");

function getDB() {
  if (!fs.existsSync(dbPath)) return [];
  return JSON.parse(fs.readFileSync(dbPath));
}
function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

async function buatOrder(sock, user) {
  const orderId = "ORD" + Date.now();
  const amount = voucherPrice;
  const project = "depodomain";

  const trx = await buatTransaksi(orderId, amount);
  if (!trx) {
    await sock.sendMessage(user, { text: "⚠️ Gagal membuat transaksi, coba lagi nanti." });
    return;
  }

  const db = getDB();
  db.push({ orderId, user, total: amount, status: "pending" });
  saveDB(db);

  const qrBuffer = await QRCode.toBuffer(trx.payment_number, { width: 300 });

  await sock.sendMessage(user, {
    image: qrBuffer,
    caption: `🧾 *Order Voucher WiFi*\n\n💰 Total: Rp${amount}\n📦 Order ID: ${orderId}\n\nSilakan scan QRIS di atas untuk membayar.\n⏰ Berlaku 30 menit.`
  });

  const interval = setInterval(async () => {
    const status = await cekStatus(project, orderId, amount);
    if (status === "completed") {
      clearInterval(interval);
      const data = getDB();
      const idx = data.findIndex(o => o.orderId === orderId);
      if (idx !== -1) {
        data[idx].status = "completed";
        saveDB(data);
        const voucher = await kirimVoucher(sock, user);
        if (voucher !== "empty") {
          await sock.sendMessage(groupNotif, {
            text: `✅ Transaksi Sukses!\n👤 User: ${user}\n💰 Nominal: Rp${amount}\n🎟️ Voucher: ${voucher}`
          });
        }
      }
    }
  }, checkInterval);

  setTimeout(() => {
    const data = getDB();
    const idx = data.findIndex(o => o.orderId === orderId && o.status === "pending");
    if (idx !== -1) {
      data[idx].status = "cancelled";
      saveDB(data);
      sock.sendMessage(user, { text: "❌ Order dibatalkan (timeout 30 menit)." });
    }
  }, orderTimeout);
}

module.exports = { buatOrder };
