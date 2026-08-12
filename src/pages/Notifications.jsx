import React, { useState } from 'react';
import { Bell, Send, Image as ImageIcon, Loader2 } from 'lucide-react';
import api from '../services/api';

const Notifications = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    imageUrl: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/notifications/send', formData, {
        successMessage: 'Notification sent successfully',
      });
      setFormData({ title: '', body: '', imageUrl: '' });
    } catch (err) {
      console.error('Error sending notification:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-brand-600 mb-1">Outreach</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">Push Notifications</h1>
        <p className="text-stone-500 mt-1">Broadcast alerts to all BJP Karyakarta app users.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bk-panel p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-ink mb-2">Notification Title</label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. New campaign live"
                className="bk-input"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-ink mb-2">Message Body</label>
              <textarea
                name="body"
                required
                value={formData.body}
                onChange={handleChange}
                placeholder="Share your message with every karyakarta..."
                rows="4"
                className="bk-input resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-ink mb-2">Image URL (Optional)</label>
              <div className="relative">
                <ImageIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400" />
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/banner.jpg"
                  className="bk-input pl-11"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="bk-btn w-full py-4 flex items-center justify-center gap-2">
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Send size={20} />
                  <span>Send Notification</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <h3 className="font-display text-2xl font-bold text-ink px-2">Live Preview</h3>
          <div className="relative max-w-sm mx-auto">
            <div className="bg-ink rounded-[2.5rem] p-4 border-[8px] border-[#2a1a0c] shadow-2xl aspect-[9/19.5]">
              <div className="w-full h-full bg-[#1c1208] rounded-[2rem] overflow-hidden relative">
                <div className="absolute top-12 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-brand-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white shrink-0">
                      <Bell size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-brand-600 tracking-wider">BJP KARYAKARTA</span>
                        <span className="text-[10px] text-stone-400 font-medium">now</span>
                      </div>
                      <h4 className="text-sm font-bold text-ink truncate mt-0.5">
                        {formData.title || 'Notification Title'}
                      </h4>
                      <p className="text-xs text-stone-600 leading-relaxed mt-1 line-clamp-2">
                        {formData.body || "This is how your message will appear on users' phones."}
                      </p>
                    </div>
                  </div>
                  {formData.imageUrl && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-brand-50 h-32">
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => (e.target.style.display = 'none')}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
