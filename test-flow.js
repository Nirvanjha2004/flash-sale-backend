import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/orders';
const USER_ID = 'user-123';
const PRODUCT_ID = 'prod-abc';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log('--- Starting Flash Sale E2E Test ---');

    // 1. Create Order
    console.log('Initiating order...');
    const orderRes = await axios.post(`${BASE_URL}/`, 
        { productId: PRODUCT_ID, quantity: 1 },
        { headers: { Authorization: `Bearer ${USER_ID}` } }
    );
    const { orderId } = orderRes.data;
    console.log(`Order created: ${orderId}`);

    // 2. Poll for payment link
    console.log('Polling for payment link...');
    let paymentLink = null;
    while (!paymentLink) {
        try {
            const statusRes = await axios.get(`${BASE_URL}/status/${orderId}`, 
                { headers: { Authorization: `Bearer ${USER_ID}` } }
            );
            if (statusRes.data.paymentLink) {
                paymentLink = statusRes.data.paymentLink;
                console.log(`Payment link received from ${statusRes.data.source}: ${paymentLink}`);
                break;
            }
        } catch (e) {
            // Wait for consumer to process event
        }
        await sleep(1500);
    }

    // 3. Simulate user clicking payment link
    console.log('Simulating user clicking payment link...');
    await axios.get(paymentLink);

    // 4. Poll for final status
    console.log('Monitoring final status...');
    while (true) {
        const statusRes = await axios.get(`${BASE_URL}/status/${orderId}`, 
            { headers: { Authorization: `Bearer ${USER_ID}` } }
        );
        console.log(`Current status: ${statusRes.data.status}`);
        if (statusRes.data.status === 'PAID' || statusRes.data.status === 'FAILED') {
            break;
        }
        await sleep(1500);
    }
    
    console.log('--- Test Finished ---');
}

runTest().catch(console.error);
