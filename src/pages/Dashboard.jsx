import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Shield,
  Sparkles,
  LayoutTemplate,
  FileImage,
  Image as ImageIcon,
  Newspaper,
  Layers,
  Clapperboard,
} from 'lucide-react';
import api, { muteToast } from '../services/api';
import { getContentCounts } from '../services/contentCountsApi';

const StatCard = ({ title, value, icon: Icon, onClick, subtitle }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={`group relative overflow-hidden rounded-2xl border border-brand-100 bg-white p-5 sm:p-6 text-left w-full transition-all duration-300 ${
      onClick
        ? 'hover:border-brand-300 hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1 cursor-pointer'
        : 'cursor-default'
    }`}
  >
    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-400 to-brand-600" />
    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-brand-500/5 group-hover:bg-brand-500/10 transition-colors" />
    <div className="flex items-start justify-between gap-3 relative">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-brand-600 mb-2">
          {title}
        </p>
        <p className="font-display text-3xl sm:text-4xl font-bold text-ink">{value}</p>
        {subtitle && (
          <p className="text-xs font-semibold text-stone-500 mt-2">{subtitle}</p>
        )}
        {onClick && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-500 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            Open →
          </p>
        )}
      </div>
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">
        <Icon size={22} />
      </div>
    </div>
  </button>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [statsRes, countsData] = await Promise.all([
        api.get('/admin/stats', muteToast).catch(() => ({ data: null })),
        getContentCounts().catch(() => null),
      ]);
      setStats(statsRes.data);
      // Prefer dedicated content-counts; fallback to stats.contentCounts
          setCounts(
        countsData ||
          statsRes.data?.contentCounts || {
            templates: 0,
            templatesActive: 0,
            templatesPoster: 0,
            templatesPosterActive: 0,
            banners: 0,
            bannersActive: 0,
            news: 0,
            newsActive: 0,
            videoTemplates: 0,
            videoTemplatesActive: 0,
            videoCompositions: 0,
            videoCompositionsCompleted: 0,
            total: 0,
          }
      );
    } catch (error) {
      console.error('Error fetching dashboard:', error.response?.data || error.message);
      setStats(null);
      setCounts(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500" />
        <p className="text-stone-500 font-medium">Loading Karyakarta insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-brand-100 bg-ink text-white p-6 sm:p-8">
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage: "url('/images/home/banner-1.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-brand-600/40" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-200 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles size={14} />
              BJP Karyakarta Desk
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold">Mission Control</h1>
            <p className="text-orange-100/75 mt-2 max-w-xl">
              Track members, creatives and content from one place. Click a content card to open it.
            </p>
          </div>
          <img
            src="/images/home/social-instagram.png"
            alt=""
            className="w-14 h-14 opacity-90 hidden sm:block object-contain"
          />
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-bold text-ink mb-4">Members</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <StatCard title="Total Members" value={stats?.totalUsers || 0} icon={Users} />
          <StatCard title="Karyakartas" value={stats?.userCount || 0} icon={UserCheck} />
          <StatCard title="Admins" value={stats?.adminCount || 0} icon={Shield} />
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-bold text-ink mb-4">Content Library</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 gap-5">
          <StatCard
            title="Templates"
            value={counts?.templates || 0}
            subtitle={
              counts?.templatesActive != null
                ? `${counts.templatesActive} active`
                : 'Fabric designs'
            }
            icon={LayoutTemplate}
            onClick={() => navigate('/templates')}
          />
          <StatCard
            title="Video Templates"
            value={counts?.videoTemplates || 0}
            subtitle={
              counts?.videoTemplatesActive != null
                ? `${counts.videoTemplatesActive} active · ${counts?.videoCompositionsCompleted || 0} merged`
                : 'Canva-style frames'
            }
            icon={Clapperboard}
            onClick={() => navigate('/video-templates')}
          />
          <StatCard
            title="Template Posters"
            value={counts?.templatesPoster || 0}
            subtitle={
              counts?.templatesPosterActive != null
                ? `${counts.templatesPosterActive} active`
                : 'Simple posters'
            }
            icon={FileImage}
            onClick={() => navigate('/templates-poster')}
          />
          <StatCard
            title="Banners"
            value={counts?.banners || 0}
            subtitle={
              counts?.bannersActive != null ? `${counts.bannersActive} active` : 'Campaign banners'
            }
            icon={ImageIcon}
            onClick={() => navigate('/banners')}
          />
          <StatCard
            title="News"
            value={counts?.news || 0}
            subtitle={counts?.newsActive != null ? `${counts.newsActive} active` : 'App updates'}
            icon={Newspaper}
            onClick={() => navigate('/news')}
          />
          <StatCard
            title="Total Content"
            value={counts?.total || 0}
            subtitle="All content types"
            icon={Layers}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bk-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-2xl font-bold text-ink">Recent Joinings</h3>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Live</span>
          </div>
          <div className="space-y-4">
            {stats?.recentUsers?.map((u) => (
              <div
                key={u._id}
                className="flex items-center gap-4 p-3 rounded-2xl bg-sand border border-brand-50"
              >
                <div className="w-11 h-11 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center">
                  {u.name?.charAt(0) || 'K'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{u.name || 'Karyakarta'}</p>
                  <p className="text-xs text-stone-500 truncate">
                    {u.email} • {new Date(u.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                    u.role === 'admin'
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {u.role}
                </span>
              </div>
            ))}
            {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
              <p className="text-center py-8 text-stone-500">No recent joinings yet.</p>
            )}
          </div>
        </div>

        <div className="bk-panel p-6">
          <h3 className="font-display text-2xl font-bold text-ink mb-6">Member Mix</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-stone-600">Karyakartas</span>
                <span className="text-ink">
                  {stats?.totalUsers ? Math.round((stats.userCount / stats.totalUsers) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-sand rounded-full h-2.5">
                <div
                  className="bg-brand-500 h-2.5 rounded-full"
                  style={{
                    width: `${stats?.totalUsers ? (stats.userCount / stats.totalUsers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-stone-600">Admins</span>
                <span className="text-ink">
                  {stats?.totalUsers ? Math.round((stats.adminCount / stats.totalUsers) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-sand rounded-full h-2.5">
                <div
                  className="bg-ink h-2.5 rounded-full"
                  style={{
                    width: `${stats?.totalUsers ? (stats.adminCount / stats.totalUsers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
