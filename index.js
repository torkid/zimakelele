// index.js
// Import necessary libraries
const express = require('express');
const axios = require('axios'); // Used to communicate with ZenoPay API
const path = require('path');

// --- Configuration ---
const app = express();
const port = process.env.PORT || 3000; // Vercel will set the port automatically
const API_KEY = process.env.ZENOPAY_API_KEY; // Get API Key from Vercel Environment Variables
const EBOOK_PRICE = 200; // The price for the ebook in TZS
const API_URL = "https://zenoapi.com/api/payments/mobile_money_tanzania";
const CHECK_STATUS_URL = "https://zenoapi.com/api/payments/status";

// In-memory storage for transaction statuses (for simulation purposes)
// In a real application, you would use a database (e.g., Firestore, MongoDB).
const transactionStore = new Map();

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


// --- Web Routes ---

// Route to serve the main sales page (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to serve the thank you page
app.get('/thank-you.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'thank-you.html'));
});

// Route to handle the payment submission
app.post('/pay', async (req, res) => {
    const { phone } = req.body;

    if (!phone || !(phone.startsWith('07') || phone.startsWith('06')) || phone.length !== 10) {
        return res.status(400).json({ message_body: "Namba si sahihi." });
    }

    const transaction_reference = `EBOOK-${Date.now()}`;
    
    const payload = {
        "order_id": transaction_reference,
        "buyer_name": phone, 
        "buyer_email": `${phone}@example.com`,
        "buyer_phone": phone,
        "amount": EBOOK_PRICE
    };

    const headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    };

    try {
        const response = await axios.post(API_URL, payload, { headers });

        if (response.data && response.data.status === 'success') {
            // Store the transaction with a PENDING status
            transactionStore.set(transaction_reference, { status: 'PENDING' });
            
            // Simulate payment completion after 15 seconds for demonstration
            // In a real scenario, you would rely on a webhook from ZenoPay
            setTimeout(() => {
                 transactionStore.set(transaction_reference, { status: 'PAID' });
                 console.log(`SIMULATED: Transaction ${transaction_reference} marked as PAID.`);
            }, 15000);

            res.json({
                message_title: "Angalia Simu Yako!",
                message_body: "Tumekutumia ombi la malipo. Tafadhali weka namba yako ya siri kuthibitisha.",
                status: "Inasubiri Uthibitisho",
                reference: transaction_reference,
                payment_initiated: true 
            });
        } else {
            res.status(400).json({ message_body: response.data.message || "Ombi la malipo halikufanikiwa." });
        }
    } catch (error) {
        console.error("Payment initiation error:", error.response ? error.response.data : error.message);
        res.status(500).json({ message_body: "Samahani, kumetokea tatizo la kimfumo." });
    }
});

// NEW: Route for the frontend to poll for payment status
app.get('/check-payment/:reference', (req, res) => {
    const { reference } = req.params;
    const transaction = transactionStore.get(reference);

    if (transaction) {
        res.json({ status: transaction.status }); // e.g., 'PENDING' or 'PAID'
    } else {
        res.status(404).json({ status: 'NOT_FOUND' });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
