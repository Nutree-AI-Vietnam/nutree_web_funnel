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
    progress: 'Tiến độ bài quiz',
    stepCount: (current: number, total: number) => `Câu ${current}/${total}`,
  },
  metric: {
    decrement: (label: string) => `Giảm ${label}`,
    increment: (label: string) => `Tăng ${label}`,
    rangeError: (label: string, min: number, max: number, unit: string) =>
      `${label} cần nằm trong khoảng ${min}-${max} ${unit}.`,
    quickAdjust: (value: string) => `Điều chỉnh ${value}`,
  },
  landing: {
    eyebrow: '',
    headline: 'Một mục tiêu ăn uống rõ ràng cho hôm nay.',
    subheadline:
      'Nutree tính calo, macro và nhịp theo dõi từ cơ thể, mục tiêu và lịch tập của bạn.',
    cta: 'Bắt đầu ngay',
    legal: 'Bằng việc tiếp tục, bạn đồng ý để Nutree cá nhân hóa kế hoạch từ câu trả lời của bạn.',
    language: 'VI',
    planBadge: 'Plan',
    planTitle: 'Kế hoạch hôm nay',
    planSubtitle: 'Calo, macro và nhịp ăn trong ngày',
    bullets: [
      'TDEE và BMI rõ ràng',
      'Macro chia thành mục tiêu mỗi ngày',
      'Gợi ý bữa ăn khớp macro',
    ],
    proofStats: [
      { value: '3 phút', label: 'để có mục tiêu macro' },
      { value: '0đ', label: 'để xem kết quả ban đầu' },
    ],
    slides: [
      {
        title: 'Macro cá nhân hóa',
        body: 'Tính calo, protein, carb và fat dựa trên chiều cao, cân nặng, mục tiêu và mức vận động của bạn.',
        metric: '4 chỉ số',
      },
      {
        title: 'Bữa ăn khớp mục tiêu',
        body: 'Nutree gợi ý bữa ăn AI theo macro đã tính, giúp bạn chọn món nhanh hơn mỗi ngày.',
        metric: 'AI meal',
      },
      {
        title: 'Điều chỉnh theo tiến độ',
        body: 'Khi cân nặng và thói quen thay đổi, kế hoạch có thể được cập nhật để bám sát mục tiêu hơn.',
        metric: 'Theo dõi',
      },
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
    label: 'Cân nặng mục tiêu',
    hint: 'Nhập số chính xác hoặc điều chỉnh nhanh theo từng nấc nhỏ.',
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
      { key: 'facebook_group', label: 'Facebook', icon: 'facebook' },
      { key: 'youtube', label: 'YouTube', icon: 'youtube' },
      { key: 'instagram', label: 'Instagram', icon: 'instagram' },
      { key: 'tiktok', label: 'TikTok', icon: 'tiktok' },
      { key: 'google_search', label: 'Google', icon: 'google' },
      { key: 'friend_family', label: 'Bạn bè / gia đình', icon: 'people' },
      { key: 'other', label: 'Khác', icon: 'spark' },
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
    label: 'Tuổi',
    hint: 'Tuổi giúp Nutree tính nhu cầu năng lượng phù hợp hơn.',
    unit: 'tuổi',
  },
  height: {
    question: 'Chiều cao hiện tại của bạn?',
    heightLabel: 'Chiều cao',
    heightHint: 'Dùng chiều cao hiện tại của bạn.',
    heightUnit: 'cm',
  },
  weight: {
    question: 'Cân nặng hiện tại của bạn?',
    weightLabel: 'Cân nặng hiện tại',
    weightHint: 'Dùng cân nặng gần nhất để tính TDEE.',
    weightUnit: 'kg',
  },
  body_fat: {
    question: 'Ước tính tỷ lệ mỡ cơ thể? (tùy chọn)',
    hint: 'Nếu không chắc, bạn có thể bỏ qua — chúng tôi sẽ dùng công thức tiêu chuẩn.',
    label: 'Tỷ lệ mỡ cơ thể',
    inputHint: 'Nhập ước tính gần nhất nếu bạn có số đo.',
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
    section: '04',
    kicker: 'Đã xong phần lối sống',
    headline: 'Nutree đang ghép dữ liệu của bạn thành kế hoạch',
    body: 'Từ chiều cao, cân nặng, mục tiêu và lịch tập, Nutree tính nhu cầu năng lượng bằng công thức khoa học thay vì một con số chung chung.',
    proof: ['TDEE', 'BMI', 'Macro'],
  },
  smart_macro_promo: {
    section: '05',
    kicker: 'Bước tiếp theo',
    headline: 'Macro tự động điều chỉnh theo thói quen ăn uống',
    body: 'Protein, carb và fat được cân bằng theo mục tiêu, cân nặng và lịch tập để bạn biết hôm nay nên ăn thế nào.',
    proof: ['Protein', 'Carb', 'Fat'],
  },
  smart_meals_promo: {
    section: '06',
    kicker: 'Không cần đoán mò',
    headline: 'Gợi ý bữa ăn AI sẽ bám theo macro của bạn',
    body: 'Sau khi lưu kế hoạch, Nutree có thể gợi ý bữa ăn khớp mục tiêu thay vì để bạn tự tính từng món.',
    proof: ['Bữa sáng', 'Bữa trưa', 'Bữa tối'],
  },
  calculating: {
    text: 'Nutree đang dựng bản đồ dinh dưỡng cho [name]',
    orbits: ['TDEE', 'BMI', 'Macro'],
    steps: [
      'Đọc chỉ số cơ thể',
      'Tính năng lượng duy trì',
      'Chia macro theo mục tiêu',
      'Gói lại thành kế hoạch',
    ],
  },
  tdee_targets: {
    eyebrow: 'Aha moment',
    headline: 'Đây là mục tiêu hôm nay của bạn',
    aha: 'Nutree đã gom TDEE, BMI và lịch tập thành một con số dễ làm theo.',
    calories: 'Calo mỗi ngày',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Chất béo',
    macroNote: 'Macro chia sẵn cho từng ngày',
    bmiTitle: 'Chỉ số BMI của bạn',
    bmiCategories: {
      underweight: 'Thiếu cân',
      normal: 'Bình thường',
      overweight: 'Thừa cân',
      obese: 'Béo phì',
    },
    projectionTitle: 'Lộ trình đến cân nặng mục tiêu',
    projectionWeeks: (weeks: number) => `Dự kiến ${weeks} tuần`,
    sourceTitle: 'Nutree sẽ nhắc bạn làm gì',
    sourceItems: [
      'Theo dõi calo và macro mỗi ngày',
      'Ăn theo gợi ý bữa ăn phù hợp',
      'Điều chỉnh khi cân nặng thay đổi',
    ],
  },
  result_promising: {
    eyebrow: 'Sẵn sàng lưu kế hoạch',
    headline: '[name], kế hoạch không dừng ở một con số.',
    body: 'Nutree biến mục tiêu hôm nay thành vòng lặp hằng ngày: ăn đúng macro, xem tiến độ, rồi tự điều chỉnh khi cơ thể thay đổi.',
    withNutree: 'Với Nutree',
    withoutNutree: 'Tự theo dõi',
    chartLabel: 'Biểu đồ so sánh tiến độ với Nutree và tự theo dõi',
    nextTitle: 'Khi mở app Nutree',
    nextItems: [
      'Nhận lại mục tiêu calo và macro',
      'Lưu link tải app và mã nhận kế hoạch',
      'Tiếp tục với gợi ý bữa ăn AI trong app',
    ],
    proofTitle: 'Nutree giúp bạn rõ hơn ở 3 điểm',
    proofCards: [
      {
        title: 'Biết mục tiêu mỗi ngày',
        body: 'Không cần tự đoán calo và macro từ nhiều nguồn khác nhau.',
      },
      {
        title: 'Biết nên ăn gì',
        body: 'Gợi ý bữa ăn trong app sẽ bám theo mục tiêu macro đã tính.',
      },
      {
        title: 'Biết khi nào cần chỉnh',
        body: 'Khi cân nặng thay đổi, kế hoạch có thể được cập nhật theo tiến độ.',
      },
    ],
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
    eyebrow: 'Thanh toán qua MoMo',
    bullets: [
      'Mục tiêu calo & macro cá nhân hóa',
      'Gợi ý bữa ăn AI mỗi ngày',
      'Theo dõi tiến độ & điều chỉnh tự động',
    ],
    recommended: 'Đề xuất',
    planName: 'Nutree Premium',
    planPrice: '199.000đ / tháng',
    planNote: 'Không dùng IAP, không free trial. Tài khoản được tạo sau khi MoMo xác nhận thanh toán.',
    cta: 'Thanh toán bằng MoMo',
    loading: 'Đang tạo thanh toán MoMo...',
    error: 'Không tạo được thanh toán MoMo. Vui lòng thử lại.',
    paymentError: 'Thanh toán chưa hoàn tất. Vui lòng thử lại.',
  },
  momoReturn: {
    headline: 'Đang xác nhận thanh toán',
    body: 'Chúng tôi đang chờ MoMo gửi xác nhận an toàn từ máy chủ.',
    paid: 'Thanh toán đã xác nhận. Đang chuyển bạn đến bước tải app...',
    retry: 'Kiểm tra lại',
  },
  success: {
    headline: 'Thanh toán thành công!',
    body: 'Bước cuối: tải ứng dụng Nutree. Kế hoạch của bạn sẽ tự động xuất hiện khi mở app.',
    qrHint: 'Quét mã QR bằng điện thoại',
    emailHint: 'Chúng tôi cũng đã gửi link tải qua email — kiểm tra hộp thư nếu bạn đang dùng máy tính.',
    appStore: 'Tải trên App Store',
    playStore: 'Tải trên Google Play',
  },
} as const;

export type ViCopy = typeof vi;
