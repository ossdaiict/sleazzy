import cron from 'node-cron';
import { db } from '../db';

export const startCronJobs = () => {
  // Run every day at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('Running daily event report reminder check...');
    try {
      // Send reminder if:
      // 1. Exactly 7 days have passed since the event ended, OR
      // 2. It's the 1st day of a new month and the event ended in a prior month
      const query = `
        SELECT e.name, c.email, c.name as club_name
        FROM events e
        JOIN clubs c ON e.club_id = c.id
        LEFT JOIN event_reports er ON e.id = er.event_id
        WHERE e.status = 'active'
          AND e.event_type IN ('open_all', 'co_curricular')
          AND e.report_exempt = false
          AND er.id IS NULL
          AND (
            -- Condition 1: Exactly 7 days after the event ended
            CURRENT_DATE = (COALESCE(e.end_date, e.date) + INTERVAL '7 days')::DATE
            OR
            -- Condition 2: First day of the new month, event ended in a previous month
            (
              EXTRACT(DAY FROM CURRENT_DATE) = 1
              AND COALESCE(e.end_date, e.date) < DATE_TRUNC('month', CURRENT_DATE)
              AND CURRENT_DATE > (COALESCE(e.end_date, e.date) + INTERVAL '7 days')::DATE
            )
          )
      `;

      const { rows } = await db.query(query);

      for (const row of rows) {
        // Send email to club
        console.log(`Sending reminder email to ${row.email} for event ${row.name}`);
        
        // Dynamic import to avoid circular dependencies if any, though regular import is fine too.
        const { sendEventReportReminderEmail } = await import('./email');
        await sendEventReportReminderEmail(row.email, row.name);
      }
    } catch (error) {
      console.error('Error running event report reminder cron:', error);
    }
  });

  // Run every day at 2:00 AM to clean up old notifications
  cron.schedule('0 2 * * *', async () => {
    console.log('Running daily notification cleanup...');
    try {
      const result = await db.query(`
        DELETE FROM notifications 
        WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
      `);
      console.log(`Deleted ${result.rowCount} notifications older than 7 days.`);
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  });
};
