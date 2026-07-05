<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getAuctions } from '@/api/admin';

const list = ref<any[]>([]);
const loading = ref(false);
const filterStatus = ref('');

const statusTag: Record<string, any> = {
  scheduled: { t: 'info', l: '待开始' },
  live: { t: 'danger', l: '进行中' },
  ended: { t: 'warning', l: '已结束' },
  canceled: { t: 'info', l: '已取消' },
  settled: { t: 'success', l: '已成交' },
};

async function load() {
  loading.value = true;
  try {
    const res: any = await getAuctions({ status: filterStatus.value || undefined });
    list.value = res.data ?? [];
  } finally {
    loading.value = false;
  }
}

function fmt(d: string) {
  return new Date(d).toLocaleString('zh-CN');
}

onMounted(load);
</script>

<template>
  <el-card>
    <template #header>
      <div style="display: flex; align-items: center; justify-content: space-between">
        <span>拍卖场次</span>
        <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 160px" @change="load">
          <el-option v-for="(v, k) in statusTag" :key="k" :label="v.l" :value="k" />
        </el-select>
      </div>
    </template>

    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="拍品">
        <template #default="{ row }">{{ row.item?.name ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="卖家" width="120">
        <template #default="{ row }">{{ row.seller?.nickname ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="起拍/当前" width="160">
        <template #default="{ row }">¥{{ row.startPrice }} / ¥{{ row.currentPrice }}</template>
      </el-table-column>
      <el-table-column label="中标者" width="120">
        <template #default="{ row }">{{ row.winner?.nickname ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTag[row.status]?.t">{{ statusTag[row.status]?.l ?? row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="开始/结束时间" width="320">
        <template #default="{ row }">
          <div>{{ fmt(row.startTime) }}</div>
          <div style="color: #909399">{{ fmt(row.endTime) }}</div>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>