import { defineStore } from 'pinia';
import { ref } from 'vue';
import { login as apiLogin, getMe } from '@/api/auth';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '');
  const userId = ref<number | null>(null);
  const username = ref('');
  const role = ref<string>('');
  const nickname = ref('');

  async function login(username: string, password: string) {
    const res: any = await apiLogin({ username, password });
    token.value = res.data.token;
    localStorage.setItem('admin_token', token.value);
    await fetchMe();
  }

  async function fetchMe() {
    if (!token.value) return;
    const res: any = await getMe();
    const data = res.data ?? res;
    userId.value = data.id;
    username.value = data.username;
    role.value = data.role;
    nickname.value = data.nickname;
  }

  function logout() {
    token.value = '';
    userId.value = null;
    role.value = '';
    username.value = '';
    localStorage.removeItem('admin_token');
  }

  return { token, userId, username, role, nickname, login, fetchMe, logout };
});