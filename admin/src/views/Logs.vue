<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getLogs } from '@/api/admin';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    const res: any = await getLogs({ page: page.value, pageSize: pageSize.value });
    list.value = res.data?.list ?? [];
    total.value = res.data?.total ?? 0;
  } finally {
    loading.value = false;
  }
}

function fmt(d: string) { return new Date(d).toLocaleString('zh-CN'); }

onMounted(load);
</script>

<template>
  <el-card>
    <template #header>操作日志审计</template>

    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="userId" label="操作人ID" width="100" />
      <el-table-column prop="action" label="动作" width="180" />
      <el-table-column prop="target" label="目标" show-overflow-tooltip />
      <el-table-column prop="ip" label="IP" width="140" />
      <el-table-column label="时间" width="180">
        <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
      </el-table-column>
    </el-table>

    <el-pagination
      style="margin-top: 16px"
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="prev, pager, next, total"
      @current-change="load"
    />
  </el-card>
</template>