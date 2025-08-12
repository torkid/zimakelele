// index.js
// Import necessary libraries
const express = require('express');
const axios = require('axios'); // Used to communicate with ZenoPay API
const path = require('path');

// --- Configuration ---
const app = express();
const port = process.env.PORT || 3000; // Vercel will set the port automatically
const API_KEY = process.env.ZENOPAY_API_KEY; // Get API Key from Vercel Environment Variables
const EBOOK_PRICE = 100; // The price for the ebook in TZS
const API_URL = "https://zenoapi.com/api/payments/mobile_money_tanzania";
const CHECK_STATUS_URL = "https://zenoapi.com/api/payments/status";

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

// CORRECTED: Route for the frontend to poll for payment status from ZenoPay
app.get('/check-payment/:reference', async (req, res) => {
    const { reference } = req.params;

    if (!reference) {
        return res.status(400).json({ status: 'INVALID_REFERENCE' });
    }

    const headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    };

    try {
        const response = await axios.get(`${CHECK_STATUS_URL}/${reference}`, { headers });
        
        // ZenoPay will return a status like "Paid", "Pending", "Failed"
        if (response.data && response.data.status) {
            let status = 'PENDING';
            if (response.data.status.toLowerCase() === 'paid') {
                status = 'PAID';
            } else if (response.data.status.toLowerCase() === 'failed') {
                status = 'FAILED';
            }
            res.json({ status: status });
        } else {
            res.status(404).json({ status: 'NOT_FOUND' });
        }
    } catch (error) {
        console.error(`Status check error for ${reference}:`, error.response ? error.response.data : error.message);
        // It's common for a status check to fail if the transaction is very new,
        // so we'll return PENDING to allow the frontend to retry.
        res.status(500).json({ status: 'PENDING' });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
