// api/index.js
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const API_KEY = process.env.ZENOPAY_API_KEY;
const EBOOK_PRICE = 200;
const API_URL = "https://zenoapi.com/api/payments/mobile_money_tanzania";
// **UPDATED THE CHECK_STATUS_URL to remove the trailing slash**
const CHECK_STATUS_URL = "https://zenoapi.com/api/payments/status";

app.use(express.json());

// API ROUTES
app.post('/api/pay', async (req, res) => {
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
    const headers = { "Content-Type": "application/json", "x-api-key": API_KEY };

    try {
        const response = await axios.post(API_URL, payload, { headers });
        if (response.data && response.data.status === 'success') {
            res.json({
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

app.get('/api/check-payment/:reference', async (req, res) => {
    const { reference } = req.params;
    if (!reference) {
        return res.status(400).json({ status: 'INVALID_REFERENCE' });
    }
    const headers = { "Content-Type": "application/json", "x-api-key": API_KEY };

    try {
        // **THE FIX IS HERE: Changed to use query parameters instead of path parameters**
        const response = await axios.get(CHECK_STATUS_URL, { 
            params: { order_id: reference },
            headers: headers 
        });
        
        console.log(`ZenoPay response for ${reference}:`, JSON.stringify(response.data, null, 2));

        if (response.data && response.data.status) {
            let status = 'PENDING';
            if (response.data.status.toLowerCase() === 'paid') status = 'PAID';
            if (response.data.status.toLowerCase() === 'failed') status = 'FAILED';
            res.json({ status });
        } else {
            res.status(404).json({ status: 'NOT_FOUND' });
        }
    } catch (error) {
        console.error(`Status check error for ${reference}:`, error.response ? error.response.data : error.message);
        
        if (error.response && error.response.status === 404) {
            return res.json({ status: 'PENDING' });
        }
        
        res.status(500).json({ status: 'ERROR' });
    }
});

// This is required for Vercel to handle the Express app
module.exports = app;
