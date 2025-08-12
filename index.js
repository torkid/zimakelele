// index.js
// Import necessary libraries
const express = require('express');
const axios = require('axios'); // Used to communicate with ZenoPay API
const path = require('path');

// --- Configuration ---
const app = express();
const port = process.env.PORT || 3000; // Vercel will set the port automatically
const API_KEY = process.env.ZENOPAY_API_KEY; // Get API Key from Vercel Environment Variables
const EBOOK_PRICE = 200; // The price for the ebook in TZS - CORRECTED PRICE
const API_URL = "https://zenoapi.com/api/payments/mobile_money_tanzania";

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
app.get('/thank-you', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'thank-you.html'));
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

    // Create a unique reference for the transaction
    const transaction_reference = `EBOOK-${Date.now()}`;
    
    // Payload for the ZenoPay API
    const payload = {
        "order_id": transaction_reference,
        "buyer_name": phone, 
        "buyer_email": `${phone}@example.com`,
        "buyer_phone": phone,
        "amount": EBOOK_PRICE // Using the corrected price
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

        // A real application would typically rely on a webhook from ZenoPay to confirm payment.
        // For this simulation, we'll assume the push was sent successfully and the user will confirm on their phone.
        // The frontend will handle the redirect to the thank you page.
        if (response.data && response.data.status === 'success') {
            res.json({
                message_title: "Angalia Simu Yako!",
                message_body: "Tumekutumia ombi la malipo. Tafadhali weka namba yako ya siri kuthibitisha. Baada ya kulipa, utaweza kuendelea.",
                status: "Inasubiri Uthibitisho",
                reference: transaction_reference,
                // We can add a success flag for the frontend to know when to show the 'continue' button
                payment_initiated: true 
            });
        } else {
            res.status(400).json({
                message_title: "Ombi la Malipo Halikufanikiwa",
                message_body: response.data.message || "Hatukuweza kutuma ombi la malipo. Tafadhali angalia salio lako na ujaribu tena.",
                status: "Imeshindwa",
                reference: transaction_reference
            });
        }
    } catch (error) {
        // Handle network errors or errors from the ZenoPay API itself
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

