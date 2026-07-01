import dotenv from 'dotenv';
dotenv.config();

import { 
  sendPasswordResetEmail, 
  sendBookingApprovedEmailToClub, 
  sendEventReportReminderEmail 
} from './src/services/email';

async function testEmailJS() {
  console.log("Starting EmailJS tests...\n");

  // Replace with a valid email address you can check
  const testEmailAddress = "shahsiddhb@gmail.com"; 

  console.log(`1. Testing Password Reset Email to ${testEmailAddress}...`);
  const passResult = await sendPasswordResetEmail(testEmailAddress, 'TempPass123!');
  console.log("Result:", passResult, "\n");

  console.log(`2. Testing Booking Approval Email to ${testEmailAddress}...`);
  const approvalResult = await sendBookingApprovedEmailToClub(
    testEmailAddress, 
    'CEP-101', 
    'Annual Tech Symposium', 
    '2026-07-15', 
    '10:00 AM', 
    '05:00 PM'
  );
  console.log("Result:", approvalResult, "\n");

  console.log(`3. Testing Event Report Reminder to ${testEmailAddress}...`);
  const reminderResult = await sendEventReportReminderEmail(testEmailAddress, 'Annual Tech Symposium');
  console.log("Result:", reminderResult, "\n");

  console.log("Testing complete. Check your inbox (and spam folder)!");
}

testEmailJS().catch(err => {
  console.error("Test script failed:", err);
});
