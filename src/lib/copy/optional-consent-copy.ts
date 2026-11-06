import type { Locale } from '@/lib/copy';

/** Banner and testimonial notice. Not a privacy-policy rewrite. */
export const optionalConsentCopy: Record<Locale, {
  title: string;
  body: string;
  accept: string;
  reject: string;
  choices: string;
  disclaimer: string;
}> = {
  en: {
    title: 'Optional cookies',
    body: 'Advertising and analytics cookies stay off unless you allow them. The quiz works either way.',
    accept: 'Allow optional cookies',
    reject: 'Reject optional cookies',
    choices: 'Cookie choices',
    disclaimer: 'Results vary. AI nutrition estimates are not medical advice.',
  },
  vi: {
    title: 'Cookie tùy chọn',
    body: 'Cookie quảng cáo và thống kê chỉ bật khi bạn cho phép. Bài trắc nghiệm vẫn dùng được nếu bạn từ chối.',
    accept: 'Cho phép cookie tùy chọn',
    reject: 'Từ chối cookie tùy chọn',
    choices: 'Lựa chọn cookie',
    disclaimer: 'Kết quả có thể khác nhau. Ước tính dinh dưỡng bằng AI không phải tư vấn y khoa.',
  },
};
