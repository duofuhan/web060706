<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getPendingItems, reviewItem } from '@/api/admin';
import { getItems } from '@/api/item';

const list = ref<any[]>([]);
const loading = ref(false);
const tab = ref<'pending' | 'approved' | 'rejected' | 'all'>('pending');

async function load() {
  loading.value = true;
  try {
    if (tab.value === 'pending') {
      const res: any = await getPendingItems();
      list.value = res.data ?? [];
    } else {
      const res: any = await getItems({ status: tab.value === 'all' ? undefined : tab.value, pageSize: 50 });
      list.value = res.data?.list ?? [];
    }
  } finally {
    loading.value = false;
  }
}

async function approve(row: any) {
  await reviewItem(row.id, { approved: true });
  ElMessage.success('已通过');
  load();
}

async function reject(row: any) {
  const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回拍品', { type: 'warning' });
  await reviewItem(row.id, { approved: false, reason: value });
  ElMessage.success('已驳回');
  load();
}

const statusTag: Record<string, any> = {
  draft: { t: 'info', l: '草稿' },
  pending: { t: 'warning', l: '待审核' },
  approved: { t: 'success', l: '已通过' },
  rejected: { t: 'danger', l: '已驳回' },
  removed: { t: 'info', l: '已下架' },
};

onMounted(load);
</script>

<template>
  <el-card>
    <template #header>
      <div style="display: flex; align-items: center; justify-content: space-between">
        <span>拍品审核</span>
        <el-radio-group v-model="tab" @change="load">
          <el-radio-button value="pending">待审核</el-radio-button>
          <el-radio-button value="approved">已通过</el-radio-button>
          <el-radio-button value="rejected">已驳回</el-radio-button>
          <el-radio-button value="all">全部</el-radio-button>
        </el-radio-group>
      </div>
    </template>

    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="condition" label="成色" width="100" />
      <el-table-column label="原价/起拍价" width="160">
        <template #default="{ row }">
          ¥{{ row.originPrice }} / ¥{{ row.startPrice }}
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" show-overflow-tooltip />
      <el-table-column label="卖家" width="120">
        <template #default="{ row }">{{ row.seller?.nickname ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTag[row.status]?.t">{{ statusTag[row.status]?.l ?? row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <template v-if="row.status === 'pending'">
            <el-button size="small" type="primary" @click="approve(row)">通过</el-button>
            <el-button size="small" type="danger" @click="reject(row)">驳回</el-button>
          </template>
          <span v-else style="color: #909399">{{ statusTag[row.status]?.l }}</span>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>