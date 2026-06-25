import cron from 'node-cron';
import { db } from '../db';
import { sendApprovalNotification } from './email'; // Reusing email service logic if possible, or using nodemailer

export const startCronJobs = () => {
  // Run every day at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('Running daily event report reminder check...');
    try {
      // Find events exactly 7 days past their end_date without a report
      const query = `
        SELECT e.name, c.email, c.name as club_name
        FROM events e
        JOIN clubs c ON e.club_id = c.id
        LEFT JOIN event_reports er ON e.id = er.event_id
        WHERE e.status = 'active'
          AND e.event_type IN ('open_all', 'co_curricular')
          AND e.report_exempt = false
          AND er.id IS NULL
          AND CURRENT_DATE = (COALESCE(e.end_date, e.date) + INTERVAL '7 days')::DATE
      `;

      const { rows } = await db.query(query);

      for (const row of rows) {
        // Send email to club
        // In a real app with proper EmailJS, you'd trigger a specific template.
        console.log(`Sending reminder email to ${row.email} for event ${row.name}`);
        // Since EmailJS is primarily client-side but we have a nodejs wrapper,
        // we can send a custom message if a template is set up.
        // If not set up, this log serves as the trigger point.
        /* 
        await sendApprovalNotification([{
          venueName: 'Report Reminder',
          eventName: row.name,
          startTime: '',
          endTime: '',
          clubName: row.club_name,
        }]); 
        */
      }
    } catch (error) {
      console.error('Error running event report reminder cron:', error);
    }
  });
};
