// index.js
// Import necessary libraries
const express = require('express');
const axios = require('axios'); // Used to communicate with ZenoPay API
const path = require('path');

// --- Configuration ---
const app = express();
const port = process.env.PORT || 3000; // Vercel will set the port automatically
const API_KEY = process.env.ZENOPAY_API_KEY; // Get API Key from Vercel Environment Variables
const GROUP_PRICE = 5000; // The price for your WhatsApp group in TZS
const API_URL = "https://zenoapi.com/api/payments/mobile_money_tanzania";

// --- Middleware ---
// This allows our server to understand JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- HTML Template ---
// We'll serve a static HTML file for the frontend
const paymentPagePath = path.join(__dirname, 'public', 'index.html');

// --- Web Routes ---

// Route to serve the main payment page
app.get('/', (req, res) => {
    res.sendFile(paymentPagePath);
});

// Route to handle the payment submission
app.post('/pay', async (req, res) => {
    const { phone } = req.body;

    // Basic validation for the phone number
    if (!phone || !(phone.startsWith('07') || phone.startsWith('06')) || phone.length !== 10) {
        return res.status(400).json({
            message_title: "Namba si sahihi",
            message_body: "Tafadhali rudi mwanzo uweke namba sahihi ya simu, mfano: 07xxxxxxxx.",
            status: "Error",
            reference: "N/A"
        });
    }

    const transaction_reference = `WPGRP-${Date.now()}`;
    
    // Payload for the ZenoPay API
    const payload = {
        "order_id": transaction_reference,
        "buyer_name": phone,
        "buyer_email": `${phone}@example.com`,
        "buyer_phone": phone,
        "amount": GROUP_PRICE
    };

    // Headers for authentication
    const headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    };

    try {
        // Send the request to ZenoPay
        const response = await axios.post(API_URL, payload, { headers });

        console.log("ZenoPay API Response:", response.data);

        // Check the response from ZenoPay
        if (response.data && response.data.status === 'success') {
            res.json({
                message_title: "Angalia Simu Yako!",
                message_body: "Tumekutumia ombi la malipo. Tafadhali weka namba yako ya siri kuthibitisha.",
                status: "Inasubiri uthibitisho",
                reference: transaction_reference
            });
        } else {
            res.status(400).json({
                message_title: "Ombi la Malipo Halikufanikiwa",
                message_body: response.data.message || "Hatukuweza kutuma ombi la malipo.",
                status: "Imeshindwa",
                reference: transaction_reference
            });
        }
    } catch (error) {
        console.error("An error occurred:", error.response ? error.response.data : error.message);
        res.status(500).json({
            message_title: "Hitilafu ya Mfumo",
            message_body: "Samahani, kumetokea tatizo la kimfumo. Tafadhali jaribu tena baadae.",
            status: "Error",
            reference: transaction_reference
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});




