import api, { muteToast } from './api';

export const getContentCounts = async () => {
  const res = await api.get('/admin/content-counts', muteToast);
  return res.data;
};
