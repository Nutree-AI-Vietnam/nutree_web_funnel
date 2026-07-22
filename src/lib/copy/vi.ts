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
    headline: 'Xây dựng kế hoạch ăn uống dành riêng cho bạn',
    subheadline:
      'Trả lời vài câu trong khoảng 3 phút để Nutree tính calo, macro và lộ trình phù hợp với cơ thể, mục tiêu và lịch tập của bạn.',
    cta: 'Bắt đầu xây kế hoạch',
    legal: 'Xem kết quả trước khi thanh toán. Nutree Premium có giá 199.000đ/tháng qua MoMo, không có free trial.',
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
      { key: 'maintain', label: 'Giữ cân và ăn rõ ràng hơn' },
    ],
  },
  target_weight: {
    question: 'Cân nặng mục tiêu của bạn?',
    label: 'Cân nặng mục tiêu',
    hint: 'Chọn số tròn hoặc nhập trực tiếp nếu bạn đã có mục tiêu.',
    unit: 'kg',
    unsure: 'Tôi chưa có con số cụ thể',
  },
  challenges: {
    question: 'Bạn đã gặp khó khăn nào?',
    hint: 'Chọn tối đa 2 mục đúng nhất.',
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
  motivation: {
    question: 'Điều gì khiến bạn muốn bắt đầu lúc này?',
    options: [
      { key: 'confidence', label: 'Tự tin hơn với cơ thể' },
      { key: 'energy', label: 'Có nhiều năng lượng hơn' },
      { key: 'health', label: 'Cải thiện sức khỏe' },
      { key: 'clothes', label: 'Mặc đồ vừa và đẹp hơn' },
      { key: 'training', label: 'Tập luyện có kết quả rõ hơn' },
      { key: 'clarity', label: 'Không muốn đoán mò nữa' },
    ],
  },
  reflection: {
    template:
      '[name], mục tiêu [goal] của bạn đã rõ ràng. Nhiều người gặp [challenges]. Với kế hoạch đúng đắn, bạn có thể đạt được trong [duration].',
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
    hint: 'Nutree chỉ hỗ trợ người dùng từ 18 tuổi trở lên.',
    unit: 'tuổi',
  },
  body_basics: {
    question: 'Cho Nutree biết tuổi và giới tính của bạn',
    hint: 'Hai thông tin này giúp ước tính nhu cầu năng lượng chính xác hơn.',
  },
  body_metrics: {
    question: 'Chiều cao và cân nặng hiện tại',
    hint: 'Dùng số đo gần nhất của bạn. Bạn có thể cuộn hoặc nhập trực tiếp.',
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
  body_review: {
    question: 'Kiểm tra nhanh thông tin cơ thể',
    hint: 'Xác nhận để Nutree tính kế hoạch từ đúng dữ liệu của bạn.',
    cta: 'Thông tin đã đúng',
  },
  body_fat: {
    question: 'Ước tính tỷ lệ mỡ cơ thể? (tùy chọn)',
    hint: 'Nếu không chắc, bạn có thể bỏ qua. Chúng tôi sẽ dùng công thức tiêu chuẩn.',
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
      { key: 'intermediate', label: 'Trung cấp (1-3 năm)' },
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
  routine: {
    question: 'Một tuần bình thường của bạn trông như thế nào?',
    hint: 'Gộp hoạt động hằng ngày và lịch tập để giảm số lần bấm.',
  },
  eating_pattern: {
    question: 'Khoảnh khắc ăn uống nào hay lệch kế hoạch nhất?',
    options: [
      { key: 'morning', label: 'Buổi sáng vội' },
      { key: 'lunch', label: 'Bữa trưa khó kiểm soát' },
      { key: 'evening', label: 'Buổi tối dễ ăn quá tay' },
      { key: 'late_night', label: 'Ăn khuya' },
      { key: 'weekend', label: 'Cuối tuần' },
      { key: 'eating_out', label: 'Ăn ngoài' },
    ],
  },
  diet: {
    question: 'Bạn có yêu cầu dinh dưỡng đặc biệt không?',
    hint: 'Chọn tối đa 2 mục. “Không có yêu cầu” sẽ bỏ chọn các mục khác.',
    options: [
      { key: 'vegan', label: 'Thuần chay' },
      { key: 'gluten_free', label: 'Không gluten' },
      { key: 'dairy_free', label: 'Không sữa' },
      { key: 'halal', label: 'Halal' },
      { key: 'none', label: 'Không có yêu cầu' },
    ],
  },
  support_style: {
    question: 'Bạn muốn Nutree hỗ trợ theo kiểu nào?',
    options: [
      { key: 'simple', label: 'Đơn giản, chỉ cần mục tiêu chính' },
      { key: 'flexible', label: 'Linh hoạt theo ngày bận' },
      { key: 'detailed', label: 'Chi tiết macro và bữa ăn' },
      { key: 'gentle', label: 'Nhắc nhẹ, không áp lực' },
    ],
  },
  plan_summary: {
    question: 'Nutree đã đủ dữ liệu để dựng kế hoạch',
    hint: 'Bạn sẽ thấy calo, macro và lý do kế hoạch phù hợp trước khi thanh toán.',
    items: [
      'Tính TDEE từ cơ thể và mức vận động',
      'Chia macro theo mục tiêu của bạn',
      'Chuẩn bị nhịp theo dõi và gợi ý bữa ăn',
    ],
    cta: 'Xem kế hoạch của tôi',
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
    text: 'Đang tính kế hoạch cho [name]',
    orbits: ['TDEE', 'BMI', 'Macro'],
    steps: [
      'Đọc chỉ số cơ thể',
      'Tính năng lượng duy trì',
      'Chia macro theo mục tiêu',
      'Gói lại thành kế hoạch',
    ],
  },
  tdee_targets: {
    eyebrow: 'Kế hoạch đầu tiên',
    headline: 'Hôm nay bạn nên ăn bao nhiêu',
    aha: 'Đây là bản nháp dựa trên cơ thể, mục tiêu và lịch sinh hoạt bạn vừa nhập.',
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
    sourceTitle: 'Vì sao kế hoạch này phù hợp',
    sourceItems: [
      'Mục tiêu calo đến từ TDEE cá nhân',
      'Macro được chia theo mục tiêu và cân nặng',
      'Có thể điều chỉnh khi tiến độ thay đổi',
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
    headline: 'Lưu kế hoạch của bạn',
    body: 'Nhập email để giữ kế hoạch này và tiếp tục đến bước mở khóa. Bước tiếp theo là Nutree Premium 199.000đ/tháng qua MoMo, không có free trial.',
    placeholder: 'email@vidu.com',
    cta: 'Lưu kế hoạch và tiếp tục',
    invalid: 'Email không hợp lệ',
    error: 'Có lỗi xảy ra. Vui lòng thử lại.',
  },
  paywall: {
    headline: 'Mở khóa kế hoạch bạn vừa xây dựng',
    eyebrow: 'Thanh toán qua MoMo',
    bullets: [
      'Mục tiêu calo & macro cá nhân hóa',
      'Gợi ý bữa ăn AI mỗi ngày',
      'Theo dõi tiến độ & điều chỉnh tự động',
    ],
    recommended: 'Đề xuất',
    planName: 'Nutree Premium',
    planPrice: '199.000đ / tháng',
    planNote: 'Thanh toán 199.000đ hôm nay, gia hạn hằng tháng qua MoMo. Không có free trial.',
    cta: 'Mở khóa kế hoạch với 199.000đ',
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
    headline: 'Kế hoạch của bạn đã được mở khóa',
    body: 'Tải ứng dụng Nutree và dùng email vừa nhập để nhận lại kế hoạch. Bạn không cần làm lại quiz.',
    qrHint: 'Quét mã QR bằng điện thoại',
    emailHint: 'Chúng tôi cũng đã gửi link tải qua email. Kiểm tra hộp thư nếu bạn đang dùng máy tính.',
    appStore: 'Tải trên App Store',
    playStore: 'Tải trên Google Play',
  },
} as const;

export type ViCopy = typeof vi;
