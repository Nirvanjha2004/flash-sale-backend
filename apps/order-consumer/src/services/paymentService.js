/**
 * Mock Payment Gateway Service
 */
export async function requestPaymentLink(orderId, totalAmount) {
    console.log(`[Payment Gateway] Requesting payment for Order ${orderId}`);
    
    // Return a local Express route for the mock gateway
    return `http://localhost:3000/api/orders/mock-gateway/pay?orderId=${orderId}`;
}
