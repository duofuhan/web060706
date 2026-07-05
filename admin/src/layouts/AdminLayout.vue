<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const isCollapse = ref(false);

onMounted(() => {
  if (auth.token && !auth.role) auth.fetchMe();
});

function handleLogout() {
  auth.logout();
  router.push('/login');
}

const menu = [
  { path: '/dashboard', label: '控制台', icon: 'DataLine' },
  { path: '/users', label: '用户管理', icon: 'User' },
  { path: '/items', label: '拍品审核', icon: 'Goods' },
  { path: '/auctions', label: '拍卖场次', icon: 'Auction' },
  { path: '/disputes', label: '争议处理', icon: 'Warning' },
  { path: '/logs', label: '操作日志', icon: 'Document' },
  { path: '/config', label: '系统配置', icon: 'Setting' },
];
</script>

<template>
  <el-container style="height: 100vh">
    <el-aside :width="isCollapse ? '64px' : '220px'" style="background: #304156">
      <div class="logo">{{ isCollapse ? '拍' : '拍卖系统后台' }}</div>
      <el-menu
        :default-active="$route.path"
        :collapse="isCollapse"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item v-for="m in menu" :key="m.path" :index="m.path">
          <el-icon><component :is="m.icon" /></el-icon>
          <template #title>{{ m.label }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="display: flex; align-items: center; justify-content: space-between; background: #fff">
        <el-button text @click="isCollapse = !isCollapse">
          <el-icon size="20"><Fold v-if="!isCollapse" /><Expand v-else /></el-icon>
        </el-button>
        <el-dropdown @command="handleLogout">
          <span>{{ auth.nickname || auth.username }} <el-icon><ArrowDown /></el-icon></span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}
</style>