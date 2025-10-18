const axios = require("axios");
const { pakasirApiKey } = require("./config");

async function buatTransaksi(orderId, amount) {
  try {
    const res = await axios.post("https://app.pakasir.com/api/transactioncreate/qris", {
      project: "depodomain",
      order_id: orderId,
      amount,
      api_key: pakasirApiKey
    });
    return res.data.payment;
  } catch (err) {
    console.error("Error buat transaksi:", err.response?.data || err.message);
    return null;
  }
}

async function cekStatus(project, orderId, amount) {
  try {
    const url = `https://app.pakasir.com/api/transactiondetail?project=${project}&amount=${amount}&order_id=${orderId}&api_key=${pakasirApiKey}`;
    const res = await axios.get(url);
    return res.data.transaction.status;
  } catch (err) {
    console.error("Error cek status:", err.response?.data || err.message);
    return "pending";
  }
}

module.exports = { buatTransaksi, cekStatus };
