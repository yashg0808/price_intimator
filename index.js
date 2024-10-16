const axios = require('axios');
const cheerio = require('cheerio');
const { Client, Databases } = require('appwrite');
const twilio = require('twilio');
require('dotenv').config()

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')  // Your Appwrite Endpoint
    .setProject('670e2c19003b113af50a');          // Your project ID

const database = new Databases(client);

// Twilio Account Info
const accountSid = 'ACb51e78550b15b6ae2daefeef8d16f29e';       // Twilio Account SID
const authToken = '430ccf3df7824bf210e21baf55722c96';         // Twilio Auth Token
const twilioClient = twilio(accountSid, authToken);
const twilioWhatsAppNumber = 'whatsapp:+14155238886';  // Twilio WhatsApp-enabled number

// Helper function to scrape product price from Amazon
async function getAmazonPrice(url) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
            }
        });

        const $ = cheerio.load(data);
        // Modify the selectors based on your region
        const price = $('span.a-price-whole').first().text();

        if (!price) {
            throw new Error("Price not found");
        }

        return price.trim();
    } catch (error) {
        console.error(`Error fetching price from Amazon: ${error.message}`);
        return null;
    }
}

// Function to send a WhatsApp message using Twilio
async function sendWhatsAppMessage(to, body) {
    try {
        const message = await twilioClient.messages.create({
            from: twilioWhatsAppNumber,     // Twilio WhatsApp number
            to: `whatsapp:${to}`,           // Recipient's WhatsApp number
            body: body                      // Message content
        });
        console.log(`WhatsApp message sent to ${to}: ${message.sid}`);
    } catch (error) {
        console.error(`Error sending WhatsApp message: ${error.message}`);
    }
}

// Fetch products and phone numbers from Appwrite
async function fetchProductsAndSendWhatsApp() {
    try {
        // Fetch the product links and phone numbers from Appwrite
        const products = await database.listDocuments('urls', '670e2e12001c4310fb65');  // Replace with your actual database and collection IDs

        for (const product of products.documents) {
            const { amazon_link, phone_number } = product;

            // Scrape the product price
            const price = await getAmazonPrice(amazon_link);

            if (price) {
                // Send WhatsApp message with product price
                const message = `The price of the product at ${amazon_link} is ₹${price}`;
                await sendWhatsAppMessage(phone_number, message);
                console.log(`Sent message to ${phone_number}: ${message}`);
            }
        }
    } catch (error) {
        console.error(`Error fetching products or sending messages: ${error.message}`);
    }
}

// Call the function to fetch products and send WhatsApp messages
fetchProductsAndSendWhatsApp();