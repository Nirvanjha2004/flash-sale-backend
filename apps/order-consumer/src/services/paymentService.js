/**
 * Mock Payment Gateway Service
 */
export async function requestPaymentLink(orderId, totalAmount) {
    console.log(`[Payment Gateway] Requesting payment for Order ${orderId}, Amount: ${totalAmount}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return a dummy payment URL
    return `https://mock-payment-gateway.com/pay/${orderId}`;
}
