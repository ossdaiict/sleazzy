// Swap Supabase for your database pool
import { db } from '../db';

/**
 * Returns the semester date range (ISO strings) for a given date.
 * Semester 1: Jan 1 – Jun 30
 * Semester 2: Jul 1 – Dec 31
 */
export function getSemesterRange(date: Date): { start: string; end: string } {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed

    if (month <= 5) {
        // Jan–Jun
        return {
            start: `${year}-01-01T00:00:00.000Z`,
            end: `${year}-06-30T23:59:59.999Z`,
        };
    }
    // Jul–Dec
    return {
        start: `${year}-07-01T00:00:00.000Z`,
        end: `${year}-12-31T23:59:59.999Z`,
    };
}

/**
 * Counts the number of distinct co-curricular events (by batch_id) for a given
 * club within a semester range. Bookings with status 'rejected' are excluded.
 * event_type is resolved via JOIN to the events table through event_id.
 *
 * @param excludeBookingId  Optional booking id to exclude (useful when editing
 * an existing booking so it doesn't count against itself).
 */
export async function countCoCurricularBookings(
    clubId: string,
    semesterStart: string,
    semesterEnd: string,
    excludeBookingId?: string,
): Promise<number> {

    // event_type is now on the events table — JOIN through event_id
    let queryStr = `
        SELECT b.batch_id 
        FROM bookings b
        JOIN events e ON b.event_id = e.id
        WHERE b.club_id = $1 
          AND e.event_type = 'co_curricular' 
          AND b.status != 'rejected' 
          AND b.start_time >= $2 
          AND b.start_time <= $3
    `;
    const values: any[] = [clubId, semesterStart, semesterEnd];

    if (excludeBookingId) {
        values.push(excludeBookingId);
        queryStr += ` AND b.id != $${values.length}`;
    }

    try {
        const { rows } = await db.query(queryStr, values);

        // Each event may span multiple venues (same batch_id), count unique batch_ids.
        const batchIds = new Set<string>();
        let noBatchCount = 0;
        
        for (const row of rows) {
            if (row.batch_id) {
                batchIds.add(row.batch_id);
            } else {
                noBatchCount++;
            }
        }

        return batchIds.size + noBatchCount;
    } catch (error: any) {
        throw new Error(`Failed to count co-curricular bookings: ${error.message}`);
    }
}

export const CO_CURRICULAR_LIMIT = 2;