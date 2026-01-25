import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Info, ShieldAlert, Users } from 'lucide-react';
import { CLUBS } from '../constants';

interface AccordionItemProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, icon, children, isOpen, onToggle }) => {
  return (
    <div className={`border rounded-xl transition-all ${isOpen ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-white'}`}>
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          {icon && <div className={`${isOpen ? 'text-blue-600' : 'text-slate-400'}`}>{icon}</div>}
          <span className={`font-semibold ${isOpen ? 'text-blue-900' : 'text-slate-700'}`}>{title}</span>
        </div>
        {isOpen ? <ChevronUp size={20} className="text-blue-500" /> : <ChevronDown size={20} className="text-slate-400" />}
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-0 text-slate-600 text-sm leading-relaxed border-t border-transparent">
          <div className="pl-9">{children}</div>
        </div>
      )}
    </div>
  );
};

const PolicyPage: React.FC = () => {
  const [openSection, setOpenSection] = useState<number | null>(0);

  const toggleSection = (index: number) => {
    setOpenSection(openSection === index ? null : index);
  };

  const getClubsByGroup = (group: 'A' | 'B' | 'C') => CLUBS.filter(c => c.group === group);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center pb-6 border-b border-slate-200">
        <h1 className="text-3xl font-bold text-slate-800">SBG Slot Booking Policy</h1>
        <p className="text-slate-500 mt-2">Guidelines for Venue Reservation and Conduct</p>
      </div>

      <div className="space-y-4">
        <AccordionItem 
          title="Timeline & Booking Windows" 
          icon={<ClockIcon />}
          isOpen={openSection === 0}
          onToggle={() => toggleSection(0)}
        >
          <ul className="list-disc pl-4 space-y-2">
            <li><strong>Co-curricular Events:</strong> Must be booked at least <span className="text-red-600 font-bold">30 days</span> in advance.</li>
            <li><strong>Open-for-All Events:</strong> Must be booked at least <span className="text-red-600 font-bold">20 days</span> in advance.</li>
            <li><strong>Closed Club Events:</strong> Can be booked up to <span className="text-red-600 font-bold">1 day</span> before the event date.</li>
            <li>Requests made outside these windows will be automatically flagged for rejection unless a special waiver is granted by the Faculty Convener.</li>
          </ul>
        </AccordionItem>

        <AccordionItem 
          title="Parallel Booking Policy" 
          icon={<ShieldAlert size={20} />}
          isOpen={openSection === 1}
          onToggle={() => toggleSection(1)}
        >
          <p className="mb-3">To ensure maximum student participation and avoid conflict of interests, the following parallel booking rules apply:</p>
          <ul className="list-disc pl-4 space-y-2">
            <li>Two clubs from the <strong>same group</strong> (e.g., Group A and Group A) cannot hold major events simultaneously.</li>
            <li>Parallel events are <strong>permitted</strong> if the clubs belong to <strong>different groups</strong> (e.g., Group A and Group C).</li>
            <li>Exceptions are made for Closed Club events (internal meetings) which do not require mass student participation.</li>
          </ul>
        </AccordionItem>

        <AccordionItem 
          title="Venue Categories & Approval" 
          icon={<FileText size={20} />}
          isOpen={openSection === 2}
          onToggle={() => toggleSection(2)}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="bg-white border border-slate-200 p-4 rounded-lg">
              <h4 className="font-bold text-slate-800 mb-2">Category A (Auto-Approval)</h4>
              <p className="text-xs text-slate-500 mb-2">CEP Rooms, OAT, Ground, Cafeteria</p>
              <p>Bookings are automatically confirmed if the slot is vacant and timeline rules are met. No manual intervention required.</p>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-lg">
              <h4 className="font-bold text-slate-800 mb-2">Category B (Restricted)</h4>
              <p className="text-xs text-slate-500 mb-2">Lecture Theatres (LT), CEP 110, CEP 102</p>
              <p>Always requires manual approval from the SBG Convener and Faculty Mentor. Pending status applies until approved.</p>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem 
          title="Club Groups Appendix" 
          icon={<Users size={20} />}
          isOpen={openSection === 3}
          onToggle={() => toggleSection(3)}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
             <div>
               <h4 className="font-bold text-blue-700 mb-2 border-b border-blue-100 pb-1">Group A (Tech)</h4>
               <ul className="space-y-1 text-xs text-slate-600">
                 {getClubsByGroup('A').map(c => <li key={c.name}>{c.name}</li>)}
               </ul>
             </div>
             <div>
               <h4 className="font-bold text-purple-700 mb-2 border-b border-purple-100 pb-1">Group B (Cultural)</h4>
               <ul className="space-y-1 text-xs text-slate-600">
                 {getClubsByGroup('B').map(c => <li key={c.name}>{c.name}</li>)}
               </ul>
             </div>
             <div>
               <h4 className="font-bold text-green-700 mb-2 border-b border-green-100 pb-1">Group C (Sports)</h4>
               <ul className="space-y-1 text-xs text-slate-600">
                 {getClubsByGroup('C').map(c => <li key={c.name}>{c.name}</li>)}
               </ul>
             </div>
          </div>
        </AccordionItem>
      </div>
    </div>
  );
};

// Helper component
const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

export default PolicyPage;