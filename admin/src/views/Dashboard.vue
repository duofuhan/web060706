<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getStats } from '@/api/admin';

const router = useRouter();
const stats = ref<any>({});
const loading = ref(true);

onMounted(async () => {
  try {
    const res: any = await getStats();
    stats.value = res.data ?? res;
  } finally {
    loading.value = false;
  }
});

const cards = [
  { key: 'users', label: '注册用户', icon: 'User', color: '#409EFF', path: '/users' },
  { key: 'itemsApproved', label: '已上架拍品', icon: 'Goods', color: '#67C23A', path: '/all-items' },
  { key: 'pendingItems', label: '待审核拍品', icon: 'Bell', color: '#E6A23C', path: '/items' },
  { key: 'auctionsLive', label: '进行中拍卖', icon: 'Auction', color: '#F56C6C', path: '/auctions?status=live' },
  { key: 'ordersCompleted', label: '累计成交', icon: 'ShoppingCart', color: '#909399', path: '/all-items?status=completed' },
  { key: 'settledAmount', label: '累计成交额 ¥', icon: 'Money', color: '#9B59B6' },
];

function go(path?: string) {
  if (path) router.push(path);
}
</script>

<template>
  <el-row :gutter="16" v-loading="loading">
    <el-col v-for="c in cards" :key="c.key" :span="8" style="margin-bottom: 16px">
      <el-card shadow="hover" :style="c.path ? { cursor: 'pointer' } : {}" @click="go(c.path)">
        <div style="display: flex; align-items: center; gap: 16px">
          <el-icon :size="36" :color="c.color"><component :is="c.icon" /></el-icon>
          <div>
            <div style="font-size: 13px; color: #909399">{{ c.label }}</div>
            <div style="font-size: 28px; margin-top: 6px">{{ stats[c.key] ?? 0 }}</div>
          </div>
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>