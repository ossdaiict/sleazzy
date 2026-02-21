import { supabase } from '../supabaseClient';

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
 * club within a semester range.  Bookings with status 'rejected' are excluded.
 *
 * @param excludeBookingId  Optional booking id to exclude (useful when editing
 *                          an existing booking so it doesn't count against itself).
 */
export async function countCoCurricularBookings(
    clubId: string,
    semesterStart: string,
    semesterEnd: string,
    excludeBookingId?: string,
): Promise<number> {
    let query = supabase
        .from('bookings')
        .select('batch_id', { count: 'exact' })
        .eq('club_id', clubId)
        .eq('event_type', 'co_curricular')
        .neq('status', 'rejected')
        .gte('start_time', semesterStart)
        .lte('start_time', semesterEnd);

    if (excludeBookingId) {
        query = query.neq('id', excludeBookingId);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Failed to count co-curricular bookings: ${error.message}`);
    }

    // Each event may span multiple venues (same batch_id), so we count unique
    // batch_ids.  Bookings without a batch_id are treated as individual events.
    const batchIds = new Set<string>();
    let noBatchCount = 0;
    for (const row of data ?? []) {
        if (row.batch_id) {
            batchIds.add(row.batch_id);
        } else {
            noBatchCount++;
        }
    }

    return batchIds.size + noBatchCount;
}

export const CO_CURRICULAR_LIMIT = 2;
