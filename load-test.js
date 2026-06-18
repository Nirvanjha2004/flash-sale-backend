import axios from 'axios';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import autocannon from 'autocannon';

const BASE_URL = 'http://localhost:3000';
const PRODUCT_ID = 'prod-flash';
const INITIAL_STOCK = 100;
const CONCURRENT_CONNECTIONS = 500; // Simulated users hitting the site at once
const DURATION_SECONDS = 10;

const prisma = new PrismaClient();
const redis = new Redis({ host: 'localhost', port: 6379 });

async function setup() {
    console.log(`\n--- Preparing Database and Redis for Load Test ---`);
    
    // 🔥 FIX: Pichle saare orders ko flush karo taaki verification clean ho
    console.log("Clearing old orders from Database...");
    await prisma.order.deleteMany({}); // ◄── Add this line
    
    // Seed 500 dummy users
    console.log(`Seeding ${CONCURRENT_CONNECTIONS} users...`);
    const users = Array.from({ length: CONCURRENT_CONNECTIONS }).map((_, i) => ({
        id: `loaduser-${i}`,
        email: `loaduser${i}@test.com`,
        name: `Load User ${i}`
    }));
    
    await prisma.user.createMany({
        data: users,
        skipDuplicates: true
    });

    // Reset stock to exact amount
    console.log(`Setting stock for ${PRODUCT_ID} to ${INITIAL_STOCK}...`);
    await redis.set(`product:${PRODUCT_ID}:stock`, INITIAL_STOCK);
    
    console.log(`Setup complete.\n`);
}

async function runLoadTest() {
    await setup();

    console.log(`--- Starting Autocannon Load Test ---`);
    console.log(`Target: ${BASE_URL}/api/orders`);
    console.log(`Connections: ${CONCURRENT_CONNECTIONS}`);
    console.log(`Duration: ${DURATION_SECONDS} seconds\n`);

    return new Promise((resolve, reject) => {
        const instance = autocannon({
            url: `${BASE_URL}/api/orders`,
            connections: CONCURRENT_CONNECTIONS,
            duration: DURATION_SECONDS,
            requests: [
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        productId: PRODUCT_ID,
                        quantity: 1
                    }),
                    setupRequest: (req, context) => {
                        // Dynamically assign a random user from our pool and a unique idempotency key
                        const randomUserIndex = Math.floor(Math.random() * CONCURRENT_CONNECTIONS);
                        req.headers['Authorization'] = `Bearer loaduser-${randomUserIndex}`;
                        req.headers['Idempotency-Key'] = crypto.randomUUID();
                        return req;
                    }
                }
            ]
        }, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });

        autocannon.track(instance);
    });
}

async function verifyResults() {
    console.log(`\n--- Verifying Integrity ---`);
    
    // 1. Check final stock in Redis
    const finalStock = await redis.get(`product:${PRODUCT_ID}:stock`);
    console.log(`Final Redis Stock for ${PRODUCT_ID}: ${finalStock} (Expected: 0)`);
    
    if (parseInt(finalStock) < 0) {
        console.error('❌ RACE CONDITION DETECTED: Stock dropped below 0!');
    } else {
        console.log('✅ Stock atomicity maintained. No negative stock.');
    }

    // 2. We need to wait briefly to let the Kafka consumers finish writing to the DB
    console.log('Waiting 5 seconds for Kafka consumers to drain...');
    await new Promise(res => setTimeout(res, 5000));

    // 3. Count total orders created for this product in Postgres
    const totalOrders = await prisma.order.count({
        where: { productId: PRODUCT_ID }
    });
    
    console.log(`Total Orders in Database: ${totalOrders} (Expected: ${INITIAL_STOCK})`);
    
    if (totalOrders > INITIAL_STOCK) {
        console.error('❌ OVERSOLD: More orders created than initial stock!');
    } else if (totalOrders < INITIAL_STOCK) {
         console.warn(`⚠️ UNDERSOLD: Only ${totalOrders} created. Ensure load test duration/volume was high enough to deplete stock.`);
    } else {
        console.log('✅ Perfect consistency: Database orders match exact initial stock.');
    }

    await prisma.$disconnect();
    redis.quit();
}

async function main() {
    try {
        const result = await runLoadTest();
        console.log(`\n--- Load Test Complete ---`);
        console.log(`Total Requests: ${result.requests.total}`);
        
        // 🔥 FIX: 2xx, 4xx, aur 5xx ko ab hum safe string index se fetch kar rahe hain
        console.log(`2xx Responses (Accepted): ${result['2xx']}`);
        console.log(`4xx Responses (Rejected/Out of Stock/Rate Limited): ${result['4xx']}`);
        console.log(`5xx Responses (Server Errors): ${result['5xx']}`);
        
        await verifyResults();
    } catch (err) {
        console.error("Load test failed:", err);
    }
}

main();