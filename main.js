// Wifi-Bot | Pairing Mode | Termux Ready
// Buat WiFi Voucher Bot dengan integrasi Pakasir
// By Tokito Rii + GPT-5 😎

const {
    makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")
const fs = require("fs")
const axios = require("axios")
const readline = require("readline")

// === CONFIG EDITABLE ===
const ADMIN_ID = "628xxx@s.whatsapp.net" // ganti dengan nomor admin
const GROUP_ID = "1203630xxxxx@g.us" // ganti dengan ID grup notif
const PROJECT_SLUG = "depodomain" // slug proyek Pakasir
const API_KEY = "xxx123" // api key dari Pakasir
const VOUCHER_PRICE = 2500 // harga per voucher
const STOCK_FILE = "./voucher_stock.json"

// === INIT FILE STOCK ===
if (!fs.existsSync(STOCK_FILE)) fs.writeFileSync(STOCK_FILE, JSON.stringify([]))

// === PAIRING & CONNECTION ===
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const { version } = await fetchLatestBaileysVersion()
    const sock = makeWASocket({
        version,
        printQRInTerminal: false,
        auth: state,
        browser: ['WifiBot', 'Safari', '1.0.0']
    })

    sock.ev.on('connection.update', async (update) => {
        const { connection, pairingCode } = update
        if (connection === 'open') {
            console.log('✅ Terhubung ke WhatsApp!')
        } else if (connection === 'close') {
            console.log('❌ Koneksi terputus, mencoba ulang...')
            startBot()
        } else if (pairingCode) {
            console.log(`🔢 Pairing Code: ${pairingCode}`)
            console.log('Masukkan kode di WhatsApp > Perangkat tertaut > Masukkan kode.')
        }
    })

    if (!state.creds.registered) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
        rl.question('Masukkan nomor WhatsApp kamu (tanpa +): ', async (phoneNumber) => {
            const code = await sock.requestPairingCode(phoneNumber)
            console.log(`Kode Pairing kamu: ${code}`)
            rl.close()
        })
    }

    sock.ev.on('creds.update', saveCreds)

    // === PESAN MASUK ===
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return
        const sender = msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""

        // === COMMAND: .buyvoucher ===
        if (text.startsWith('.buyvoucher')) {
            const order_id = "INV" + Date.now()
            const amount = VOUCHER_PRICE

            const url = `https://app.pakasir.com/api/transactioncreate/qris`
            const payload = {
                project: PROJECT_SLUG,
                order_id,
                amount,
                api_key: API_KEY
            }

            try {
                const res = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } })
                const pay = res.data.payment
                await sock.sendMessage(sender, {
                    text: `🧾 *Voucher WiFi*\n\n💰 Harga: Rp${amount}\n📄 Order ID: ${order_id}\n\nScan QR ini untuk bayar via QRIS (atau klik link):\nhttps://app.pakasir.com/pay/${PROJECT_SLUG}/${amount}?order_id=${order_id}&qris_only=1`
                })

                // Simpan transaksi sementara
                savePending(order_id, sender)
                await sock.sendMessage(GROUP_ID, { text: `📢 Pesanan baru dari @${sender.split('@')[0]} (Rp${amount})`, mentions: [sender] })
            } catch (err) {
                console.error(err)
                await sock.sendMessage(sender, { text: "❌ Gagal membuat transaksi. Coba lagi nanti." })
            }
        }

        // === COMMAND: .addvoucher ===
        if (text.startsWith('.addvoucher')) {
            if (sender !== ADMIN_ID) return sock.sendMessage(sender, { text: "❌ Hanya admin yang bisa menambah stok!" })
            const codes = text.replace('.addvoucher', '').trim().split(/\s+/)
            if (!codes.length) return sock.sendMessage(sender, { text: "⚠️ Masukkan kode voucher setelah perintah." })
            const stock = JSON.parse(fs.readFileSync(STOCK_FILE))
            stock.push(...codes)
            fs.writeFileSync(STOCK_FILE, JSON.stringify(stock, null, 2))
            await sock.sendMessage(sender, { text: `✅ ${codes.length} voucher berhasil ditambah ke stok.` })
        }

        // === COMMAND: .checkstock ===
        if (text === '.checkstock') {
            const stock = JSON.parse(fs.readFileSync(STOCK_FILE))
            await sock.sendMessage(sender, { text: `📦 Jumlah voucher tersedia: ${stock.length}` })
        }
    })
}

// === PENDING STORAGE ===
const PENDING_FILE = './pending.json'
if (!fs.existsSync(PENDING_FILE)) fs.writeFileSync(PENDING_FILE, JSON.stringify({}))

function savePending(order_id, sender) {
    const data = JSON.parse(fs.readFileSync(PENDING_FILE))
    data[order_id] = { sender }
    fs.writeFileSync(PENDING_FILE, JSON.stringify(data, null, 2))
}

// === WEBHOOK SIMULASI BAYARAN (Gunakan webhook beneran di server) ===
async function handlePayment(order_id) {
    const data = JSON.parse(fs.readFileSync(PENDING_FILE))
    if (!data[order_id]) return console.log("⚠️ Order ID tidak ditemukan")

    const sender = data[order_id].sender
    const stock = JSON.parse(fs.readFileSync(STOCK_FILE))
    if (!stock.length) return console.log("❌ Stok voucher habis!")

    const voucher = stock.shift()
    fs.writeFileSync(STOCK_FILE, JSON.stringify(stock, null, 2))

    delete data[order_id]
    fs.writeFileSync(PENDING_FILE, JSON.stringify(data, null, 2))

    // kirim voucher
    await sock.sendMessage(sender, { text: `✅ Pembayaran diterima!\n🎟️ Kode Voucher WiFi kamu:\n\n*${voucher}*\n\nTerima kasih telah membeli!` })
    await sock.sendMessage(GROUP_ID, { text: `📢 Pesanan @${sender.split('@')[0]} telah *dibayar* dan voucher dikirim.`, mentions: [sender] })
}

// === START ===
startBot()
