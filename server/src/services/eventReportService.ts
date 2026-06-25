import { db } from '../db';

/**
 * Checks if a club is blocked from making new bookings or creating new events
 * due to pending event reports.
 * 
 * Rules:
 * - Past events: end_date (or date) < CURRENT_DATE
 * - type: open_all or co_curricular
 * - status: active
 * - not report_exempt
 * - no corresponding row in event_reports
 * - CURRENT_DATE > Deadline
 *   where Deadline is LEAST(end_date + 7 days, last day of the end_date's month)
 */
export const checkPendingEventReports = async (clubId: string): Promise<{ blocked: boolean; message: string }> => {
  try {
    const query = `
      SELECT e.id, e.name, COALESCE(e.end_date, e.date) as final_end_date
      FROM events e
      LEFT JOIN event_reports er ON e.id = er.event_id
      WHERE e.club_id = $1
        AND e.status = 'active'
        AND e.event_type IN ('open_all', 'co_curricular')
        AND e.report_exempt = false
        AND er.id IS NULL
        AND COALESCE(e.end_date, e.date) < CURRENT_DATE
        AND CURRENT_DATE > LEAST(
          (COALESCE(e.end_date, e.date) + INTERVAL '7 days')::DATE,
          (date_trunc('month', COALESCE(e.end_date, e.date)) + INTERVAL '1 month')::DATE - 1
        )
      LIMIT 1
    `;

    const { rows } = await db.query(query, [clubId]);

    if (rows.length > 0) {
      const pendingEvent = rows[0];
      return {
        blocked: true,
        message: `You cannot proceed. An Event Report is pending for past event: "${pendingEvent.name}". Please submit the report first.`
      };
    }

    return { blocked: false, message: '' };
  } catch (error) {
    console.error('Error checking pending event reports:', error);
    // If we fail to check, default to not blocked to avoid locking them out entirely due to a bug
    return { blocked: false, message: '' };
  }
};
