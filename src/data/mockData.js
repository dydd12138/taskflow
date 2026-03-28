import { addDays, subDays, format, startOfWeek, addWeeks } from 'date-fns';

const today = new Date();
today.setHours(0, 0, 0, 0);

const fmt = (d) => format(d, "yyyy-MM-dd'T'HH:mm:ss");
const fmtDate = (d) => format(d, 'yyyy-MM-dd');

export const INITIAL_CATEGORIES = [
  { id: 'cat-1', name: '工作', color: '#3b82f6', collapsed: false, order: 0 },
  { id: 'cat-2', name: '个人', color: '#8b5cf6', collapsed: false, order: 1 },
];

export const INITIAL_PROJECTS = [
  { id: 'proj-1', categoryId: 'cat-1', name: '产品需求', color: '#3b82f6', order: 0 },
  { id: 'proj-2', categoryId: 'cat-1', name: '技术方案', color: '#06b6d4', order: 1 },
  { id: 'proj-3', categoryId: 'cat-2', name: '读书计划', color: '#8b5cf6', order: 0 },
  { id: 'proj-4', categoryId: null, name: '临时事项', color: '#f59e0b', order: 0 },
];

export const INITIAL_TASKS = [
  // 产品需求
  {
    id: 'task-1', projectId: 'proj-1', title: '用户故事地图整理',
    dueDate: fmt(addDays(today, 2)), startDate: null, endDate: null,
    priority: 'high', status: 'in_progress', completed: false,
    notes: '需要梳理核心用户旅程，优先完成登录注册流程的故事地图。', order: 0, deletedAt: null,
  },
  {
    id: 'task-2', projectId: 'proj-1', title: '竞品分析报告',
    dueDate: null, startDate: fmt(subDays(today, 1)), endDate: fmt(addDays(today, 3)),
    priority: 'medium', status: 'in_progress', completed: false,
    notes: '重点分析 Linear、Notion、TickTick 的任务管理功能设计。', order: 1, deletedAt: null,
  },
  {
    id: 'task-3', projectId: 'proj-1', title: '原型设计 V1',
    dueDate: fmt(addDays(today, 7)), startDate: null, endDate: null,
    priority: 'high', status: 'not_started', completed: false,
    notes: '基于用户故事地图完成核心页面原型。', order: 2, deletedAt: null,
  },
  {
    id: 'task-4', projectId: 'proj-1', title: '需求评审会议',
    dueDate: fmt(subDays(today, 2)), startDate: null, endDate: null,
    priority: 'low', status: 'completed', completed: true,
    notes: '已完成，结论：优先开发任务管理核心功能。', order: 3, deletedAt: null,
  },
  {
    id: 'task-5', projectId: 'proj-1', title: '产品路线图更新',
    dueDate: fmt(subDays(today, 1)), startDate: null, endDate: null,
    priority: 'medium', status: 'not_started', completed: false,
    notes: '更新 Q2 产品路线图，同步给各团队。', order: 4, deletedAt: null,
  },

  // 技术方案
  {
    id: 'task-6', projectId: 'proj-2', title: '数据库 Schema 设计',
    dueDate: fmt(addDays(today, 1)), startDate: null, endDate: null,
    priority: 'high', status: 'in_progress', completed: false,
    notes: '设计任务、项目、用户相关表结构，考虑软删除和版本控制。', order: 0, deletedAt: null,
  },
  {
    id: 'task-7', projectId: 'proj-2', title: 'API 接口文档',
    dueDate: null, startDate: fmt(today), endDate: fmt(addDays(today, 4)),
    priority: 'medium', status: 'in_progress', completed: false,
    notes: '使用 OpenAPI 3.0 规范编写 REST API 文档。', order: 1, deletedAt: null,
  },
  {
    id: 'task-8', projectId: 'proj-2', title: '技术选型方案',
    dueDate: fmt(subDays(today, 3)), startDate: null, endDate: null,
    priority: 'high', status: 'completed', completed: true,
    notes: '选型结果：React + Node.js + PostgreSQL + Redis。', order: 2, deletedAt: null,
  },
  {
    id: 'task-9', projectId: 'proj-2', title: '性能基准测试',
    dueDate: fmt(addDays(today, 10)), startDate: null, endDate: null,
    priority: 'low', status: 'not_started', completed: false,
    notes: '测试关键接口的响应时间和并发能力。', order: 3, deletedAt: null,
  },
  {
    id: 'task-10', projectId: 'proj-2', title: '安全审计清单',
    dueDate: fmt(addDays(today, 5)), startDate: null, endDate: null,
    priority: 'medium', status: 'not_started', completed: false,
    notes: '涵盖 OWASP Top 10 的安全检查项。', order: 4, deletedAt: null,
  },

  // 读书计划
  {
    id: 'task-11', projectId: 'proj-3', title: '《深度工作》读完第一部分',
    dueDate: fmt(addDays(today, 3)), startDate: null, endDate: null,
    priority: 'medium', status: 'in_progress', completed: false,
    notes: '重点摘录深度工作的定义和价值论述。', order: 0, deletedAt: null,
  },
  {
    id: 'task-12', projectId: 'proj-3', title: '《系统思考》笔记整理',
    dueDate: null, startDate: fmt(subDays(today, 2)), endDate: fmt(addDays(today, 1)),
    priority: 'low', status: 'in_progress', completed: false,
    notes: '整理关于反馈环路和系统结构的核心概念。', order: 1, deletedAt: null,
  },
  {
    id: 'task-13', projectId: 'proj-3', title: '《设计中的设计》精读',
    dueDate: fmt(addDays(today, 14)), startDate: null, endDate: null,
    priority: 'low', status: 'not_started', completed: false,
    notes: '原研哉的设计哲学，重点关注「空」的概念。', order: 2, deletedAt: null,
  },
  {
    id: 'task-14', projectId: 'proj-3', title: '月度读书分享',
    dueDate: fmt(addDays(today, 6)), startDate: null, endDate: null,
    priority: 'medium', status: 'not_started', completed: false,
    notes: '准备 10 分钟的读书分享 PPT。', order: 3, deletedAt: null,
  },

  // 临时事项
  {
    id: 'task-15', projectId: 'proj-4', title: '购买生日礼物',
    dueDate: fmt(addDays(today, 1)), startDate: null, endDate: null,
    priority: 'high', status: 'not_started', completed: false,
    notes: '给妈妈买生日礼物，预算 500 元以内。', order: 0, deletedAt: null,
  },
  {
    id: 'task-16', projectId: 'proj-4', title: '健身房年卡续费',
    dueDate: fmt(subDays(today, 1)), startDate: null, endDate: null,
    priority: 'medium', status: 'not_started', completed: false,
    notes: '到期前续费有 8 折优惠。', order: 1, deletedAt: null,
  },
  {
    id: 'task-17', projectId: 'proj-4', title: '整理电脑文件',
    dueDate: null, startDate: fmt(today), endDate: fmt(addDays(today, 2)),
    priority: 'none', status: 'not_started', completed: false,
    notes: '清理下载文件夹，整理项目归档。', order: 2, deletedAt: null,
  },
  {
    id: 'task-18', projectId: 'proj-4', title: '预约牙科检查',
    dueDate: fmt(addDays(today, 4)), startDate: null, endDate: null,
    priority: 'low', status: 'not_started', completed: false,
    notes: '上次检查是半年前了，该定期检查了。', order: 3, deletedAt: null,
  },
];

export const INITIAL_DELETED_TASKS = [
  {
    id: 'del-1', projectId: 'proj-1', title: '旧版需求文档归档',
    dueDate: fmt(subDays(today, 10)), startDate: null, endDate: null,
    priority: 'low', status: 'completed', completed: true,
    notes: '已归档到 Confluence。', order: 99, deletedAt: fmt(subDays(today, 5)),
  },
];

export const PRIORITY_CONFIG = {
  none:   { label: '无',   color: 'text-slate-400',  bg: 'bg-slate-100 dark:bg-slate-700',  dot: '#94a3b8' },
  low:    { label: '低',   color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/30', dot: '#22c55e' },
  medium: { label: '中',   color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/30', dot: '#f59e0b' },
  high:   { label: '高',   color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/30',    dot: '#ef4444' },
};

export const STATUS_CONFIG = {
  none:        { label: '无标记',  color: 'text-slate-500',  bg: 'bg-slate-100 dark:bg-slate-700' },
  in_progress: { label: '推进中',  color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/30' },
  blocked:     { label: '搁置',    color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/30' },
};
