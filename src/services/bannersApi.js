import api, { muteToast } from './api';

export const listBanners = async (params = {}) => {
  const res = await api.get('/banners', { ...muteToast, params });
  return res.data;
};

export const getBanner = async (id) => {
  const res = await api.get(`/banners/${id}`, muteToast);
  return res.data;
};

export const createBanner = async (payload, isMultipart = false) => {
  if (isMultipart) {
    return api.post('/banners', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      successMessage: 'Banner created successfully',
    });
  }
  return api.post('/banners', payload, { successMessage: 'Banner created successfully' });
};

export const updateBanner = async (id, payload, isMultipart = false) => {
  if (isMultipart) {
    return api.put(`/banners/${id}`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      successMessage: 'Banner updated successfully',
    });
  }
  return api.put(`/banners/${id}`, payload, { successMessage: 'Banner updated successfully' });
};

export const deleteBanner = async (id) => {
  return api.delete(`/banners/${id}`, { successMessage: 'Banner deleted successfully' });
};
