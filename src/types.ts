export enum RiskLevel {
  RED = 'RED',     // 高频访：14天/次
  YELLOW = 'YELLOW', // 重点访：30天/次
  GREEN = 'GREEN'   // 日常访
}

export interface Household {
  id: string;
  name: string;
  phone: string;
  address: string;
  riskLevel: RiskLevel;
  riskReason: string; // 关注原因
  notes: string; // 备注
  skills: string[]; // 如：草编, 粘豆包
  lastVisitedAt: string | null;
  members: string; // 家庭成员描述
}

export interface VisitRecord {
  id: string;
  householdId: string;
  householdName: string;
  visitorName: string;
  visitedAt: string;
  content: string; // 走访记录
  status: string; // 身体状况等
  image?: string;
}

export interface CreditRecord {
  id: string;
  householdId: string;
  householdName: string;
  type: 'EARN' | 'SPEND';
  category: string; // 环境卫生, 志愿服务等
  points: number;
  description: string;
  evidenceImage?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  pointsRequired: number;
}
