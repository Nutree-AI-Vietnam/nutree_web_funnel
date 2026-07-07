/**
 * All Vietnamese copy, keyed by quiz step slug (matches OnboardingScreenId.rcKey
 * in nutree_ai). Structured so adding a locale later = adding a sibling module.
 */
export const vi = {
  common: {
    continue: 'Tiếp tục',
    back: 'Quay lại',
    skip: 'Bỏ qua',
    retry: 'Thử lại',
  },
  landing: {
    headline: 'Kế hoạch dinh dưỡng khoa học, thiết kế riêng cho bạn',
    subheadline:
      'Trả lời vài câu hỏi (chỉ mất 3 phút) để nhận mục tiêu calo & macro cá nhân hóa từ Nutree.',
    cta: 'Bắt đầu ngay',
    bullets: [
      'Công thức được kiểm chứng khoa học',
      'Macro tối ưu theo mục tiêu của bạn',
      'Gợi ý bữa ăn AI phù hợp macro',
    ],
  },
  name_ask: {
    question: 'Tên bạn là gì?',
    placeholder: 'Nhập tên của bạn',
  },
  goal: {
    question: 'Mục tiêu chính của bạn là gì?',
    options: [
      { key: 'cut', label: 'Giảm cân' },
      { key: 'bulk', label: 'Tăng cơ' },
      { key: 'recomp', label: 'Cải thiện vóc dáng' },
    ],
  },
  target_weight: {
    question: 'Cân nặng mục tiêu của bạn?',
    unit: 'kg',
  },
  challenges: {
    question: 'Bạn đã gặp khó khăn nào?',
    hint: 'Chọn tất cả các mục phù hợp',
    options: [
      { key: 'no_time', label: 'Không có thời gian' },
      { key: 'no_motivation', label: 'Thiếu động lực' },
      { key: 'dont_know_what_to_eat', label: 'Không biết ăn gì' },
      { key: 'cant_stick_to_diet', label: 'Không thể duy trì chế độ ăn' },
      { key: 'slow_progress', label: 'Tiến độ chậm' },
      { key: 'cravings', label: 'Thèm ăn vặt' },
      { key: 'stress_eating', label: 'Ăn do stress' },
      { key: 'confusion', label: 'Quá nhiều lời khuyên mâu thuẫn' },
      { key: 'past_failures', label: 'Thất bại trước đây' },
    ],
  },
  referral_source: {
    question: 'Bạn biết đến chúng tôi qua đâu?',
    options: [
      { key: 'facebook_group', label: 'Facebook' },
      { key: 'youtube', label: 'YouTube' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'tiktok', label: 'TikTok' },
      { key: 'google_search', label: 'Google' },
      { key: 'friend_family', label: 'Bạn bè / gia đình' },
      { key: 'other', label: 'Khác' },
    ],
  },
  duration: {
    question: 'Bạn đã cố gắng đạt mục tiêu trong bao lâu?',
    options: [
      { key: 'just_starting', label: 'Mới bắt đầu' },
      { key: 'few_months', label: 'Vài tháng' },
      { key: 'over_a_year', label: 'Hơn một năm' },
      { key: 'several_years', label: 'Nhiều năm' },
    ],
  },
  reflection: {
    template:
      '[name], mục tiêu [goal] của bạn đã rõ ràng. Nhiều người gặp [challenges] — nhưng với kế hoạch đúng đắn, bạn có thể đạt được trong [duration].',
    fallbackName: 'Bạn',
  },
  sex: {
    question: 'Giới tính sinh học của bạn?',
    options: [
      { key: 'male', label: 'Nam' },
      { key: 'female', label: 'Nữ' },
    ],
  },
  age: {
    question: 'Bạn bao nhiêu tuổi?',
    unit: 'tuổi',
  },
  height_weight: {
    question: 'Chiều cao và cân nặng hiện tại?',
    heightLabel: 'Chiều cao (cm)',
    weightLabel: 'Cân nặng (kg)',
  },
  body_fat: {
    question: 'Ước tính tỷ lệ mỡ cơ thể? (tùy chọn)',
    hint: 'Nếu không chắc, bạn có thể bỏ qua — chúng tôi sẽ dùng công thức tiêu chuẩn.',
    unit: '%',
  },
  training_days: {
    question: 'Bạn tập mấy ngày mỗi tuần?',
    unit: 'ngày/tuần',
  },
  training_duration: {
    question: 'Mỗi buổi tập của bạn kéo dài bao lâu?',
    options: [
      { key: '30', label: '~30 phút' },
      { key: '45', label: '~45 phút' },
      { key: '60', label: '~60 phút' },
      { key: '90', label: '90 phút trở lên' },
    ],
  },
  experience: {
    question: 'Kinh nghiệm tập luyện của bạn?',
    options: [
      { key: 'beginner', label: 'Người mới (< 1 năm)' },
      { key: 'intermediate', label: 'Trung cấp (1–3 năm)' },
      { key: 'advanced', label: 'Nâng cao (3+ năm)' },
    ],
  },
  training_type: {
    question: 'Bạn thường tập loại hình nào?',
    hint: 'Chọn tất cả các mục phù hợp',
    options: [
      { key: 'weights', label: 'Tập tạ' },
      { key: 'cardio', label: 'Cardio' },
      { key: 'yoga', label: 'Yoga' },
      { key: 'running', label: 'Chạy bộ' },
      { key: 'swimming', label: 'Bơi lội' },
      { key: 'martial_arts', label: 'Võ thuật' },
      { key: 'calisthenics', label: 'Calisthenics' },
      { key: 'pilates', label: 'Pilates' },
      { key: 'hiit', label: 'HIIT' },
      { key: 'cycling', label: 'Đạp xe' },
      { key: 'dance', label: 'Nhảy' },
    ],
  },
  activity_level: {
    question: 'Mức độ hoạt động hàng ngày của bạn?',
    options: [
      { key: 'desk', label: 'Văn phòng / ngồi nhiều' },
      { key: 'on_feet', label: 'Đứng / di chuyển cả ngày' },
      { key: 'physical', label: 'Lao động chân tay' },
    ],
  },
  diet: {
    question: 'Bạn có yêu cầu dinh dưỡng đặc biệt không?',
    hint: 'Chọn tất cả các mục phù hợp',
    options: [
      { key: 'vegan', label: 'Thuần chay' },
      { key: 'gluten_free', label: 'Không gluten' },
      { key: 'dairy_free', label: 'Không sữa' },
      { key: 'halal', label: 'Halal' },
      { key: 'none', label: 'Không có yêu cầu' },
    ],
  },
  tdee_science_promo: {
    headline: 'Mục tiêu calo dựa trên khoa học',
    body: 'Chúng tôi dùng công thức được kiểm chứng khoa học để tính toán nhu cầu calo chính xác của bạn.',
  },
  smart_macro_promo: {
    headline: 'Macro tối ưu theo mục tiêu của bạn',
    body: 'Protein, carbs và chất béo được thiết lập dựa trên mục tiêu, cân nặng và lịch tập — không phải tỷ lệ chung chung.',
  },
  smart_meals_promo: {
    headline: 'Gợi ý bữa ăn AI phù hợp macro của bạn',
    body: 'Mỗi ý tưởng bữa ăn được tạo ra để phù hợp với mục tiêu hàng ngày của bạn.',
  },
  calculating: {
    text: 'Đang xây dựng kế hoạch cá nhân cho [name]...',
    steps: [
      'Phân tích chỉ số cơ thể...',
      'Tính toán TDEE của bạn...',
      'Tối ưu macro theo mục tiêu...',
      'Hoàn thiện kế hoạch...',
    ],
  },
  tdee_targets: {
    headline: 'Mục tiêu hàng ngày của bạn',
    calories: 'Calo mỗi ngày',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Chất béo',
    bmiTitle: 'Chỉ số BMI của bạn',
    bmiCategories: {
      underweight: 'Thiếu cân',
      normal: 'Bình thường',
      overweight: 'Thừa cân',
      obese: 'Béo phì',
    },
    projectionTitle: 'Lộ trình đến cân nặng mục tiêu',
    projectionWeeks: (weeks: number) => `Dự kiến ${weeks} tuần`,
  },
  result_promising: {
    headline: '[name], kế hoạch của bạn đã sẵn sàng.',
    body: 'Người dùng Nutree theo sát kế hoạch thường thấy thay đổi rõ rệt trong 12 tuần đầu.',
    withNutree: 'Với Nutree',
    withoutNutree: 'Tự theo dõi',
    cta: 'Nhận kế hoạch của tôi',
  },
  email: {
    headline: 'Kế hoạch của bạn đã sẵn sàng!',
    body: 'Nhập email để lưu kế hoạch và tiếp tục. Chúng tôi sẽ gửi link tải ứng dụng cho bạn.',
    placeholder: 'email@vidu.com',
    cta: 'Lưu kế hoạch của tôi',
    invalid: 'Email không hợp lệ',
    error: 'Có lỗi xảy ra. Vui lòng thử lại.',
  },
  paywall: {
    headline: 'Mở khóa kế hoạch đầy đủ của bạn',
    bullets: [
      'Mục tiêu calo & macro cá nhân hóa',
      'Gợi ý bữa ăn AI mỗi ngày',
      'Theo dõi tiến độ & điều chỉnh tự động',
    ],
    cta: 'Bắt đầu ngay',
    loading: 'Đang tải các gói...',
    error: 'Không tải được gói đăng ký. Vui lòng thử lại.',
    paymentError: 'Thanh toán chưa hoàn tất. Vui lòng thử lại.',
  },
  success: {
    headline: 'Thanh toán thành công! 🎉',
    body: 'Bước cuối: tải ứng dụng Nutree. Kế hoạch của bạn sẽ tự động xuất hiện khi mở app.',
    qrHint: 'Quét mã QR bằng điện thoại',
    emailHint: 'Chúng tôi cũng đã gửi link tải qua email — kiểm tra hộp thư nếu bạn đang dùng máy tính.',
    appStore: 'Tải trên App Store',
    playStore: 'Tải trên Google Play',
  },
} as const;

export type ViCopy = typeof vi;
