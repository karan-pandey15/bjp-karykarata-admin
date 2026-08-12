import api, { muteToast } from './api';

/** Upload frame/media asset (field name must be `image`) */
export const uploadVideoTemplateMedia = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await api.post('/video-templates/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    successMessage: 'Media uploaded successfully',
    onUploadProgress,
  });
  return res.data;
};

export const listVideoTemplateMedia = async () => {
  const res = await api.get('/video-templates/media', muteToast);
  return Array.isArray(res.data) ? res.data : res.data?.media || [];
};

export const deleteVideoTemplateMedia = async (id) => {
  return api.delete(`/video-templates/media/${encodeURIComponent(id)}`, {
    successMessage: 'Media deleted successfully',
  });
};

export const listVideoTemplates = async (params = {}) => {
  const res = await api.get('/video-templates', { ...muteToast, params });
  return res.data;
};

export const getVideoTemplate = async (id) => {
  const res = await api.get(`/video-templates/${id}`, muteToast);
  return res.data;
};

export const createVideoTemplate = async (payload, isMultipart = false) => {
  if (isMultipart) {
    return api.post('/video-templates', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      successMessage: 'Video template created successfully',
    });
  }
  return api.post('/video-templates', payload, {
    successMessage: 'Video template created successfully',
  });
};

export const updateVideoTemplate = async (id, payload, isMultipart = false) => {
  if (isMultipart) {
    return api.put(`/video-templates/${id}`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      successMessage: 'Video template updated successfully',
    });
  }
  return api.put(`/video-templates/${id}`, payload, {
    successMessage: 'Video template updated successfully',
  });
};

export const deleteVideoTemplate = async (id) => {
  return api.delete(`/video-templates/${id}`, {
    successMessage: 'Video template deleted successfully',
  });
};

/** Step 2 — upload user video into a template (field must be `video`) */
export const uploadUserVideo = async (templateId, file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('video', file);
  const res = await api.post(`/video-templates/${templateId}/user-video`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    successMessage: 'User video uploaded successfully',
    onUploadProgress,
  });
  return res.data;
};

/**
 * Step 3 — merge frame + user video
 * body: { compositionId } | { userVideoUrl } | FormData with `video`
 */
export const mergeVideoTemplate = async (templateId, body) => {
  if (body instanceof FormData) {
    const res = await api.post(`/video-templates/${templateId}/merge`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
      successMessage: 'Video merged successfully',
    });
    return res.data;
  }
  const res = await api.post(`/video-templates/${templateId}/merge`, body, {
    successMessage: 'Video merged successfully',
  });
  return res.data;
};

export const listCompositions = async (params = {}) => {
  const res = await api.get('/video-templates/compositions', { ...muteToast, params });
  return res.data;
};

export const getComposition = async (compositionId) => {
  const res = await api.get(`/video-templates/compositions/${compositionId}`, muteToast);
  return res.data;
};
