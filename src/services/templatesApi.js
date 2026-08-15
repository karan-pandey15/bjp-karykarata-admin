import api, { muteToast } from './api';

/** GET /api/templates — list design/Fabric templates */
export const listTemplates = async (params = {}) => {
  const res = await api.get('/templates', { ...muteToast, params });
  const data = res.data;
  if (Array.isArray(data)) return { templates: data, currentPage: 1, totalPages: 1 };
  return data;
};

/** GET /api/templates/:id */
export const getTemplate = async (id) => {
  const res = await api.get(`/templates/${id}`, muteToast);
  return res.data;
};

/** POST /api/templates */
export const createTemplate = async (payload) => {
  const res = await api.post('/templates', payload, {
    successMessage: 'Template created successfully',
  });
  return res.data;
};

/** PUT /api/templates/:id — :id must be Mongo _id */
export const updateTemplate = async (id, payload) => {
  const res = await api.put(`/templates/${id}`, payload, {
    successMessage: 'Design saved successfully',
  });
  return res.data;
};

/** DELETE /api/templates/:id */
export const deleteTemplate = async (id) => {
  return api.delete(`/templates/${id}`, {
    successMessage: 'Template deleted successfully',
  });
};

/** POST /api/templates/upload — field name: image */
export const uploadTemplateImage = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await api.post('/templates/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    successMessage: 'Image uploaded successfully',
    onUploadProgress,
  });
  return res.data;
};

export const listTemplateMedia = async () => {
  const res = await api.get('/templates/media', muteToast);
  return Array.isArray(res.data) ? res.data : res.data?.media || [];
};

export const deleteTemplateMedia = async (mediaId) => {
  return api.delete(`/templates/media/${encodeURIComponent(mediaId)}`, {
    successMessage: 'Image deleted',
  });
};
