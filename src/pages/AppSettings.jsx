import React, { useState, useEffect } from 'react';
import { Settings2, Save, Type, List, Plus, Trash2, Info, Shield, HelpCircle, Mail, Link, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import api, { muteToast } from '../services/api';

const AppSettings = () => {
  const [settings, setSettings] = useState({
    heroHeadline1: '',
    heroHeadline2: '',
    marqueeText: [],
    privacyPolicy: '',
    termsAndConditions: '',
    aboutUs: '',
    faq: [],
    customerCareEmail: '',
    inviteMessage: '',
    storeLink: '',
    // SMTP
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    smtpFromEmail: '',
    // Templates
    welcomeEmailTemplate: { subject: '', body: '' },
    purchaseEmailTemplate: { subject: '', body: '' }
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newMarquee, setNewMarquee] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  // FAQ State
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings', muteToast);
      // Merge with default values to avoid errors if some fields are missing
      setSettings(prev => ({
        ...prev,
        ...res.data,
        welcomeEmailTemplate: res.data.welcomeEmailTemplate || { subject: '', body: '' },
        purchaseEmailTemplate: res.data.purchaseEmailTemplate || { subject: '', body: '' }
      }));
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.put('/settings', settings, { successMessage: 'Settings updated successfully' });
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const addMarqueeItem = () => {
    if (!newMarquee.trim()) return;
    setSettings({
      ...settings,
      marqueeText: [...settings.marqueeText, newMarquee.trim()]
    });
    setNewMarquee('');
  };

  const removeMarqueeItem = (index) => {
    const updated = [...settings.marqueeText];
    updated.splice(index, 1);
    setSettings({ ...settings, marqueeText: updated });
  };

  const addFaqItem = () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
    setSettings({
      ...settings,
      faq: [...settings.faq, { ...newFaq }]
    });
    setNewFaq({ question: '', answer: '' });
  };

  const removeFaqItem = (index) => {
    const updated = [...settings.faq];
    updated.splice(index, 1);
    setSettings({ ...settings, faq: updated });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
         <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
        activeTab === id 
        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' 
        : 'bg-white text-stone-500 hover:bg-brand-50'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink tracking-tight">App Settings</h1>
          <p className="text-stone-500 mt-1">Manage BJP Karyakarta configuration, policies, and support content.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bk-btn px-8 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save size={20} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs Layout */}
      <div className="flex flex-wrap gap-3 mb-8">
        <TabButton id="general" label="General UI" icon={Type} />
        <TabButton id="legal" label="Legal & About" icon={Shield} />
        <TabButton id="faq" label="FAQ Manager" icon={HelpCircle} />
        <TabButton id="support" label="Support & Social" icon={Mail} />
        <TabButton id="email" label="Email Config" icon={Mail} />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* GENERAL TAB */}
        {activeTab === 'general' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Hero Section Headlines */}
            <section className="bg-white p-8 rounded-[2.5rem] border border-brand-50 shadow-sm">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-sand rounded-xl flex items-center justify-center text-ink border border-brand-50">
                     <Type size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-ink">Dashboard Hero Headlines</h3>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Headline Line 1</label>
                     <input 
                        type="text" 
                        value={settings.heroHeadline1}
                        onChange={(e) => setSettings({ ...settings, heroHeadline1: e.target.value })}
                        placeholder="e.g. INTEGRATED ALL-IN-ONE"
                        className="w-full bg-sand border-none rounded-2xl px-5 py-4 font-bold text-ink focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                     />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Headline Line 2</label>
                     <input 
                        type="text" 
                        value={settings.heroHeadline2}
                        onChange={(e) => setSettings({ ...settings, heroHeadline2: e.target.value })}
                        placeholder="e.g. BUSINESS SOLUTIONS"
                        className="w-full bg-sand border-none rounded-2xl px-5 py-4 font-bold text-ink focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                     />
                  </div>
               </div>
            </section>

            {/* Marquee Ticker */}
            <section className="bg-white p-8 rounded-[2.5rem] border border-brand-50 shadow-sm">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-sand rounded-xl flex items-center justify-center text-ink border border-brand-50">
                     <List size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-ink">News Ticker (Marquee)</h3>
               </div>
               
               <div className="space-y-4">
                  <div className="flex gap-3">
                     <input 
                        type="text" 
                        value={newMarquee}
                        onChange={(e) => setNewMarquee(e.target.value)}
                        placeholder="Add a news item or update message..."
                        className="flex-1 bg-sand border-none rounded-2xl px-5 py-4 font-bold text-ink focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                        onKeyPress={(e) => e.key === 'Enter' && addMarqueeItem()}
                     />
                     <button 
                        onClick={addMarqueeItem}
                        className="bg-ink text-white px-6 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all text-sm flex items-center gap-2"
                     >
                        <Plus size={18} />
                        Add
                     </button>
                  </div>

                  <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                     {settings.marqueeText.length === 0 ? (
                        <p className="text-center py-10 text-slate-400 font-bold italic">No ticker items added yet.</p>
                     ) : (
                        settings.marqueeText.map((text, idx) => (
                           <div key={idx} className="flex items-center justify-between p-4 bg-sand rounded-2xl group border border-transparent hover:border-brand-100 transition-all overflow-hidden">
                              <span className="font-bold text-slate-700 truncate mr-4">{text}</span>
                              <button 
                                 onClick={() => removeMarqueeItem(idx)}
                                 className="p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded-xl transition-all"
                              >
                                 <Trash2 size={18} />
                              </button>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </section>
          </div>
        )}

        {/* LEGAL TAB */}
        {activeTab === 'legal' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <section className="bg-white p-8 rounded-[2.5rem] border border-brand-50 shadow-sm">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-sand rounded-xl flex items-center justify-center text-ink border border-brand-50">
                     <Shield size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-ink">Legal Documents & Policies</h3>
               </div>

               <div className="space-y-8">
                  {[
                    { id: 'privacyPolicy', label: 'Privacy Policy', icon: Shield },
                    { id: 'termsAndConditions', label: 'Terms & Conditions', icon: List },
                    { id: 'aboutUs', label: 'About Us', icon: Info }
                  ].map((field) => (
                    <div key={field.id} className="space-y-1.5">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-500 uppercase tracking-tighter">Markdown Enabled</span>
                      </div>
                      <textarea 
                        value={settings[field.id]}
                        onChange={(e) => setSettings({ ...settings, [field.id]: e.target.value })}
                        placeholder={`Enter ${field.label.toLowerCase()} content here...`}
                        className="w-full bg-sand border-none rounded-[1.5rem] px-6 py-5 font-semibold text-slate-700 focus:ring-4 focus:ring-slate-100 transition-all outline-none min-h-[250px] leading-relaxed"
                      />
                    </div>
                  ))}
               </div>
            </section>
          </div>
        )}

        {/* FAQ TAB */}
        {activeTab === 'faq' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <section className="bg-white p-8 rounded-[2.5rem] border border-brand-50 shadow-sm">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-sand rounded-xl flex items-center justify-center text-ink border border-brand-50">
                     <HelpCircle size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-ink">Frequently Asked Questions</h3>
               </div>

               {/* New FAQ Form */}
               <div className="bg-sand p-6 rounded-[2rem] border border-brand-50 mb-8">
                  <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4 ml-1">Add New FAQ Item</h4>
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      value={newFaq.question}
                      onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                      placeholder="Question: e.g. How do I export my designs?"
                      className="w-full bg-white border-none rounded-2xl px-5 py-4 font-bold text-ink focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                    />
                    <textarea 
                      value={newFaq.answer}
                      onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                      placeholder="Answer: Provide a detailed solution here..."
                      className="w-full bg-white border-none rounded-2xl px-5 py-4 font-semibold text-slate-700 focus:ring-4 focus:ring-slate-100 transition-all outline-none min-h-[100px]"
                    />
                    <button 
                      onClick={addFaqItem}
                      className="w-full py-4 bg-ink text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      Add to FAQ List
                    </button>
                  </div>
               </div>

               {/* FAQ List */}
               <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {settings.faq.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-brand-50 rounded-[2rem]">
                      <HelpCircle className="mx-auto text-slate-200 mb-4" size={48} />
                      <p className="text-slate-400 font-bold italic">No FAQs added yet. Start by adding one above.</p>
                    </div>
                  ) : (
                    settings.faq.map((item, idx) => (
                      <div key={idx} className="bg-white border border-brand-50 rounded-[1.5rem] p-6 group hover:shadow-md transition-all relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-ink"></div>
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h5 className="font-extrabold text-ink mb-2 leading-tight pr-8">{item.question}</h5>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.answer}</p>
                          </div>
                          <button 
                            onClick={() => removeFaqItem(idx)}
                            className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
               </div>
            </section>
          </div>
        )}

        {/* SUPPORT TAB */}
        {activeTab === 'support' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <section className="bg-white p-8 rounded-[2.5rem] border border-brand-50 shadow-sm">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-sand rounded-xl flex items-center justify-center text-ink border border-brand-50">
                     <Mail size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-ink">Support & Social Configuration</h3>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Customer Care */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Support Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-ink transition-colors" size={18} />
                      <input 
                        type="email" 
                        value={settings.customerCareEmail}
                        onChange={(e) => setSettings({ ...settings, customerCareEmail: e.target.value })}
                        placeholder="support@bjpkaryakarta.in"
                        className="w-full bg-sand border-none rounded-2xl pl-12 pr-5 py-4 font-bold text-ink focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Store Link */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">App Store / Download Link</label>
                    <div className="relative group">
                      <Link className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-ink transition-colors" size={18} />
                      <input 
                        type="url" 
                        value={settings.storeLink}
                        onChange={(e) => setSettings({ ...settings, storeLink: e.target.value })}
                        placeholder="https://bjpkaryakarta.in/download"
                        className="w-full bg-sand border-none rounded-2xl pl-12 pr-5 py-4 font-bold text-ink focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Invite Message */}
                  <div className="col-span-full space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">App Invite Message (Shared Text)</label>
                    <div className="relative group">
                      <MessageSquare className="absolute left-5 top-6 text-slate-300 group-focus-within:text-ink transition-colors" size={18} />
                      <textarea 
                        value={settings.inviteMessage}
                        onChange={(e) => setSettings({ ...settings, inviteMessage: e.target.value })}
                        placeholder="Create professional business designs with BJP Karyakarta! Download now: "
                        className="w-full bg-sand border-none rounded-2xl pl-12 pr-5 py-5 font-bold text-ink focus:ring-4 focus:ring-slate-100 transition-all outline-none min-h-[120px]"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 px-2 mt-1">This text is copied to the user's clipboard or shared directly when they use the "Invite Friends" feature.</p>
                  </div>
               </div>
            </section>
          </div>
        )}

        {/* EMAIL TAB */}
        {activeTab === 'email' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* SMTP Settings */}
            <section className="bg-white p-8 rounded-[2.5rem] border border-brand-50 shadow-sm">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-sand rounded-xl flex items-center justify-center text-ink border border-brand-50">
                     <Settings2 size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-ink">SMTP Configuration</h3>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SMTP Host</label>
                    <input 
                      type="text" 
                      value={settings.smtpHost}
                      onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className="w-full bg-sand border-none rounded-2xl px-5 py-4 font-bold text-ink focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SMTP Port</label>
                    <input 
                      type="number" 
                      value={settings.smtpPort}
                      onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })}
                      placeholder="587"
                      className="w-full bg-sand border-none rounded-2xl px-5 py-4 font-bold text-ink focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SMTP User</label>
                    <input 
                      type="text" 
                      value={settings.smtpUser}
                      onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                      placeholder="your-email@gmail.com"
                      className="w-full bg-sand border-none rounded-2xl px-5 py-4 font-bold text-ink focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SMTP Password</label>
                    <input 
                      type="password" 
                      value={settings.smtpPass}
                      onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                      placeholder="Your App Password"
                      className="w-full bg-sand border-none rounded-2xl px-5 py-4 font-bold text-ink focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From Email (Display Name)</label>
                    <input 
                      type="text" 
                      value={settings.smtpFromEmail}
                      onChange={(e) => setSettings({ ...settings, smtpFromEmail: e.target.value })}
                      placeholder="BJP Karyakarta <support@bjpkaryakarta.in>"
                      className="w-full bg-sand border-none rounded-2xl px-5 py-4 font-bold text-ink focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                    />
                  </div>
               </div>
            </section>

            {/* Welcome Email Template */}
            <section className="bg-white p-8 rounded-[2.5rem] border border-brand-50 shadow-sm">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-sand rounded-xl flex items-center justify-center text-ink border border-brand-50">
                     <Mail size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-ink">Welcome Email Template</h3>
               </div>

               <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Line</label>
                    <input 
                      type="text" 
                      value={settings.welcomeEmailTemplate.subject}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        welcomeEmailTemplate: { ...settings.welcomeEmailTemplate, subject: e.target.value } 
                      })}
                      placeholder="Welcome to BJP Karyakarta!"
                      className="w-full bg-sand border-none rounded-2xl px-5 py-4 font-bold text-ink focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Body</label>
                      <span className="text-[10px] text-slate-400 font-bold">Use {"{{name}}"} for user name</span>
                    </div>
                    <textarea 
                      value={settings.welcomeEmailTemplate.body}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        welcomeEmailTemplate: { ...settings.welcomeEmailTemplate, body: e.target.value } 
                      })}
                      placeholder="Hi {{name}}, Welcome to BJP Karyakarta..."
                      className="w-full bg-sand border-none rounded-2xl px-5 py-4 font-semibold text-slate-700 focus:ring-4 focus:ring-slate-100 transition-all outline-none min-h-[150px]"
                    />
                  </div>
               </div>
            </section>

            {/* Purchase Email Template */}
            <section className="bg-white p-8 rounded-[2.5rem] border border-brand-50 shadow-sm">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-sand rounded-xl flex items-center justify-center text-ink border border-brand-50">
                     <Mail size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-ink">Purchase Activation Template</h3>
               </div>

               <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Line</label>
                    <input 
                      type="text" 
                      value={settings.purchaseEmailTemplate.subject}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        purchaseEmailTemplate: { ...settings.purchaseEmailTemplate, subject: e.target.value } 
                      })}
                      placeholder="Plan Activated - Karyakarta Pro"
                      className="w-full bg-sand border-none rounded-2xl px-5 py-4 font-bold text-ink focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Body</label>
                      <span className="text-[10px] text-slate-400 font-bold">Use {"{{name}}"} and {"{{planName}}"}</span>
                    </div>
                    <textarea 
                      value={settings.purchaseEmailTemplate.body}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        purchaseEmailTemplate: { ...settings.purchaseEmailTemplate, body: e.target.value } 
                      })}
                      placeholder="Hi {{name}}, Your {{planName}} is active..."
                      className="w-full bg-sand border-none rounded-2xl px-5 py-4 font-semibold text-slate-700 focus:ring-4 focus:ring-slate-100 transition-all outline-none min-h-[150px]"
                    />
                  </div>
               </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppSettings;
