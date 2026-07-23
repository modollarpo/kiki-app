// Shared Type Definitions
export interface User { id: string; email: string; firstName: string; lastName: string; role: string; tenantId: string; }
export interface Tenant { id: string; name: string; }
export interface Campaign { id: string; name: string; platform: string; status: string; budget: number; spend: number; revenue: number; conversions: number; impressions: number; clicks: number; targetRoas?: number; startDate?: string; endDate?: string; description?: string; createdAt: string; updatedAt: string; }
export interface CampaignPerformance { campaignId: string; roas: number; cpa: number; ctr: number; }
export type CampaignStatus = 'active' | 'paused' | 'completed' | 'draft' | 'rejected';
export type Platform = 'meta' | 'google' | 'tiktok' | 'snap' | 'linkedin' | 'pinterest';
export interface Agent { id: string; name: string; type: string; status: string; config: any; }
export interface Wallet { id: string; balance: number; currency: string; accountType: string; }
export interface Transaction { id: string; type: string; amount: number; currency: string; status: string; description: string; createdAt: string; }
export interface PaymentMethod { id: string; type: string; name: string; last4: string; expiry: string; isDefault: boolean; status: string; }
export interface Notification { id: string; type: string; title: string; message: string; priority: string; status: string; createdAt: string; actionRequired?: boolean; actionUrl?: string; data?: any; tenantId?: string; userId?: string; }
export type NotificationType = 'campaign' | 'agent' | 'wallet' | 'system' | 'alert' | 'info';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';
export type TransactionType = 'credit' | 'debit' | 'refund' | 'fee' | 'transfer';
export type AgentStatus = 'running' | 'paused' | 'stopped' | 'error';
export interface AgentAction { id: string; type: string; status: string; timestamp: string; }
export interface WalletTransaction { id: string; amount: number; type: TransactionType; status: string; description: string; createdAt: string; }
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export interface KPI { spend: number; revenue: number; roas: number; cpa: number; ctr: number; conversions: number; impressions: number; clicks: number; }
export interface LoginRequest { email: string; password: string; }
export interface LoginResponse { user: User; token: string; refreshToken: string; tenant: Tenant; }
