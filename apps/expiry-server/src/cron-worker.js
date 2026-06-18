import { PrismaClient } from '@prisma/client';
import redisClient from './redisClient.js';
import { revertStock } from '../../../../shared/utils/expiry.js';

const prisma = new PrismaClient();

/**
 * Main worker loop for the Expiry Server.
 */
async function processExpiredOrders() {
    console.log('Checking for expired orders...');
    
    // 1. Find orders that are PENDING and have passed their expiry time
    const expiredOrders = await prisma.order.findMany({
        where: {
            status: 'PENDING',
            expiresAt: { lt: new Date() },
        },
    });

    for (const order of expiredOrders) {
        try {
            // 2. Perform atomic update: Database + Redis
            await prisma.$transaction(async (tx) => {
                // Mark as expired
                await tx.order.update({
                    where: { id: order.id },
                    data: { status: 'EXPIRED' },
                });

                // Revert stock in Redis
                const stockKey = `product:${order.productId}:stock`;
                await revertStock(redisClient, stockKey, order.quantity);
            });
            console.log(`Order ${order.id} expired successfully.`);
        } catch (error) {
            console.error(`Failed to expire order ${order.id}:`, error);
        }
    }
}

// Run polling every 10 seconds
setInterval(processExpiredOrders, 10000);
