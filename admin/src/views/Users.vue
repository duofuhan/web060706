<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getUsers, createUser, updateUser, disableUser, type UserItem } from '@/api/admin';

const list = ref<UserItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const keyword = ref('');

const roleMap: Record<string, string> = {
  seller: '卖家', buyer: '买家', auction_admin: '拍卖管理员', system_admin: '系统管理员',
};
const roleOptions = [
  { label: '全部', value: '' },
  { label: '卖家', value: 'seller' },
  { label: '买家', value: 'buyer' },
  { label: '拍卖管理员', value: 'auction_admin' },
  { label: '系统管理员', value: 'system_admin' },
];
const filterRole = ref('');

const dialogVisible = ref(false);
const dialogTitle = ref('新建用户');
const form = ref<any>({});

async function load() {
  loading.value = true;
  try {
    const res: any = await getUsers({ page: page.value, pageSize: pageSize.value, keyword: keyword.value, role: filterRole.value });
    list.value = res.data?.list ?? [];
    total.value = res.data?.total ?? 0;
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  page.value = 1;
  load();
}

function openCreate() {
  dialogTitle.value = '新建用户';
  form.value = { username: '', password: '', nickname: '', role: 'buyer' };
  dialogVisible.value = true;
}

function openEdit(row: UserItem) {
  dialogTitle.value = '编辑用户';
  form.value = { ...row, password: '' };
  dialogVisible.value = true;
}

async function submit() {
  try {
    if (dialogTitle.value === '新建用户') {
      await createUser(form.value);
      ElMessage.success('已创建');
    } else {
      const { id, ...rest } = form.value;
      const payload: any = { nickname: rest.nickname, role: rest.role, status: rest.status };
      if (rest.password) payload.password = rest.password;
      await updateUser(id, payload);
      ElMessage.success('已更新');
    }
    dialogVisible.value = false;
    load();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
}

async function onDisable(row: UserItem) {
  await ElMessageBox.confirm(`确定禁用 ${row.username} ?`, '提示', { type: 'warning' });
  await disableUser(row.id);
  ElMessage.success('已禁用');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <template #header>
      <div style="display: flex; align-items: center; justify-content: space-between">
        <span>用户管理</span>
        <el-button type="primary" @click="openCreate">新建用户</el-button>
      </div>
    </template>

    <div style="margin-bottom: 16px">
      <el-input v-model="keyword" placeholder="用户名搜索" style="width: 200px; margin-right: 8px" clearable @keyup.enter="onSearch" />
      <el-select v-model="filterRole" placeholder="角色筛选" style="width: 160px; margin-right: 8px" @change="onSearch">
        <el-option v-for="r in roleOptions" :key="r.value" :label="r.label" :value="r.value" />
      </el-select>
      <el-button @click="onSearch">查询</el-button>
    </div>

    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="账号" />
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column label="角色">
        <template #default="{ row }">{{ roleMap[row.role] ?? row.role }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180" />
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDisable(row)">禁用</el-button>
        </template>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="420px">
      <el-form label-width="80px">
        <el-form-item label="账号" v-if="dialogTitle === '新建用户'">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password :placeholder="dialogTitle === '编辑用户' ? '留空不修改' : ''" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width: 100%">
            <el-option v-for="r in roleOptions.filter(x => x.value)" :key="r.value" :label="r.label" :value="r.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" v-if="dialogTitle === '编辑用户'">
          <el-select v-model="form.status" style="width: 100%">
            <el-option :value="1" label="启用" />
            <el-option :value="0" label="禁用" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>