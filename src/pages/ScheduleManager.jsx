import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutTemplate, 
  Plus, 
  X, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  CalendarClock,
  Trash2,
  Layers,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { muteToast } from '../services/api';
import SearchInput from '../components/SearchInput';

const ScheduleManager = () => {
  const [scheduledTemplates, setScheduledTemplates] = useState([]);
  const [allTemplates, setAllTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelector, setShowSelector] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  
  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [templatesRes, scheduledRes] = await Promise.all([
        api.get('/templates', muteToast),
        api.get('/templates?date=scheduled', muteToast)
      ]);
      const all = templatesRes.data;
      const scheduled = scheduledRes.data;
      setAllTemplates(Array.isArray(all) ? all : all?.templates || []);
      setScheduledTemplates(Array.isArray(scheduled) ? scheduled : scheduled?.templates || []);
    } catch (err) {
      console.error('Error fetching schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calendar Helpers
  const { calendarDays, monthName, year } = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const days = [];
    const prevMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
    const startDay = start.getDay(); // 0 (Sun) to 6 (Sat)
    
    // Fill previous month days
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, prevMonthEnd.getDate() - i),
        isCurrentMonth: false
      });
    }
    
    // Fill current month days
    for (let i = 1; i <= end.getDate(); i++) {
      days.push({
        date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i),
        isCurrentMonth: true
      });
    }
    
    // Fill next month days to complete grid (42 cells for 6 weeks)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i),
        isCurrentMonth: false
      });
    }
    
    return {
      calendarDays: days,
      monthName: currentMonth.toLocaleString('default', { month: 'long' }),
      year: currentMonth.getFullYear()
    };
  }, [currentMonth]);

  const getDayTemplates = (date) => {
    if (!date) return [];
    const targetStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    return scheduledTemplates.filter(t => {
      if (!t.scheduledDate) return false;
      const sDate = new Date(t.scheduledDate);
      const sDateStr = `${sDate.getUTCFullYear()}-${String(sDate.getUTCMonth() + 1).padStart(2, '0')}-${String(sDate.getUTCDate()).padStart(2, '0')}`;
      return targetStr === sDateStr;
    });
  };

  const assignTemplate = async (templateId) => {
    try {
      // Normalize to start of UTC day to ensure consistent filtering regardless of local timezone
      const normalizedDate = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()));
      await api.put(`/templates/${templateId}`, { scheduledDate: normalizedDate }, {
        successMessage: 'Template scheduled',
      });
      fetchData();
      // Optional: don't close selector so user can add multiple quickly
    } catch (err) {
      console.error('Error assigning template:', err);
    }
  };

  const removeAssignment = async (templateId) => {
    try {
      await api.put(`/templates/${templateId}`, { scheduledDate: null }, {
        successMessage: 'Schedule removed',
      });
      fetchData();
    } catch (err) {
      console.error('Error removing assignment:', err);
    }
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)));
  const goToToday = () => setCurrentMonth(new Date());

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setIsSidePanelOpen(true);
  };

  const isToday = (date) => new Date().toDateString() === date.toDateString();

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-120px)] lg:h-[calc(100vh-120px)] gap-4 lg:gap-6 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-700 custom-scrollbar">
      {/* Main Calendar View */}
      <div className="flex-1 bg-white rounded-3xl lg:rounded-[2.5rem] border border-brand-50 shadow-sm flex flex-col overflow-hidden min-h-[500px]">
        {/* Calendar Header */}
        <div className="p-4 md:p-8 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-black text-ink tracking-tight flex items-center gap-2 md:gap-3">
              <CalendarClock className="text-brand-500" size={24} md={32} />
              {monthName} <span className="text-brand-300 font-light">{year}</span>
            </h1>
            <p className="text-stone-500 text-xs md:text-sm mt-1 font-medium">Schedule creatives for the Karyakarta app calendar.</p>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2 bg-sand p-1.5 md:p-2 rounded-xl md:rounded-2xl w-full sm:w-auto justify-between sm:justify-start">
            <button onClick={prevMonth} className="p-1.5 md:p-2 hover:bg-white hover:shadow-sm rounded-lg md:rounded-xl transition-all text-slate-600"><ChevronLeft size={18} md={20} /></button>
            <button onClick={nextMonth} className="p-1.5 md:p-2 hover:bg-white hover:shadow-sm rounded-lg md:rounded-xl transition-all text-slate-600"><ChevronRight size={18} md={20} /></button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 p-4 md:p-8 pt-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-7 border-b border-brand-50 mb-4 pb-2">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} className="text-center text-[8px] md:text-[10px] font-black text-slate-400 tracking-widest">
                <span className="hidden md:inline">{day}</span>
                <span className="md:hidden">{day[0]}</span>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1 md:gap-3">
            {calendarDays.map((dayObj, i) => {
              const dayTemplates = getDayTemplates(dayObj.date);
              const today = isToday(dayObj.date);
              const selected = selectedDate && dayObj.date.toDateString() === selectedDate.toDateString();
              
              return (
                <div 
                  key={i}
                  onClick={() => handleDateClick(dayObj.date)}
                  className={`min-h-[50px] md:min-h-[120px] p-1 md:p-3 rounded-xl md:rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col items-center md:items-stretch relative group
                    ${dayObj.isCurrentMonth ? 'bg-white' : 'bg-sand opacity-40'}
                    ${today ? 'border-brand-500 shadow-xl shadow-slate-100 z-10' : 'border-brand-50 hover:border-brand-100'}
                    ${selected ? 'ring-2 ring-brand-500' : ''}
                  `}
                >
                  <div className="flex flex-col md:flex-row justify-between items-center mb-0.5 md:mb-2 min-h-[24px] md:min-h-[32px] w-full">
                    <div className={`w-5 h-5 md:w-8 md:h-8 flex items-center justify-center rounded-lg md:rounded-xl text-[10px] md:text-sm font-black transition-all
                      ${today ? 'bg-brand-500 text-white shadow-lg' : 'text-ink'}
                    `}>
                      {dayObj.date.getDate()}
                    </div>
                    
                    {/* Desktop Units Badge */}
                    {dayTemplates.length > 0 && (
                      <div className="hidden md:flex items-center gap-1.5">
                        <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                          {dayTemplates.length}
                          <span className="hidden md:inline text-[8px] opacity-70">UNITS</span>
                        </span>
                      </div>
                    )}

                    {/* Mobile Dot Indicator */}
                    {dayTemplates.length > 0 && (
                      <div className="md:hidden mt-0.5">
                        <div className="w-1 h-1 rounded-full bg-ink" />
                      </div>
                    )}
                  </div>
                  
                  {/* Mini Previews (Desktop Only) */}
                  <div className="hidden md:flex flex-1 flex-wrap gap-1 content-start overflow-hidden">
                    {dayTemplates.slice(0, 3).map((t, idx) => (
                      <div key={t._id} className="w-6 h-6 rounded-lg bg-slate-100 overflow-hidden border border-white shadow-sm shrink-0">
                         {t.imageUrl ? <img src={t.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200" />}
                      </div>
                    ))}
                    {dayTemplates.length > 3 && (
                      <div className="w-6 h-6 rounded-lg bg-ink flex items-center justify-center text-[8px] text-white font-black border border-white shadow-sm">
                        +{dayTemplates.length - 3}
                      </div>
                    )}
                  </div>

                  <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/[0.02] transition-colors rounded-xl md:rounded-3xl pointer-events-none" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Side Management Panel */}
      <AnimatePresence>
        {isSidePanelOpen && (
          <motion.div 
            initial={{ y: 100, x: 0, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, x: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, x: 0, opacity: 0, scale: 0.95 }}
            className="w-full lg:w-96 bg-white rounded-3xl lg:rounded-[2.5rem] border border-brand-50 shadow-2xl flex flex-col overflow-hidden mb-8 lg:mb-0"
          >
            <div className="p-6 md:p-8 shrink-0 bg-sand border-b border-brand-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg md:text-xl font-black text-ink">Manage Day</h3>
                <button onClick={() => setIsSidePanelOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-ink"><X size={20} /></button>
              </div>
              <p className="text-xs md:text-sm font-bold text-slate-500">
                {selectedDate?.toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-6 space-y-6 custom-scrollbar">
              {/* Scheduled List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ASSIGNED DESIGNS</h4>
                   <button 
                    onClick={() => setShowSelector(true)}
                    className="p-1.5 bg-ink text-white rounded-lg hover:scale-110 active:scale-95 transition-all shadow-lg shadow-brand-500/20"
                   >
                    <Plus size={16} />
                   </button>
                </div>

                {getDayTemplates(selectedDate).length === 0 ? (
                  <div className="py-10 md:py-12 border-2 border-dashed border-brand-50 rounded-[1.5rem] md:rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                    <Layers size={24} md={32} className="mb-2 opacity-20" />
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-tight">No designs scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getDayTemplates(selectedDate).map(t => (
                      <motion.div 
                        layout
                        key={t._id} 
                        className="flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-xl md:rounded-2xl border border-slate-50 bg-sand/50 group hover:bg-white hover:border-brand-50 transition-all"
                      >
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-lg md:rounded-xl overflow-hidden border border-brand-50 shrink-0">
                          {t.imageUrl ? <img src={t.imageUrl} className="w-full h-full object-cover" /> : <LayoutTemplate size={16} md={20} className="m-2.5 md:m-3 text-slate-200" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] md:text-xs font-black text-ink truncate uppercase">{t.name}</p>
                          <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Design Template</p>
                        </div>
                        <button 
                          onClick={() => removeAssignment(t._id)}
                          className="p-1.5 md:p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={14} md={16} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-sand rounded-2xl border border-brand-50 text-slate-500">
                <div className="flex gap-2 text-slate-400 mb-1"><Info size={14} /><span className="text-[10px] font-black uppercase tracking-widest">Platform Note</span></div>
                <p className="text-[9px] md:text-[10px] font-medium leading-relaxed">Multiple templates on the same date will appear as a gallery slider in the mobile app dashboard.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Selector Modal (Shared Overlay) */}
      <AnimatePresence>
        {showSelector && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-ink/60 backdrop-blur-md" 
              onClick={() => setShowSelector(false)} 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-4xl h-[90vh] md:h-[80vh] rounded-3xl md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 md:p-8 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-ink tracking-tight">Select Template</h2>
                    <p className="text-slate-400 text-xs md:text-sm font-medium">Browse and add designs to your schedule.</p>
                  </div>
                  <button onClick={() => setShowSelector(false)} className="p-2 md:p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={20} md={24} /></button>
                </div>
                
                <SearchInput
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-0 custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {allTemplates
                    .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(t => {
                      const isAlreadyScheduled = getDayTemplates(selectedDate).some(st => st._id === t._id);
                      
                      return (
                        <div 
                          key={t._id}
                          onClick={() => !isAlreadyScheduled && assignTemplate(t._id)}
                          className={`group flex flex-col cursor-pointer ${isAlreadyScheduled ? 'opacity-50 grayscale' : ''}`}
                        >
                           <div className="aspect-[4/5] bg-sand rounded-2xl md:rounded-[2rem] overflow-hidden border-2 border-transparent group-hover:border-brand-500 transition-all relative">
                              {t.imageUrl ? (
                                <img src={t.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-200"><LayoutTemplate size={32} md={48} /></div>
                              )}
                              <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <div className="px-4 py-2 md:px-6 md:py-3 bg-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-xl">
                                    {isAlreadyScheduled ? 'Added' : 'Select'}
                                 </div>
                              </div>
                              {isAlreadyScheduled && (
                                <div className="absolute top-3 right-3 md:top-4 md:right-4 p-1.5 md:p-2 bg-emerald-500 text-white rounded-lg md:rounded-xl shadow-lg">
                                  <Check size={14} md={16} />
                                </div>
                              )}
                           </div>
                           <p className="mt-2 md:mt-3 text-[9px] md:text-[10px] font-black text-ink text-center truncate px-2 uppercase tracking-wide">{t.name}</p>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduleManager;
