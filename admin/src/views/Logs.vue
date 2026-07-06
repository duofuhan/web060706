<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getLogs } from '@/api/admin';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);

const actionMap: Record<string, string> = {
  review_item: '审核拍品',
  create_user: '创建用户',
  update_user: '编辑用户',
  disable_user: '禁用用户',
  force_end_auction: '强制结束拍卖',
  force_cancel_auction: '强制取消拍卖',
  create_dispute: '发起争议',
  resolve_dispute: '处理争议',
  update_config: '更新配置',
};

function actionLabel(a: string) { return actionMap[a] || a; }

function targetLabel(row: any) {
  const t = row.target || '';
  const d = row.detail || {};
  if (t.includes('review')) return '拍品 #' + d.id;
  if (t.includes('force-end')) return '强制结束场次 #' + d.auctionId;
  if (t.includes('force-cancel')) return '强制取消场次 #' + d.auctionId;
  if (t.includes('/admin/users')) return '用户 #' + d.id;
  if (t.includes('/disputes')) return '争议 #' + (t.split('/').pop() ?? '');
  if (t.includes('/admin/config')) return '配置项';
  return t;
}

function ipLabel(ip: string) {
  return ip ? ip.replace(/^::ffff:/, '') : '';
}

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
      <el-table-column label="动作" width="140">
        <template #default="{ row }">{{ actionLabel(row.action) }}</template>
      </el-table-column>
      <el-table-column label="目标" show-overflow-tooltip>
        <template #default="{ row }">{{ targetLabel(row) }}</template>
      </el-table-column>
      <el-table-column label="IP" width="140">
        <template #default="{ row }">{{ ipLabel(row.ip) }}</template>
      </el-table-column>
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