import api, { muteToast } from './api';

export const listNews = async (params = {}) => {
  const res = await api.get('/news', { ...muteToast, params });
  return res.data;
};

export const getNewsItem = async (id) => {
  const res = await api.get(`/news/${id}`, muteToast);
  return res.data;
};

export const createNews = async (payload, isMultipart = false) => {
  if (isMultipart) {
    return api.post('/news', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      successMessage: 'News created successfully',
    });
  }
  return api.post('/news', payload, { successMessage: 'News created successfully' });
};

export const updateNews = async (id, payload, isMultipart = false) => {
  if (isMultipart) {
    return api.put(`/news/${id}`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      successMessage: 'News updated successfully',
    });
  }
  return api.put(`/news/${id}`, payload, { successMessage: 'News updated successfully' });
};

export const deleteNews = async (id) => {
  return api.delete(`/news/${id}`, { successMessage: 'News deleted successfully' });
};
