import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Users,
    Mail,
    Phone,
    Calendar,
    Layers,
    Search,
    Shield,
    ArrowRight,
    Globe,
    Linkedin,
    Instagram,
    Youtube,
    Menu,
    X,
    Building2,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '../components/ui/dialog';
import { apiRequest } from '../lib/api';
import { toastError } from '../lib/toast';
import { ThemeToggle } from '../components/theme-toggle';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Logo } from '../components/Logo';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';

import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';


interface Club {
    id: string;
    name: string;
    email: string;
    group_category: string;
    description?: string;
    key_activities?: string;
    linkedin_url?: string;
    instagram_url?: string;
    youtube_url?: string;
    website_url?: string;
    logo_url?: string;
    organization_type: string;
    member_tag?: string;
}

interface CommitteeMember {
    id: string;
    club_id: string;
    club_name: string;
    full_name: string;
    designation: 'Convener' | 'Dy. Convener' | 'Core' | 'Others';
    phone: string | null;
    tenure_start_date: string | null;
    tenure_end_date: string | null;
}

const DESIGNATION_ORDER = {
    'Convener': 1,
    'Dy. Convener': 2,
    'Core': 3,
    'Others': 4,
};

const DESIGNATION_BADGES = {
    'Convener': 'bg-brand/10 text-brand border-brand/20',
    'Dy. Convener': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    'Core': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

const DEFAULT_BADGE_STYLE = 'bg-slate-500/10 text-slate-500 border-slate-500/20';

const ClubsCommitteesPage: React.FC<{ onGoToLogin: () => void }> = ({ onGoToLogin }) => {
    const navigate = useNavigate();
    const [clubs, setClubs] = useState<Club[]>([]);
    const [members, setMembers] = useState<CommitteeMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'club' | 'committee' | 'organisation'>('club');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClubForModal, setSelectedClubForModal] = useState<Club | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const headerRef = useRef<HTMLElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isMobileMenuOpen && headerRef.current && !headerRef.current.contains(event.target as Node)) {
                setIsMobileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMobileMenuOpen]);

    const selectedClubMembers = useMemo(() => {
        if (!selectedClubForModal) return [];
        let clubMems = members.filter(m => m.club_id === selectedClubForModal.id);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            clubMems = clubMems.filter(m =>
                m.full_name.toLowerCase().includes(q) ||
                (m.designation && m.designation.toLowerCase().includes(q))
            );
            // If the query matched the club name/tag, don't filter out members. 
            // Only filter members if the query didn't match the club.
            const matchesClub = selectedClubForModal.name.toLowerCase().includes(q) ||
                selectedClubForModal.email.toLowerCase().includes(q) ||
                (!!selectedClubForModal.member_tag && selectedClubForModal.member_tag.toLowerCase().includes(q));
            if (matchesClub) {
                return members.filter(m => m.club_id === selectedClubForModal.id);
            }
        }
        return clubMems;
    }, [members, selectedClubForModal, searchQuery]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [clubsData, membersData] = await Promise.all([
                    apiRequest<Club[]>('/api/clubs'),
                    apiRequest<CommitteeMember[]>('/api/club-members/public'),
                ]);
                setClubs(clubsData);
                setMembers(membersData);
            } catch (err) {
                toastError(err, 'Failed to load directories');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Close mobile menu on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (isMobileMenuOpen) {
                setIsMobileMenuOpen(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isMobileMenuOpen]);

    const filteredClubs = useMemo(() => {
        return clubs.filter(c => {
            if (c.organization_type === 'other') return false;

            const q = searchQuery.toLowerCase();
            const matchesClub = c.name.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q) ||
                (!!c.member_tag && c.member_tag.toLowerCase().includes(q));

            const hasMatchingMember = members.some(m => m.club_id === c.id && (
                m.full_name.toLowerCase().includes(q) ||
                (m.designation && m.designation.toLowerCase().includes(q))
            ));

            const matchesSearch = matchesClub || hasMatchingMember;
            const matchesTab = c.organization_type === activeTab;

            return matchesSearch && matchesTab;
        });
    }, [clubs, members, searchQuery, activeTab]);

    const groupedCommittees = useMemo(() => {
        const groups: Record<string, CommitteeMember[]> = {};
        for (const m of members) {
            // Filter by search query if present
            const matchesQuery = searchQuery === '' ||
                m.club_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.designation && m.designation.toLowerCase().includes(searchQuery.toLowerCase()));

            if (matchesQuery) {
                const clubName = m.club_name;
                if (!groups[clubName]) {
                    groups[clubName] = [];
                }
                groups[clubName].push(m);
            }
        }
        return groups;
    }, [members, searchQuery]);

    const formatTenure = (start?: string | null, end?: string | null) => {
        if (!start && !end) return 'Not Specified';
        const sStr = start ? new Date(start).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'N/A';
        const eStr = end ? new Date(end).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'Present';
        return `${sStr} – ${eStr}`;
    };

    return (
        <div className="min-h-screen bg-bgMain pb-16">
            <header ref={headerRef} className="sticky top-0 z-30 bg-bgMain/80 backdrop-blur-xl border-b border-borderSoft/40">
                <div className="flex items-center justify-between px-3 sm:px-6 py-3 max-w-7xl mx-auto">
                    {/* Left: Logo & Nav Links */}
                    <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                        <div className="shrink-0">
                            <Logo size="md" />
                        </div>

                        {/* Desktop Nav Links */}
                        <div className="hidden md:flex items-center gap-1 sm:gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/')}
                                className="rounded-xl h-10 px-2.5 sm:px-4 font-semibold text-textSecondary hover:text-textPrimary hover:bg-hoverSoft transition-all text-xs sm:text-sm"
                            >
                                Home
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/about-sbg')}
                                className="rounded-xl h-10 px-2.5 sm:px-4 font-semibold text-textSecondary hover:text-textPrimary hover:bg-hoverSoft transition-all text-xs sm:text-sm"
                            >
                                About SBG
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/clubs-committees')}
                                className="rounded-xl h-10 px-2.5 sm:px-4 font-semibold text-brand bg-brand/5 hover:bg-brand/10 transition-all text-xs sm:text-sm"
                            >
                                <span className="hidden sm:inline">Clubs & Committees</span>
                                <span className="sm:hidden">Clubs</span>
                            </Button>
                        </div>
                    </div>

                    {/* Right: Utilities */}
                    <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
                        <ThemeToggle />

                        {/* Sign In (Desktop Only) */}
                        <div className="hidden md:block">
                            <Button
                                onClick={onGoToLogin}
                                className="rounded-xl h-10 px-3 sm:px-6 font-semibold bg-brand text-white hover:bg-brandLink transition-all shadow-md shadow-brand/20 hover:shadow-lg hover:shadow-brand/30 gap-1 text-xs sm:text-sm"
                            >
                                <span>Sign In</span>
                                <ArrowRight size={14} className="hidden sm:inline" />
                            </Button>
                        </div>

                        {/* Mobile Hamburger Button */}
                        <Button
                            variant="ghost"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 rounded-xl border border-borderSoft/40 bg-hoverSoft/20 text-textPrimary hover:bg-hoverSoft/40 transition-all"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </Button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="md:hidden border-t border-borderSoft/40 bg-bgMain/95 backdrop-blur-xl overflow-hidden"
                        >
                            <div className="flex flex-col gap-2 p-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        navigate('/');
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="justify-start rounded-xl h-11 px-4 font-semibold text-textSecondary hover:text-textPrimary hover:bg-hoverSoft transition-all text-sm w-full"
                                >
                                    Home
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        navigate('/about-sbg');
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="justify-start rounded-xl h-11 px-4 font-semibold text-textSecondary hover:text-textPrimary hover:bg-hoverSoft transition-all text-sm w-full"
                                >
                                    About SBG
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        navigate('/clubs-committees');
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="justify-start rounded-xl h-11 px-4 font-semibold text-brand bg-brand/5 hover:bg-brand/10 transition-all text-sm w-full"
                                >
                                    Clubs & Committees
                                </Button>
                                <Button
                                    onClick={() => {
                                        onGoToLogin();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="justify-center rounded-xl h-11 px-4 font-semibold bg-brand text-white hover:bg-brandLink transition-all shadow-md shadow-brand/20 hover:shadow-lg hover:shadow-brand/30 gap-1.5 text-sm w-full mt-2"
                                >
                                    <span>Sign In</span>
                                    <ArrowRight size={16} />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* ====== Hero Section ====== */}
            <section className="relative z-10 text-center px-4 sm:px-6 pt-12 pb-8 max-w-4xl mx-auto">
                <motion.h1
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-textPrimary pb-2"
                >
                    Clubs & Committees
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-4 text-base sm:text-lg text-textSecondary max-w-xl mx-auto font-medium"
                >
                    Explore campus student organizations and active leadership in one place.
                </motion.p>
            </section>

            {/* ====== Tabs & Search Controls ====== */}
            <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 mb-8 space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    {/* Framer motion segment tabs control */}
                    <div className="flex flex-wrap sm:flex-nowrap bg-hoverSoft/50 p-1 rounded-xl border border-borderSoft/40 w-full sm:w-auto self-start gap-1 sm:gap-0">
                        {(['club', 'committee', 'organisation'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
                                className={`
                                    relative px-3 sm:px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex-1 sm:flex-none sm:w-auto capitalize cursor-pointer min-w-max
                                    ${activeTab === tab ? 'text-brand' : 'text-textMuted hover:text-textPrimary'}
                                `}
                            >
                                {activeTab === tab && (
                                    <motion.div
                                        layoutId="active-directory-tab"
                                        className="absolute inset-0 bg-card border border-borderSoft rounded-lg shadow-sm"
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center justify-center gap-1.5">
                                    {tab === 'club' ? <Layers size={15} /> : tab === 'committee' ? <Users size={15} /> : <Building2 size={15} />}
                                    {tab}s
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search filter input */}
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted h-4 w-4" />
                        <Input
                            placeholder={`Search ${activeTab}s...`}
                            className="pl-9 bg-card border-borderSoft/60 focus:border-brand rounded-xl h-10 w-full"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </section>

            {/* ====== Club Committee Roster Modal ====== */}
            <Dialog open={!!selectedClubForModal} onOpenChange={(open) => !open && setSelectedClubForModal(null)}>
                <DialogContent className="w-[95vw] max-w-[95vw] sm:w-full sm:max-w-xl p-4 sm:p-6 rounded-2xl max-h-[85vh] overflow-y-auto bg-card">
                    <DialogHeader className="border-b border-borderSoft/40 pb-4 flex flex-row items-center gap-3 sm:gap-4 space-y-0">
                        <Avatar className={cn("h-14 w-14 border border-borderSoft rounded-2xl shrink-0 bg-white")}>
                            <AvatarImage src={selectedClubForModal?.logo_url || ''} alt={selectedClubForModal?.name} className="object-contain p-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]" />
                            <AvatarFallback className="bg-brand text-white font-bold text-lg rounded-2xl flex items-center justify-center">
                                {selectedClubForModal?.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-xl font-bold text-textPrimary leading-tight">
                                {selectedClubForModal?.name}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-textMuted mt-1">
                                {selectedClubForModal?.member_tag}
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <Tabs defaultValue="about" className="w-full mt-4">
                        <TabsList className="grid w-full grid-cols-2 mb-4 bg-hoverSoft/50 p-1 rounded-xl">
                            <TabsTrigger value="about" className="rounded-lg py-1.5 text-sm font-medium cursor-pointer">About</TabsTrigger>
                            <TabsTrigger value="members" className="rounded-lg py-1.5 text-sm font-medium cursor-pointer">Members</TabsTrigger>
                        </TabsList>

                        <TabsContent value="members" className="min-h-[250px] max-h-[50vh] flex flex-col focus-visible:outline-none focus-visible:ring-0 mt-0">
                            <div className="flex items-center justify-between px-1 mb-3 shrink-0">
                                <span className="text-xs font-semibold text-textMuted uppercase tracking-wider">Members</span>
                                <span className="text-xs text-textMuted font-medium">{selectedClubMembers.length} member{selectedClubMembers.length !== 1 ? 's' : ''}</span>
                            </div>

                            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                                {selectedClubMembers.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-textMuted bg-hoverSoft/20 rounded-xl border border-dashed border-borderSoft p-6">
                                        No members listed for this club.
                                    </div>
                                ) : (
                                    selectedClubMembers.map(member => (
                                        <div
                                            key={member.id}
                                            className="p-3.5 rounded-xl border border-borderSoft/60 bg-hoverSoft/15 hover:bg-hoverSoft/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-textPrimary text-sm sm:text-base">{member.full_name}</span>
                                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${DESIGNATION_BADGES[member.designation as keyof typeof DESIGNATION_BADGES] || DEFAULT_BADGE_STYLE}`}>
                                                        {member.designation}
                                                    </span>
                                                </div>
                                            </div>

                                            {member.phone && (
                                                <a
                                                    href={`tel:${member.phone}`}
                                                    className="h-8 px-3 rounded-lg border border-borderSoft/60 bg-background hover:bg-hoverSoft hover:text-brand text-xs font-semibold text-textSecondary flex items-center gap-1.5 self-start sm:self-center transition-all shadow-sm"
                                                >
                                                    <Phone size={12} />
                                                    {member.phone}
                                                </a>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="about" className="min-h-[250px] max-h-[50vh] flex flex-col focus-visible:outline-none focus-visible:ring-0 mt-0">
                            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Description</span>
                                    <p className="text-sm text-textSecondary leading-relaxed bg-hoverSoft/15 border border-borderSoft/60 rounded-xl p-3.5 whitespace-pre-wrap">
                                        {selectedClubForModal?.description || "Description not available."}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Key Activities & Events</span>
                                    <p className="text-sm text-textSecondary leading-relaxed bg-hoverSoft/15 border border-borderSoft/60 rounded-xl p-3.5 whitespace-pre-wrap">
                                        {selectedClubForModal?.key_activities || "Key activities not available."}
                                    </p>
                                </div>
                                {(selectedClubForModal?.website_url ||
                                    selectedClubForModal?.linkedin_url ||
                                    selectedClubForModal?.instagram_url ||
                                    selectedClubForModal?.youtube_url) && (
                                        <div className="space-y-2">
                                            <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Links & Socials</span>
                                            <div className="flex flex-wrap gap-2 bg-hoverSoft/15 border border-borderSoft/60 rounded-xl p-3.5">
                                                {selectedClubForModal?.website_url && (
                                                    <a
                                                        href={selectedClubForModal.website_url.startsWith('http') ? selectedClubForModal.website_url : `https://${selectedClubForModal.website_url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-borderSoft/60 bg-background hover:bg-hoverSoft hover:text-brand text-xs font-semibold text-textSecondary transition-all shadow-sm"
                                                    >
                                                        <Globe size={13} className="text-textMuted" />
                                                        Website
                                                    </a>
                                                )}
                                                {selectedClubForModal?.linkedin_url && (
                                                    <a
                                                        href={selectedClubForModal.linkedin_url.startsWith('http') ? selectedClubForModal.linkedin_url : `https://${selectedClubForModal.linkedin_url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-borderSoft/60 bg-background hover:bg-hoverSoft hover:text-brand text-xs font-semibold text-textSecondary transition-all shadow-sm"
                                                    >
                                                        <Linkedin size={13} className="text-textMuted" />
                                                        LinkedIn
                                                    </a>
                                                )}
                                                {selectedClubForModal?.instagram_url && (
                                                    <a
                                                        href={selectedClubForModal.instagram_url.startsWith('http') ? selectedClubForModal.instagram_url : `https://${selectedClubForModal.instagram_url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-borderSoft/60 bg-background hover:bg-hoverSoft hover:text-brand text-xs font-semibold text-textSecondary transition-all shadow-sm"
                                                    >
                                                        <Instagram size={13} className="text-textMuted" />
                                                        Instagram
                                                    </a>
                                                )}
                                                {selectedClubForModal?.youtube_url && (
                                                    <a
                                                        href={selectedClubForModal.youtube_url.startsWith('http') ? selectedClubForModal.youtube_url : `https://${selectedClubForModal.youtube_url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-borderSoft/60 bg-background hover:bg-hoverSoft hover:text-brand text-xs font-semibold text-textSecondary transition-all shadow-sm"
                                                    >
                                                        <Youtube size={13} className="text-textMuted" />
                                                        YouTube
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </div>
                        </TabsContent>

                        {selectedClubForModal?.email && (
                            <div className="pt-4 border-t border-borderSoft/40 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 text-center sm:text-left">
                                <span className="text-xs text-textMuted">Have questions or want to join?</span>
                                <Button
                                    onClick={() => {
                                        window.location.href = `mailto:${selectedClubForModal.email}`;
                                    }}
                                    className="rounded-xl h-9 px-4 text-xs font-semibold bg-brand text-white hover:bg-brandLink w-full sm:w-auto cursor-pointer"
                                >
                                    <Mail size={13} className="mr-1.5" />
                                    Email Contact
                                </Button>
                            </div>
                        )}
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* ====== Content Display ====== */}
            <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-32 rounded-xl bg-hoverSoft/30 border border-borderSoft animate-pulse" />
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                        >
                            {filteredClubs.length === 0 ? (
                                <div className="col-span-full py-16 text-center text-textMuted">
                                    No {activeTab}s found matching your search.
                                </div>
                            ) : (
                                filteredClubs.map(club => (
                                    <motion.div
                                        key={club.id}
                                        whileHover={{ y: -4 }}
                                        className="rounded-2xl border border-borderSoft bg-card/60 backdrop-blur shadow-sm hover:shadow-md p-5 flex flex-col justify-between transition-all group"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className={cn("h-10 w-10 border border-borderSoft rounded-xl shrink-0 bg-white")}>
                                                    <AvatarImage src={club.logo_url || ''} alt={club.name} className="object-contain p-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]" />
                                                    <AvatarFallback className="bg-brand/10 text-brand font-bold text-sm rounded-xl flex items-center justify-center">
                                                        {club.name.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h3 className="font-bold text-base text-textPrimary tracking-tight transition-colors">{club.name}</h3>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-5 pt-3 border-t border-borderSoft/30 flex items-center justify-between">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.location.href = `mailto:${club.email}`;
                                                }}
                                                className="text-xs font-semibold text-textSecondary hover:text-brand flex items-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                <Mail size={13} />
                                                Contact {club.name.toLowerCase().includes('committee') ? 'Committee' : 'Club'}
                                            </button>
                                            <button
                                                onClick={() => setSelectedClubForModal(club)}
                                                className="text-[11px] font-semibold text-brand flex items-center gap-0.5 hover:underline cursor-pointer"
                                            >
                                                About {club.name.toLowerCase().includes('committee') ? 'Committee' : 'Club'}
                                                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>
        </div>
    );
};

export default ClubsCommitteesPage;
