import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ShieldAlert, FileText, Users } from 'lucide-react';
import { CLUBS } from '../constants';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const PolicyPage: React.FC = () => {
  const getClubsByGroup = (group: 'A' | 'B' | 'C') => CLUBS.filter(c => c.group === group);

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center pb-6 border-b border-border/40"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">SBG Slot Booking Policy</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">Guidelines for Venue Reservation and Conduct</p>
      </motion.div>

      <Accordion type="single" collapsible defaultValue="item-0" className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <AccordionItem value="item-0" className="border-border/40 rounded-lg border bg-card/40 backdrop-blur-md">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Clock className="text-primary" size={20} />
              <span className="font-semibold text-foreground">Timeline & Booking Windows</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0">
            <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
              <li><strong className="text-foreground">Co-curricular Events:</strong> Must be booked at least <span className="text-destructive font-bold">30 days</span> in advance.</li>
              <li><strong className="text-foreground">Open-for-All Events:</strong> Must be booked at least <span className="text-destructive font-bold">20 days</span> in advance.</li>
              <li><strong className="text-foreground">Closed Club Events:</strong> Can be booked up to <span className="text-destructive font-bold">1 day</span> before the event date.</li>
              <li>Requests made outside these windows will be automatically flagged for rejection unless a special waiver is granted by the Faculty Convener.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <AccordionItem value="item-1" className="border-border/40 rounded-lg border bg-card/40 backdrop-blur-md">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-primary" size={20} />
              <span className="font-semibold text-foreground">Parallel Booking Policy</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0">
            <p className="mb-3 text-sm text-muted-foreground">To ensure maximum student participation and avoid conflict of interests, the following parallel booking rules apply:</p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
              <li>Two clubs from the <strong className="text-foreground">same group</strong> (e.g., Group A and Group A) cannot hold major events simultaneously.</li>
              <li>Parallel events are <strong className="text-foreground">permitted</strong> if the clubs belong to <strong className="text-foreground">different groups</strong> (e.g., Group A and Group C).</li>
              <li>Exceptions are made for Closed Club events (internal meetings) which do not require mass student participation.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <AccordionItem value="item-2" className="border-border/40 rounded-lg border bg-card/40 backdrop-blur-md">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <FileText className="text-primary" size={20} />
              <span className="font-semibold text-foreground">Venue Categories & Approval</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base">Category A (Auto-Approval)</CardTitle>
                  <CardDescription className="text-xs">CEP Rooms, OAT, Ground, Cafeteria</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Bookings are automatically confirmed if the slot is vacant and timeline rules are met. No manual intervention required.</p>
                </CardContent>
              </Card>
              <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base">Category B (Restricted)</CardTitle>
                  <CardDescription className="text-xs">Lecture Theatres (LT), CEP 110, CEP 102</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Always requires manual approval from the SBG Convener and Faculty Mentor. Pending status applies until approved.</p>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <AccordionItem value="item-3" className="border-border/40 rounded-lg border bg-card/40 backdrop-blur-md">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Users className="text-primary" size={20} />
              <span className="font-semibold text-foreground">Club Groups Appendix</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-2">
              <div>
                <h4 className="font-bold text-primary mb-2 border-b border-primary/30 pb-1">Group A (Tech)</h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {getClubsByGroup('A').map(c => <li key={c.name}>{c.name}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-purple-400 mb-2 border-b border-purple-400/30 pb-1">Group B (Cultural)</h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {getClubsByGroup('B').map(c => <li key={c.name}>{c.name}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-green-400 mb-2 border-b border-green-400/30 pb-1">Group C (Sports)</h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {getClubsByGroup('C').map(c => <li key={c.name}>{c.name}</li>)}
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        </motion.div>
      </Accordion>
    </div>
  );
};

export default PolicyPage;
