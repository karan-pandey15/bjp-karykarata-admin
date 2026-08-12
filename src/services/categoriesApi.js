import api, { muteToast } from './api';

/** Normalize categories list from GET /categories */
export const fetchCategoriesList = async () => {
  const res = await api.get('/categories', muteToast);
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.categories)) return data.categories;
  return [];
};

/**
 * Optional helper: upload image via existing templates media library,
 * returns Cloudinary https URL.
 */
export const uploadAdminImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await api.post('/templates/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    successMessage: 'Image uploaded',
  });
  return res.data?.url;
};
