import React, { useState, useEffect } from 'react';
import {
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  UserPlus,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Globe,
  Hash,
  Eye,
  Calendar,
  MapPin,
  Shield,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  IndianRupee
} from 'lucide-react';
import api, { muteToast } from '../services/api';
import SearchInput from '../components/SearchInput';
import { useConfirm } from '../context/ConfirmContext';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const SubscriptionBadge = ({ user }) => {
  const active = user.activeSubscription;
  const last = user.lastSubscription;

  if (active) {
    const expired = new Date(active.endDate) < new Date();
    if (!expired) {
      return (
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-800">
            Pro Active
          </span>
          <p className="text-sm font-bold text-ink">{active.planName}</p>
          <p className="text-[10px] text-slate-500">
            ₹{active.price} · expires {formatDate(active.endDate)}
          </p>
        </div>
      );
    }
  }

  if (last) {
    const wasActive = last.status === 'active' && new Date(last.endDate) >= new Date();
    return (
      <div className="space-y-1">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
          wasActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
        }`}>
          {wasActive ? 'Pro Active' : last.status === 'expired' ? 'Expired' : last.status}
        </span>
        <p className="text-sm font-semibold text-slate-700">{last.planName}</p>
        <p className="text-[10px] text-slate-400">
          ₹{last.price} · {formatDate(last.endDate)}
        </p>
      </div>
    );
  }

  return (
    <span className="text-xs font-semibold text-slate-400">No purchase yet</span>
  );
};

const Users = () => {
  const { confirm } = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [viewUser, setViewUser] = useState(null);
  const [industries, setIndustries] = useState([]);
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    limit: 10
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    designation: '',
    firebaseUid: '',
    dob: '',
    gender: '',
    city: '',
    avatarUrl: '',
    role: 'user',
    isProfileComplete: false,
    businessName: '',
    industryId: '',
    logoUrl: '',
    contactPhone: ''
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchUsers(1);
    fetchIndustries();
  }, []);

  const fetchIndustries = async () => {
    try {
      const res = await api.get('/onboarding/industries', muteToast);
      if (res.data?.success) {
        setIndustries(res.data.industries);
      }
    } catch (error) {
      console.error('Error fetching industries:', error);
    }
  };

  const fetchUsers = async (page = 1, search = searchTerm) => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users', {
        ...muteToast,
        params: {
          page,
          limit: pagination.limit,
          search
        }
      });

      if (res.data) {
        setUsers(res.data.users || []);
        setPagination(prev => ({
          ...prev,
          currentPage: res.data.currentPage,
          totalPages: res.data.totalPages,
          totalUsers: res.data.totalUsers
        }));
      }
    } catch (error) {
      console.error('Error fetching users:', error.response?.data || error.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    fetchUsers(1, value);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchUsers(newPage);
    }
  };

  const handleOpenViewModal = (user) => {
    setViewUser(user);
    setIsViewModalOpen(true);
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setCurrentUser(user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        designation: user.designation || '',
        firebaseUid: user.firebaseUid || '',
        dob: user.dob || '',
        gender: user.gender || '',
        city: user.city || '',
        avatarUrl: user.avatarUrl || '',
        role: user.role || 'user',
        isProfileComplete: user.isProfileComplete || false,
        businessName: user.business?.businessName || '',
        industryId: user.business?.industryId?._id || user.business?.industryId || '',
        logoUrl: user.business?.logoUrl || '',
        contactPhone: user.business?.contactPhone || ''
      });
      setLogoFile(null);
      setLogoPreview(user.business?.logoUrl || '');
      setAvatarFile(null);
      setAvatarPreview(user.avatarUrl || '');
    } else {
      setCurrentUser(null);
      setFormData({
        name: '',
        email: '',
        phoneNumber: '',
        designation: '',
        firebaseUid: '',
        dob: '',
        gender: '',
        city: '',
        avatarUrl: '',
        role: 'user',
        isProfileComplete: false,
        businessName: '',
        industryId: '',
        logoUrl: '',
        contactPhone: ''
      });
      setLogoFile(null);
      setLogoPreview('');
      setAvatarFile(null);
      setAvatarPreview('');
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'logo') {
          setLogoFile(file);
          setLogoPreview(reader.result);
        } else {
          setAvatarFile(file);
          setAvatarPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      let finalLogoUrl = formData.logoUrl;
      let finalAvatarUrl = formData.avatarUrl;

      if (logoFile) {
        const logoData = new FormData();
        logoData.append('image', logoFile);
        const logoRes = await api.post('/upload/logo', logoData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          successMessage: 'Logo uploaded',
        });
        if (logoRes.data?.success) {
          finalLogoUrl = logoRes.data.url;
        }
      }

      if (avatarFile) {
        const avatarData = new FormData();
        avatarData.append('image', avatarFile);
        const avatarRes = await api.post('/upload/profile', avatarData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          successMessage: 'Avatar uploaded',
        });
        if (avatarRes.data?.success) {
          finalAvatarUrl = avatarRes.data.url;
        }
      }

      const submissionData = {
        ...formData,
        logoUrl: finalLogoUrl,
        avatarUrl: finalAvatarUrl
      };

      if (currentUser) {
        await api.put(`/admin/users/${currentUser._id}`, submissionData, {
          successMessage: 'User updated successfully',
        });
      } else {
        await api.post('/admin/users', submissionData, {
          successMessage: 'User created successfully',
        });
      }
      setIsModalOpen(false);
      fetchUsers(pagination.currentPage);
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete user?',
      message: 'Are you sure you want to delete this user? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/users/${id}`, { successMessage: 'User deleted' });
      fetchUsers(pagination.currentPage);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-brand-600 mb-1">Directory</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">Karyakartas</h1>
          <p className="text-stone-500 mt-1 text-sm sm:text-base">View, add, edit, and manage registered members.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bk-btn py-2.5 px-6 flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <Plus size={20} />
          <span>Add Karyakarta</span>
        </button>
      </div>

      <div className="bk-panel overflow-hidden">
        {/* Search and Filters */}
        <div className="p-4 border-b border-brand-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SearchInput
            className="flex-1 max-w-md"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={handleSearch}
          />
          <div className="text-xs font-bold text-brand-600 uppercase tracking-wider">
            {pagination.totalUsers} Records
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-sand border-b border-brand-50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Business</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan / Purchase</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                      <p className="text-slate-500 text-sm">Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-sand transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center overflow-hidden">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            user.name?.charAt(0) || 'U'
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-ink">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.business?.logoUrl ? (
                          <img src={user.business.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-sand border border-brand-50" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Building2 size={14} className="text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-ink">{user.business?.businessName || 'No Business'}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
                            {user.business?.industryId?.name || 'Unspecified'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 min-w-[160px]">
                      <SubscriptionBadge user={user} />
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenViewModal(user)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-brand-50 flex items-center justify-between bg-sand/50">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-ink">{(pagination.currentPage - 1) * pagination.limit + 1}</span> to <span className="font-semibold text-ink">{Math.min(pagination.currentPage * pagination.limit, pagination.totalUsers)}</span> of <span className="font-semibold text-ink">{pagination.totalUsers}</span> users
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="p-2 border border-brand-100 rounded-lg hover:bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              
              {[...Array(pagination.totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // Show first, last, current, and pages around current
                if (
                  pageNum === 1 || 
                  pageNum === pagination.totalPages || 
                  (pageNum >= pagination.currentPage - 1 && pageNum <= pagination.currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`min-w-[40px] h-10 px-3 rounded-lg text-sm font-semibold transition-all ${
                        pagination.currentPage === pageNum
                          ? 'bg-brand-500 text-white shadow-md'
                          : 'bg-white border border-brand-100 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  pageNum === pagination.currentPage - 2 || 
                  pageNum === pagination.currentPage + 2
                ) {
                  return <span key={pageNum} className="text-slate-400">...</span>;
                }
                return null;
              })}

              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="p-2 border border-brand-100 rounded-lg hover:bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-none sm:zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-5 sm:p-6 border-b border-brand-50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-ink">
                {currentUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 px-1">Firebase UID</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    className="w-full px-4 py-3 bg-sand border border-brand-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                    value={formData.firebaseUid}
                    onChange={(e) => setFormData({ ...formData, firebaseUid: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 px-1">Full Name</label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      placeholder="Enter name"
                      className="w-full pl-10 pr-4 py-3 bg-sand border border-brand-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 px-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      required
                      placeholder="Enter email"
                      className="w-full pl-10 pr-4 py-3 bg-sand border border-brand-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 px-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      pattern="[0-9]{10}"
                      placeholder="10 digit number"
                      className="w-full pl-10 pr-4 py-3 bg-sand border border-brand-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({ ...formData, phoneNumber: val });
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 px-1">Designation</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Enter designation"
                      className="w-full pl-10 pr-4 py-3 bg-sand border border-brand-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 px-1">Date of Birth</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-sand border border-brand-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 px-1">Gender</label>
                  <select
                    className="w-full px-4 py-3 bg-sand border border-brand-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 px-1">City</label>
                  <input
                    type="text"
                    placeholder="Enter city"
                    className="w-full px-4 py-3 bg-sand border border-brand-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 px-1">Role</label>
                  <select
                    className="w-full px-4 py-3 bg-sand border border-brand-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm font-semibold"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-2 flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="isProfileComplete"
                    className="w-5 h-5 accent-primary-600 rounded border-slate-300"
                    checked={formData.isProfileComplete}
                    onChange={(e) => setFormData({ ...formData, isProfileComplete: e.target.checked })}
                  />
                  <label htmlFor="isProfileComplete" className="text-sm font-semibold text-slate-700 cursor-pointer">Profile Complete</label>
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700 px-1">User Avatar</label>
                  <div className="flex items-center gap-4">
                    {avatarPreview && (
                      <div className="w-16 h-16 rounded-xl border border-brand-100 overflow-hidden bg-sand">
                        <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-brand-100 rounded-2xl p-4 hover:border-primary-500 hover:bg-primary-50 transition-all cursor-pointer group">
                      <div className="flex flex-col items-center gap-1">
                        <Upload size={20} className="text-slate-400 group-hover:text-primary-500 transition-colors" />
                        <span className="text-xs font-semibold text-slate-500 group-hover:text-primary-600">
                          {avatarFile ? avatarFile.name : 'Upload Avatar'}
                        </span>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'avatar')}
                      />
                    </label>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-slate-100"></div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business Details</span>
                    <div className="h-px flex-1 bg-slate-100"></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 px-1">Business Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Enter company name"
                      className="w-full pl-10 pr-4 py-3 bg-sand border border-brand-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 px-1">Industry</label>
                  <select
                    className="w-full px-4 py-3 bg-sand border border-brand-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                    value={formData.industryId}
                    onChange={(e) => setFormData({ ...formData, industryId: e.target.value })}
                  >
                    <option value="">Select Industry</option>
                    {industries.map(ind => (
                      <option key={ind._id} value={ind._id}>
                        {ind.icon} {ind.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 px-1">Business Logo</label>
                  <div className="flex items-center gap-4">
                    {logoPreview && (
                      <div className="w-16 h-16 rounded-xl border border-brand-100 overflow-hidden bg-sand p-1">
                        <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-brand-100 rounded-2xl p-4 hover:border-primary-500 hover:bg-primary-50 transition-all cursor-pointer group">
                      <div className="flex flex-col items-center gap-1">
                        <Upload size={20} className="text-slate-400 group-hover:text-primary-500 transition-colors" />
                        <span className="text-xs font-semibold text-slate-500 group-hover:text-primary-600">
                          {logoFile ? logoFile.name : 'Upload Logo'}
                        </span>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'logo')}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 px-1">Business Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Company contact"
                      className="w-full pl-10 pr-4 py-3 bg-sand border border-brand-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-white border-t border-brand-50 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:flex-1 py-3.5 px-4 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className={`w-full sm:flex-2 py-3.5 px-8 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20 order-1 sm:order-2 active:scale-[0.98] flex items-center justify-center gap-2 ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    currentUser ? 'Update Karyakarta' : 'Save Karyakarta'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {isViewModalOpen && viewUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)}></div>
          <div className="relative bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-brand-50 flex items-center justify-between bg-sand/50">
              <div className="flex items-center gap-3">
                {viewUser.avatarUrl ? (
                  <img src={viewUser.avatarUrl} alt={viewUser.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-primary-600 text-white flex items-center justify-center text-xl font-bold">
                    {viewUser.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-ink">{viewUser.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      ID: {viewUser.firebaseUid?.slice(0, 12)}...
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${viewUser.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                      {viewUser.role.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-8">
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <UserPlus size={14} /> Personal Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Mail size={16} className="text-slate-400" />
                      <span className="text-sm">{viewUser.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Phone size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">{viewUser.phoneNumber}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Calendar size={16} className="text-slate-400" />
                      <span className="text-sm">{viewUser.dob || 'DOB Not Provided'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <MapPin size={16} className="text-slate-400" />
                      <span className="text-sm">{viewUser.city || 'City Not Provided'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <span className="text-xs font-bold py-0.5 px-2 rounded bg-slate-100 text-slate-500">GENDER</span>
                      <span className="text-sm">{viewUser.gender || 'Not Specified'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Shield size={14} /> Profile Status
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-sand rounded-xl border border-brand-50">
                      <div className={`p-1.5 rounded-full ${viewUser.isProfileComplete ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">
                          {viewUser.isProfileComplete ? 'Profile Fully Completed' : 'Onboarding Pending'}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Status Verification</p>
                      </div>
                    </div>
                    <div className="space-y-2 px-1">
                      <div className="flex items-center gap-3 text-slate-600">
                        <Briefcase size={16} className="text-slate-400" />
                        <span className="text-sm font-semibold">{viewUser.designation || 'No Designation'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-brand-100 bg-gradient-to-br from-emerald-50 to-white p-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <CreditCard size={14} /> Subscription & Purchase
                </h4>
                {viewUser.activeSubscription ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-600 uppercase">Current plan</p>
                      <p className="text-lg font-bold text-ink mt-1">{viewUser.activeSubscription.planName}</p>
                      <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                        <IndianRupee size={14} />
                        {viewUser.activeSubscription.price} · {viewUser.activeSubscription.durationDays} days
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-brand-50 space-y-2 text-sm">
                      <p><span className="text-slate-400 font-semibold">Status:</span> <span className="font-bold text-green-700">Active</span></p>
                      <p><span className="text-slate-400 font-semibold">Expires:</span> {formatDate(viewUser.activeSubscription.endDate)}</p>
                      <p><span className="text-slate-400 font-semibold">Started:</span> {formatDate(viewUser.activeSubscription.startDate)}</p>
                      <p className="text-xs text-slate-500 break-all"><span className="font-semibold">Payment ID:</span> {viewUser.activeSubscription.paymentId || '—'}</p>
                    </div>
                  </div>
                ) : viewUser.lastSubscription ? (
                  <div className="p-4 bg-white rounded-xl border border-brand-50 space-y-2 text-sm">
                    <p className="font-bold text-slate-800">{viewUser.lastSubscription.planName}</p>
                    <p><span className="text-slate-400 font-semibold">Status:</span> {viewUser.lastSubscription.status}</p>
                    <p><span className="text-slate-400 font-semibold">Amount:</span> ₹{viewUser.lastSubscription.price}</p>
                    <p><span className="text-slate-400 font-semibold">Purchased:</span> {formatDate(viewUser.lastSubscription.createdAt)}</p>
                    <p><span className="text-slate-400 font-semibold">Expired:</span> {formatDate(viewUser.lastSubscription.endDate)}</p>
                    <p className="text-xs text-slate-500 break-all"><span className="font-semibold">Payment ID:</span> {viewUser.lastSubscription.paymentId || '—'}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">This user has not purchased any plan yet.</p>
                )}
              </section>

              {viewUser.business && (
                <section className="bg-ink rounded-2xl p-6 text-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Building2 size={80} />
                  </div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                    <Building2 size={12} /> Verified Business Info
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div className="flex items-start gap-5">
                      {viewUser.business.logoUrl ? (
                        <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-xl shadow-black/20 overflow-hidden">
                          <img src={viewUser.business.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
                          <Building2 className="text-slate-500" size={28} />
                        </div>
                      )}
                      <div>
                        <p className="text-lg font-bold leading-tight">{viewUser.business.businessName}</p>
                        <div className="inline-flex items-center gap-2 mt-2 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/5">
                          <span className="text-sm">{viewUser.business.industryId?.icon}</span>
                          <span className="text-xs font-bold text-slate-300 tracking-wide uppercase">
                            {viewUser.business.industryId?.name || 'Unspecified Sector'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 flex flex-col justify-center">
                      <div className="flex items-center gap-3 text-slate-300 text-sm bg-white/5 py-2 px-3 rounded-xl border border-white/5">
                        <Phone size={14} className="text-primary-400" />
                        <span className="font-mono">Business: {viewUser.business.contactPhone || 'No Contact Info'}</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <section className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Globe size={14} /> Media & Assets
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {viewUser.avatarUrl && (
                    <div className="group relative aspect-square rounded-2xl overflow-hidden border border-brand-100 bg-sand">
                      <img src={viewUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">User Avatar</span>
                      </div>
                    </div>
                  )}
                  {viewUser.business?.logoUrl && (
                    <div className="group relative aspect-square rounded-2xl overflow-hidden border border-brand-100 bg-sand">
                      <img src={viewUser.business.logoUrl} alt="Logo" className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Business Logo</span>
                      </div>
                    </div>
                  )}
                  {!viewUser.avatarUrl && !viewUser.business?.logoUrl && (
                    <div className="col-span-full py-8 text-center bg-sand rounded-2xl border border-dashed border-brand-100">
                      <p className="text-sm text-slate-400">No media assets found for this user.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-brand-50 bg-sand relative z-20">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="w-full py-4 px-6 bg-ink hover:bg-brand-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-brand-500/20 active:scale-[0.98]"
              >
                Dismiss Overview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
