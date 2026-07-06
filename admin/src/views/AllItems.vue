<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { http } from '@/utils/http';

const route = useRoute();
const list = ref<any[]>([]);
const loading = ref(false);
const filterCompleted = ref(route.query.status === 'completed');

const orderStatusMap: Record<string, string> = {
  pending: '未支付',
  paid: '已支付',
  shipped: '已发货',
  completed: '已完成',
  canceled: '已取消',
};

function itemStatus(row: any) {
  // 有订单 → 显示发货状态
  if (row.auction && row.auction.order) return orderStatusMap[row.auction.order.status] || row.auction.order.status;
  // 有拍卖但无订单 → 显示拍卖状态
  if (row.auction) {
    var amap: Record<string, string> = { scheduled: '待开始', live: '进行中', ended: '已结束', canceled: '已取消', settled: '已成交' };
    return '拍卖' + (amap[row.auction.status] || row.auction.status);
  }
  // 无拍卖 → 显示拍品状态
  var smap: Record<string, string> = { approved: '已通过', rejected: '已驳回', removed: '已下架' };
  return smap[row.status] || row.status;
}

function itemStatusType(row: any) {
  if (row.auction && row.auction.order) return row.auction.order.status === 'shipped' || row.auction.order.status === 'completed' ? 'success' : 'warning';
  if (row.status === 'approved') return 'success';
  if (row.status === 'rejected') return 'danger';
  return 'info';
}

async function load() {
  loading.value = true;
  try {
    const res: any = await http.get('/admin/items/all');
    var all = res.data ?? [];
    if (filterCompleted.value) {
      all = all.filter(function (i: any) { return i.auction && i.auction.order && i.auction.order.status === 'completed'; });
    }
    list.value = all;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <el-card>
    <template #header>
      <span>{{ filterCompleted ? '已成交拍品' : '拍品管理' }}</span>
    </template>

    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="condition" label="成色" width="100" />
      <el-table-column label="原价/起拍价" width="160">
        <template #default="{ row }">¥{{ row.originPrice }} / ¥{{ row.startPrice }}</template>
      </el-table-column>
      <el-table-column label="卖家" width="120">
        <template #default="{ row }">{{ row.seller?.nickname ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="发货状态" width="140">
        <template #default="{ row }">
          <el-tag :type="itemStatusType(row)">{{ itemStatus(row) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180" />
    </el-table>
  </el-card>
</template>
