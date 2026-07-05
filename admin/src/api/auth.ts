import { http } from '@/utils/http';

export interface LoginInput {
  username: string;
  password: string;
}

export const login = (data: LoginInput) => http.post<any>('/users/login', data);
export const getMe = () => http.get<any>('/users/me');