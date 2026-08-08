export type RevenueCatPaywallPlanId = '4-week' | '12-week' | '52-week' | '1-week';

export function isRevenueCatPaywallPlanId(value: string): value is RevenueCatPaywallPlanId {
  return value === '1-week' || value === '4-week' || value === '12-week' || value === '52-week';
}

type PublicEnvironment = Record<string, string | undefined>;

export interface RevenueCatPaywallPlan {
  id: RevenueCatPaywallPlanId;
  label: { en: string; vi: string };
  description: { en: string; vi: string };
  billingLabel: { en: string; vi: string };
  recommended: boolean;
}

export function isOneWeekPlanEnabled(source?: PublicEnvironment): boolean {
  const environment = source ?? {
    NEXT_PUBLIC_REVENUECAT_WEB_1_WEEK_ENABLED: process.env.NEXT_PUBLIC_REVENUECAT_WEB_1_WEEK_ENABLED,
    NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_1_WEEK: process.env.NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_1_WEEK,
    NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_52_WEEK: process.env.NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_52_WEEK,
  };
  const toggle = environment.NEXT_PUBLIC_REVENUECAT_WEB_1_WEEK_ENABLED?.trim().toLowerCase();
  if (toggle) return toggle === 'true';
  return Boolean(environment.NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_1_WEEK?.trim()) && !environment.NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_52_WEEK?.trim();
}

export function createRevenueCatPaywallPlans(oneWeekEnabled = isOneWeekPlanEnabled()): RevenueCatPaywallPlan[] {
  const finalPlan = oneWeekEnabled
      ? {
          id: '1-week' as const,
          label: { en: '1-week', vi: '1 tuần' },
          description: { en: 'Try a focused 1-week plan', vi: 'Thử kế hoạch tập trung trong 1 tuần' },
          billingLabel: { en: 'Every 1 week', vi: 'Mỗi 1 tuần' },
          recommended: false,
        }
      : {
          id: '52-week' as const,
          label: { en: '52-week', vi: '52 tuần' },
          description: { en: 'Best for 52 weeks of consistency', vi: 'Theo dõi trọn 52 tuần, ít gián đoạn hơn' },
          billingLabel: { en: 'Every 52 weeks', vi: 'Mỗi 52 tuần' },
          recommended: false,
        };

  return [
    finalPlan,
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
  ];
}

export const revenueCatPaywallPlans = createRevenueCatPaywallPlans();
