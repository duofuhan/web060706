<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getDisputes, takeDispute, resolveDispute } from '@/api/admin';

const list = ref<any[]>([]);
const loading = ref(false);
const filterStatus = ref('');

const statusTag: Record<string, any> = {
  open: { t: 'danger', l: '待处理' },
  processing: { t: 'warning', l: '处理中' },
  resolved: { t: 'success', l: '已解决' },
  rejected: { t: 'info', l: '已驳回' },
};

async function load() {
  loading.value = true;
  try {
    const res: any = await getDisputes({ status: filterStatus.value || undefined, pageSize: 50 });
    list.value = res.data?.list ?? [];
  } finally {
    loading.value = false;
  }
}

async function take(row: any) {
  await takeDispute(row.id);
  ElMessage.success('已受理');
  load();
}

async function resolve(row: any) {
  const { value } = await ElMessageBox.prompt('请输入处理结果', `解决争议 #${row.id}`, {
    type: 'success',
    inputPlaceholder: '处理方案描述…',
  });
  await resolveDispute(row.id, { approved: true, resolution: value });
  ElMessage.success('已解决');
  load();
}

async function reject(row: any) {
  const { value } = await ElMessageBox.prompt('请输入驳回原因', `驳回争议 #${row.id}`, {
    type: 'warning',
  });
  await resolveDispute(row.id, { approved: false, resolution: value });
  ElMessage.success('已驳回');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <template #header>
      <div style="display: flex; align-items: center; justify-content: space-between">
        <span>争议处理</span>
        <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 160px" @change="load">
          <el-option v-for="(v, k) in statusTag" :key="k" :label="v.l" :value="k" />
        </el-select>
      </div>
    </template>

    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="拍品">
        <template #default="{ row }">{{ row.auction?.item?.name ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="发起人" width="120">
        <template #default="{ row }">{{ row.opener?.nickname ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="reason" label="争议原因" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTag[row.status]?.t">{{ statusTag[row.status]?.l ?? row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="resolution" label="处理结果" show-overflow-tooltip />
      <el-table-column label="操作" width="240">
        <template #default="{ row }">
          <template v-if="row.status === 'open'">
            <el-button size="small" type="primary" @click="take(row)">受理</el-button>
          </template>
          <template v-if="row.status === 'open' || row.status === 'processing'">
            <el-button size="small" type="success" @click="resolve(row)">解决</el-button>
            <el-button size="small" type="danger" @click="reject(row)">驳回</el-button>
          </template>
          <span v-else style="color: #909399">已处理</span>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>