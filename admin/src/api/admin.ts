import { http } from '@/utils/http';

export const getStats = () => http.get<any>('/admin/stats');

export interface UserItem {
  id: number;
  username: string;
  nickname: string;
  role: string;
  status: number;
  createdAt: string;
}

export const getUsers = (params: any) => http.get<{ list: UserItem[]; total: number; page: number; pageSize: number }>('/admin/users', { params });
export const createUser = (data: any) => http.post<any>('/admin/users', data);
export const updateUser = (id: number, data: any) => http.put<any>(`/admin/users/${id}`, data);
export const disableUser = (id: number) => http.delete<any>(`/admin/users/${id}`);

export const getPendingItems = () => http.get<any>('/admin/items/pending');
export const reviewItem = (id: number, data: { approved: boolean; reason?: string }) =>
  http.post<any>(`/items/${id}/review`, data);

export const getAuctions = (params: any) => http.get<any>('/admin/auctions', { params });

export const forceEndAuction = (id: number) => http.post<any>(`/admin/auctions/${id}/force-end`, {});
export const forceCancelAuction = (id: number, reason: string) =>
  http.post<any>(`/admin/auctions/${id}/force-cancel`, { reason });

// 争议
export const getDisputes = (params: any) => http.get<any>('/disputes', { params });
export const getDispute = (id: number) => http.get<any>(`/disputes/${id}`);
export const takeDispute = (id: number) => http.post<any>(`/disputes/${id}/take`, {});
export const resolveDispute = (id: number, data: { approved: boolean; resolution?: string }) =>
  http.post<any>(`/disputes/${id}/resolve`, data);

// 操作日志
export const getLogs = (params: any) => http.get<any>('/admin/logs', { params });

// 系统配置
export const getConfigs = () => http.get<any>('/admin/config');
export const updateConfig = (key: string, value: string) =>
  http.put<any>(`/admin/config/${key}`, { value });