import nodemailer from 'nodemailer';
import { createConsumer } from '../../../shared/utils/kafka.js';

// Setup Gmail Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not main password
  },
});

async function sendEmailNotification(to, subject, text) {
  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      text,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

async function run() {
  const consumer = createConsumer('notification-service-group');
  await consumer.connect();
  await consumer.subscribe({ topic: 'order-status-updates', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const { email, orderId, status } = JSON.parse(message.value.toString());
      
      const subject = `Order Update: ${orderId}`;
      const text = `Your order ${orderId} is now ${status}.`;
      
      await sendEmailNotification(email, subject, text);
    },
  });
}

run().catch(console.error);
