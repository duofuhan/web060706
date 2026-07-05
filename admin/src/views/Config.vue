<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getConfigs, updateConfig } from '@/api/admin';

const list = ref<any[]>([]);
const loading = ref(false);
const editingKey = ref<string | null>(null);
const editValue = ref('');

async function load() {
  loading.value = true;
  try {
    const res: any = await getConfigs();
    list.value = res.data ?? [];
  } finally {
    loading.value = false;
  }
}

function edit(row: any) {
  editingKey.value = row.key;
  editValue.value = row.value;
}

async function save() {
  if (!editingKey.value) return;
  await updateConfig(editingKey.value, editValue.value);
  ElMessage.success('已保存');
  editingKey.value = null;
  load();
}

function cancel() { editingKey.value = null; }

onMounted(load);
</script>

<template>
  <el-card>
    <template #header>系统配置</template>
    <el-empty v-if="!list.length && !loading" description="暂无配置项" />
    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="key" label="配置键" width="220" />
      <el-table-column label="配置值">
        <template #default="{ row }">
          <el-input v-if="editingKey === row.key" v-model="editValue" />
          <span v-else>{{ row.value }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="说明" show-overflow-tooltip />
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <template v-if="editingKey === row.key">
            <el-button size="small" type="primary" @click="save">保存</el-button>
            <el-button size="small" @click="cancel">取消</el-button>
          </template>
          <el-button v-else size="small" @click="edit(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>