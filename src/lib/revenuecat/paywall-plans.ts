export interface RevenueCatPaywallPlan {
  id: '4-week' | '12-week' | '52-week';
  label: { en: string; vi: string };
  description: { en: string; vi: string };
  billingLabel: { en: string; vi: string };
  recommended: boolean;
}

export const revenueCatPaywallPlans: RevenueCatPaywallPlan[] = [
  {
    id: '4-week',
    label: { en: '4-week', vi: '4 tuần' },
    description: { en: 'Start with 4-week flexibility', vi: 'Linh hoạt trong 4 tuần đầu' },
    billingLabel: { en: 'Every 4 weeks', vi: 'Mỗi 4 tuần' },
    recommended: false,
  },
  {
    id: '12-week',
    label: { en: '12-week', vi: '12 tuần' },
    description: { en: 'Recommended for a full 12-week rhythm', vi: 'Đủ 12 tuần để tạo nhịp theo dõi' },
    billingLabel: { en: 'Every 12 weeks', vi: 'Mỗi 12 tuần' },
    recommended: true,
  },
  {
    id: '52-week',
    label: { en: '52-week', vi: '52 tuần' },
    description: { en: 'Best for 52 weeks of consistency', vi: 'Theo dõi trọn 52 tuần, ít gián đoạn hơn' },
    billingLabel: { en: 'Every 52 weeks', vi: 'Mỗi 52 tuần' },
    recommended: false,
  },
];
