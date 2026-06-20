import * as XLSX from 'xlsx';
import { ClubMember } from '../types';

export interface ExportClubMember extends ClubMember {
  club_name: string;
}

export function exportRosterToExcel(members: ExportClubMember[]) {
  // Group members by club_name
  const grouped: Record<string, ExportClubMember[]> = {};
  for (const m of members) {
    const club = m.club_name || 'Unassigned';
    if (!grouped[club]) {
      grouped[club] = [];
    }
    grouped[club].push(m);
  }

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Excel sheet names cannot exceed 31 chars and cannot contain: \ / ? * [ ] :
  const cleanSheetName = (name: string) => {
    return name.replace(/[\\/?*\[\]:]/g, '').substring(0, 31);
  };

  const getUniqueSheetName = (name: string, seen: Set<string>) => {
    let cleaned = cleanSheetName(name);
    if (!cleaned) cleaned = 'Sheet';
    let candidate = cleaned;
    let counter = 1;
    while (seen.has(candidate.toLowerCase())) {
      const suffix = ` (${counter})`;
      candidate = cleaned.substring(0, 31 - suffix.length) + suffix;
      counter++;
    }
    seen.add(candidate.toLowerCase());
    return candidate;
  };

  const seenSheets = new Set<string>();

  for (const [clubName, clubMembers] of Object.entries(grouped)) {
    // Format member data for the worksheet columns
    const sheetData = clubMembers.map(m => {
      const isPast = m.tenure_end_date && new Date(m.tenure_end_date) < new Date(new Date().setHours(0, 0, 0, 0));
      const statusText = isPast ? 'Past / Resigned' : 'Active';
      const sDate = m.tenure_start_date ? new Date(m.tenure_start_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
      const eDate = m.tenure_end_date ? new Date(m.tenure_end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Present';
      const historyText = m.promotion_history ? m.promotion_history.replace(/\n/g, ' | ') : 'No history';

      return {
        'Full Name': m.full_name,
        'Designation': m.designation || 'Core',
        'Roll Number': m.roll_number ?? 'N/A',
        'Email': m.email ?? 'N/A',
        'Phone Number': m.phone ?? 'N/A',
        'Tenure Start': sDate,
        'Tenure End': eDate,
        'Departure Reason': m.tenure_end_reason ?? 'N/A',
        'Designation History': historyText,
        'Status': statusText
      };
    });

    const ws = XLSX.utils.json_to_sheet(sheetData);

    // Calculate dynamic column width for Designation History to fit content nicely
    let maxHistoryLen = 30;
    clubMembers.forEach(m => {
      const hText = m.promotion_history ? m.promotion_history.replace(/\n/g, ' | ') : 'No history';
      if (hText.length > maxHistoryLen) {
        maxHistoryLen = hText.length;
      }
    });
    const historyColWidth = Math.min(Math.max(maxHistoryLen + 6, 30), 150);

    // Set custom column widths (in characters)
    ws['!cols'] = [
      { wch: 25 }, // Full Name
      { wch: 20 }, // Designation
      { wch: 15 }, // Roll Number
      { wch: 30 }, // Email
      { wch: 18 }, // Phone Number
      { wch: 18 }, // Tenure Start
      { wch: 18 }, // Tenure End
      { wch: 22 }, // Departure Reason
      { wch: historyColWidth }, // Designation History
      { wch: 20 }  // Status
    ];

    const sheetName = getUniqueSheetName(clubName, seenSheets);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // Download the true binary xlsx file
  XLSX.writeFile(wb, `sleazzy_committee_rosters_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
