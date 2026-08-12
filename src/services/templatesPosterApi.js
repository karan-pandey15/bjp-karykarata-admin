import api, { muteToast } from './api';

export const listTemplatesPoster = async (params = {}) => {
  const res = await api.get('/templates-poster', { ...muteToast, params });
  return res.data;
};

export const getTemplatePoster = async (id) => {
  const res = await api.get(`/templates-poster/${id}`, muteToast);
  return res.data;
};

export const createTemplatePoster = async (payload, isMultipart = false) => {
  if (isMultipart) {
    return api.post('/templates-poster', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      successMessage: 'Template poster created successfully',
    });
  }
  return api.post('/templates-poster', payload, {
    successMessage: 'Template poster created successfully',
  });
};

export const updateTemplatePoster = async (id, payload, isMultipart = false) => {
  if (isMultipart) {
    return api.put(`/templates-poster/${id}`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      successMessage: 'Template poster updated successfully',
    });
  }
  return api.put(`/templates-poster/${id}`, payload, {
    successMessage: 'Template poster updated successfully',
  });
};

export const deleteTemplatePoster = async (id) => {
  return api.delete(`/templates-poster/${id}`, {
    successMessage: 'Template poster deleted successfully',
  });
};
