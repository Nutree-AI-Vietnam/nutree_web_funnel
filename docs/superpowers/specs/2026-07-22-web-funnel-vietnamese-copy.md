# Nutree Web Funnel — Final Vietnamese Copy

**Date:** 2026-07-22  
**Status:** Implementation-ready copy direction  
**Locale:** `vi-VN`  
**Offer:** Nutree Premium, 199.000đ/month, immediate MoMo charge, no free trial  
**Note:** Dynamic values appear in `[brackets]`. Do not render brackets in production.

---

## 1. Global terminology

Use consistently:

| Concept | Copy |
|---|---|
| Calories | `calo` |
| Protein | `protein` |
| Carbohydrate | `carb` |
| Fat | `chất béo` |
| Initial target | `mục tiêu khởi đầu` |
| Full plan | `kế hoạch đầy đủ` |
| Subscription | `gói Nutree Premium` |
| Automatic renewal | `tự động gia hạn` |
| Estimate | `ước tính` |
| Meal logging | `ghi nhận món ăn` |
| Weekly rebalancing | `cân bằng lại ngân sách dinh dưỡng trong tuần` |

Avoid:

- “Chẩn đoán.”
- “Chính xác tuyệt đối.”
- “Đảm bảo giảm cân.”
- “100% cá nhân hóa.”
- “AI tiên tiến.”
- “Biến đổi cuộc đời.”
- English marketing labels such as “Aha moment,” “Plan,” or “Recommended.”

---

## 2. Global actions

```ts
common: {
  continue: 'Tiếp tục',
  back: 'Quay lại',
  edit: 'Chỉnh sửa',
  confirm: 'Xác nhận',
  skip: 'Bỏ qua',
  retry: 'Thử lại',
  save: 'Lưu kế hoạch',
  close: 'Đóng',
}
```

Progress labels:

```ts
chapters: {
  goal: 'Mục tiêu của bạn',
  body: 'Cơ thể của bạn',
  routine: 'Nhịp sống của bạn',
  plan: 'Kế hoạch của bạn',
}
```

Accessible progress:

> `[chapter] — bước [current]/[total]`

---

## 3. Landing

### Headline

> **Xây dựng kế hoạch ăn uống dành riêng cho bạn**

### Body

> Trả lời một số câu hỏi về mục tiêu, cơ thể và thói quen để Nutree ước tính calo, macro và cách theo dõi phù hợp.

### Trust/effort line

> Khoảng 3 phút · Không cần tài khoản để bắt đầu · Xem mục tiêu khởi đầu trước khi thanh toán

### CTA

> **Bắt đầu xây kế hoạch**

### Price disclosure

> Kế hoạch đầy đủ trong app: **199.000đ/tháng qua MoMo**. Gói web này không có dùng thử miễn phí.

### Proof

> **4,7★ từ hơn 3.000 đánh giá trên App Store Việt Nam**

Only publish the rating/count after verifying the current listing. Keep the source visible.

### Product preview label

> Ví dụ cách Nutree hỗ trợ mỗi ngày

Preview sequence:

1. Chụp hoặc tìm món ăn
2. Xem calo và macro
3. Biết phần còn lại hôm nay
4. Cân bằng lại cả tuần khi cần

---

## 4. Goal

### Question

> **Bạn muốn thay đổi điều gì nhất?**

### Options

```ts
[
  { key: 'cut', label: 'Giảm cân và giảm mỡ' },
  { key: 'bulk', label: 'Tăng cơ' },
  { key: 'recomp', label: 'Cải thiện vóc dáng' },
  { key: 'maintain', label: 'Giữ cân và ăn uống tốt hơn' },
]
```

Support text:

> Nutree sẽ dùng mục tiêu này để ước tính năng lượng và cách phân chia macro.

---

## 5. Name

### Question

> **Nutree nên gọi bạn là gì?**

### Support

> Chỉ cần tên bạn muốn thấy trong kế hoạch.

### Placeholder

> Tên của bạn

### Validation

Empty:

> Vui lòng nhập tên để tiếp tục.

Too long:

> Tên cần ngắn hơn 40 ký tự.

CTA:

> Tiếp tục

---

## 6. Challenges

### Question

> **Điều gì thường làm kế hoạch của bạn bị gián đoạn?**

### Support

> Chọn tối đa 2 điều phù hợp nhất.

### Options

```ts
[
  { key: 'no_time', label: 'Không có thời gian' },
  { key: 'dont_know_what_to_eat', label: 'Không biết nên ăn gì' },
  { key: 'cravings', label: 'Dễ thèm ăn hoặc ăn vặt' },
  { key: 'cant_stick_to_diet', label: 'Khó duy trì đều đặn' },
  { key: 'eat_out', label: 'Thường xuyên ăn ngoài' },
  { key: 'stress_eating', label: 'Dễ ăn nhiều khi căng thẳng' },
  { key: 'confusion', label: 'Quá nhiều lời khuyên mâu thuẫn' },
  { key: 'other', label: 'Điều khác' },
]
```

Maximum error:

> Bạn có thể chọn tối đa 2 điều.

CTA:

> Tiếp tục

---

## 7. Duration

### Question

> **Bạn đã theo đuổi mục tiêu này bao lâu?**

### Options

```ts
[
  { key: 'just_starting', label: 'Tôi mới bắt đầu' },
  { key: 'few_months', label: 'Vài tháng' },
  { key: 'around_year', label: 'Khoảng một năm' },
  { key: 'several_years', label: 'Nhiều năm' },
]
```

---

## 8. Motivation

### Question

> **Đạt mục tiêu này sẽ giúp bạn điều gì nhất?**

### Options

```ts
[
  { key: 'confidence', label: 'Cảm thấy tự tin hơn' },
  { key: 'energy', label: 'Có nhiều năng lượng hơn' },
  { key: 'health', label: 'Xây dựng thói quen tốt cho sức khỏe' },
  { key: 'clothes', label: 'Cảm thấy thoải mái hơn khi mặc đồ' },
  { key: 'training', label: 'Tập luyện và phục hồi tốt hơn' },
  { key: 'clarity', label: 'Không còn phải đoán mình nên ăn gì' },
]
```

---

## 9. Reflection

### Eyebrow

> Nutree đã hiểu phần quan trọng nhất

### Dynamic headline

> **[name], mục tiêu của bạn đã rõ ràng.**

### Template

> Bạn muốn **[goal_label]** để **[motivation_phrase]**. [duration_sentence] Điều làm bạn khó duy trì nhất là **[challenge_phrase]**.

### Priority sentence

> Vì vậy, kế hoạch Nutree của bạn sẽ ưu tiên **[priority_phrase]**.

### CTA

> **Tiếp tục xây kế hoạch**

### Mapping examples

Goal labels:

```ts
cut: 'giảm cân và giảm mỡ'
bulk: 'tăng cơ'
recomp: 'cải thiện vóc dáng'
maintain: 'giữ cân và ăn uống tốt hơn'
```

Motivation phrases:

```ts
confidence: 'cảm thấy tự tin hơn'
energy: 'có nhiều năng lượng hơn'
health: 'xây dựng thói quen tốt cho sức khỏe'
clothes: 'cảm thấy thoải mái hơn khi mặc đồ'
training: 'tập luyện và phục hồi tốt hơn'
clarity: 'không còn phải đoán mình nên ăn gì'
```

Duration sentences:

```ts
just_starting: 'Bạn đang ở giai đoạn bắt đầu, nên kế hoạch sẽ đi từ những bước rõ ràng và dễ làm.'
few_months: 'Bạn đã thử trong vài tháng, nên kế hoạch sẽ tập trung vào cách duy trì thực tế hơn.'
around_year: 'Bạn đã dành nhiều thời gian cho mục tiêu này, nên kế hoạch cần đủ rõ ràng và linh hoạt để tiếp tục.'
several_years: 'Bạn đã theo đuổi mục tiêu trong thời gian dài, nên Nutree sẽ tránh cách làm cực đoan và tập trung vào nhịp có thể duy trì.'
```

Priority phrases:

```ts
no_time: 'cách ghi nhận nhanh và bữa ăn dễ thực hiện'
dont_know_what_to_eat: 'gợi ý bữa ăn cụ thể thay vì chỉ đưa ra một con số'
cravings: 'một ngân sách rõ ràng cho bữa chính và bữa phụ'
cant_stick_to_diet: 'một nhịp theo dõi không yêu cầu ngày nào cũng hoàn hảo'
eat_out: 'tính linh hoạt khi ăn ngoài và cách cân bằng lại trong tuần'
stress_eating: 'cách theo dõi không phán xét và quay lại nhịp bình thường'
confusion: 'một mục tiêu dễ hiểu thay vì nhiều lời khuyên rời rạc'
other: 'cách theo dõi phù hợp với nhịp sống của bạn'
```

When two challenges are selected, use one primary sentence and one secondary bullet. Avoid an overly long paragraph.

---

## 10. Body basics

### Heading

> **Một chút thông tin để tính nhu cầu năng lượng**

### Biological sex label

> Giới tính sinh học

Support:

> Thông tin này được dùng trong công thức ước tính nhu cầu năng lượng.

Options:

```ts
[
  { key: 'male', label: 'Nam' },
  { key: 'female', label: 'Nữ' },
]
```

### Age label

> Tuổi của bạn

Support:

> Gói thanh toán web hiện dành cho người từ 18 tuổi.

Validation:

Under 18:

> Gói thanh toán web hiện chỉ dành cho người từ 18 tuổi. Bạn vẫn có thể tìm hiểu Nutree trong ứng dụng cùng người giám hộ phù hợp.

Invalid:

> Vui lòng nhập tuổi từ 18 đến 100.

CTA:

> Tiếp tục

---

## 11. Body metrics

### Heading

> **Chỉ số cơ thể hiện tại của bạn**

### Height

Label:

> Chiều cao

Unit:

> cm

Support:

> Dùng chiều cao hiện tại của bạn.

### Current weight

Label:

> Cân nặng hiện tại

Unit:

> kg

Support:

> Dùng số đo gần nhất mà bạn thấy đáng tin cậy.

### Input prompt

> Cuộn hoặc chạm để nhập số

### Validation

Height:

> Chiều cao cần nằm trong khoảng [min]–[max] cm.

Weight:

> Cân nặng cần nằm trong khoảng [min]–[max] kg.

Untouched value:

> Vui lòng xác nhận số đo của bạn trước khi tiếp tục.

CTA:

> Tiếp tục

---

## 12. Target weight

### Question

> **Bạn muốn hướng tới cân nặng nào?**

### Support

> Đây là định hướng ban đầu. Bạn có thể chỉnh lại sau khi bắt đầu theo dõi.

### Numeric option

Label:

> Cân nặng hướng tới

Unit:

> kg

### Alternative

> **Tôi chưa có con số cụ thể**

Alternative support:

> Nutree vẫn có thể tạo mục tiêu dựa trên vóc dáng, thói quen và hướng bạn muốn thay đổi.

### Validation

> Mục tiêu này có vẻ quá xa so với cân nặng hiện tại. Vui lòng kiểm tra lại hoặc chọn “Tôi chưa có con số cụ thể.”

CTA:

> Tiếp tục

---

## 13. Body review

### Heading

> **Xác nhận thông tin của bạn**

### Summary

> [age] tuổi · [gender_label] · [height] cm · [weight] kg

With target:

> Mục tiêu: [target_weight] kg

Without target:

> Mục tiêu: chưa chọn con số cụ thể

### Support

> Nutree sẽ dùng các thông tin này để tính mục tiêu khởi đầu.

### Primary CTA

> **Đúng, tiếp tục**

### Secondary

> Chỉnh sửa

---

## 14. Routine

### Heading

> **Một tuần bình thường của bạn như thế nào?**

### Daily activity

Label:

> Mức vận động hằng ngày

Options:

```ts
[
  { key: 'desk', label: 'Chủ yếu ngồi' },
  { key: 'on_feet', label: 'Đi lại khá nhiều' },
  { key: 'physical', label: 'Vận động hoặc lao động thể chất nhiều' },
]
```

### Training frequency

Label:

> Số buổi tập mỗi tuần

Options:

```ts
[
  { key: 0, label: 'Không tập' },
  { key: 1, value: 1, label: '1 buổi' },
  { key: 2, value: 2, label: '2 buổi' },
  { key: 3, value: 3, label: '3 buổi' },
  { key: 4, value: 4, label: '4 buổi' },
  { key: 5, value: 5, label: '5 buổi trở lên' },
]
```

### Average duration

Label:

> Thời lượng trung bình mỗi buổi

Options:

```ts
[
  { key: 'short', value: 20, label: 'Dưới 30 phút' },
  { key: 'medium', value: 45, label: '30–60 phút' },
  { key: 'long', value: 75, label: 'Trên 60 phút' },
]
```

When training days are zero:

> Nutree sẽ tính theo mức vận động hằng ngày của bạn.

Hide or disable duration when no training is selected.

CTA:

> Tiếp tục

---

## 15. Eating pattern

### Question

> **Thời điểm nào khiến bạn khó kiểm soát ăn uống nhất?**

### Support

> Chọn thời điểm Nutree nên hỗ trợ rõ nhất.

### Options

```ts
[
  { key: 'morning', label: 'Buổi sáng' },
  { key: 'lunch', label: 'Buổi trưa' },
  { key: 'evening', label: 'Buổi tối' },
  { key: 'late_night', label: 'Ăn khuya' },
  { key: 'weekend', label: 'Cuối tuần' },
  { key: 'eating_out', label: 'Khi ăn ngoài hoặc gặp bạn bè' },
]
```

---

## 16. Diet

### Question

> **Nutree cần lưu ý điều gì khi gợi ý bữa ăn?**

### Support

> Có thể bỏ qua. Chọn tối đa 2.

### Options

```ts
[
  { key: 'none', label: 'Không có yêu cầu đặc biệt' },
  { key: 'vegetarian', label: 'Ăn chay' },
  { key: 'vegan', label: 'Thuần chay' },
  { key: 'dairy_free', label: 'Không dùng sữa' },
  { key: 'gluten_free', label: 'Không gluten' },
  { key: 'halal', label: 'Halal' },
  { key: 'other', label: 'Yêu cầu khác' },
]
```

Rules:

- `none` clears all others.
- Selecting another clears `none`.
- Maximum two non-`none` options.

CTA:

> Tiếp tục

Skip:

> Bỏ qua

---

## 17. Support style

### Question

> **Kiểu kế hoạch nào phù hợp với bạn nhất?**

### Options

```ts
[
  {
    key: 'simple',
    label: 'Đơn giản và dễ làm',
    description: 'Ít bước, tập trung vào điều cần làm hôm nay.',
  },
  {
    key: 'flexible',
    label: 'Linh hoạt khi ăn ngoài',
    description: 'Dễ điều chỉnh giữa các ngày trong tuần.',
  },
  {
    key: 'detailed',
    label: 'Theo dõi chi tiết',
    description: 'Xem rõ calo, macro và xu hướng.',
  },
  {
    key: 'gentle',
    label: 'Nhẹ nhàng và bền vững',
    description: 'Không yêu cầu ngày nào cũng hoàn hảo.',
  },
]
```

---

## 18. Plan summary

### Eyebrow

> Kế hoạch của bạn gần hoàn tất

### Headline

> **Nutree sẽ xây kế hoạch cho [name] theo hướng này**

### Dynamic bullets

```text
✓ Mục tiêu: [goal_label]
✓ Ưu tiên: [challenge_priority]
✓ Nhịp sống: [routine_summary]
✓ Cách hỗ trợ: [support_style_summary]
```

Diet bullet, when selected:

> ✓ Bữa ăn lưu ý: [diet_summary]

### Support

> Bạn có thể chỉnh lại thông tin sau khi xem mục tiêu khởi đầu.

### CTA

> **Tạo kế hoạch của tôi**

### Edit

> Xem lại câu trả lời

---

## 19. Calculating

### Heading

> **Nutree đang tính mục tiêu khởi đầu cho [name]**

### Stages

Use only stages supported by actual work:

```ts
[
  'Đọc chỉ số cơ thể',
  'Ước tính nhu cầu năng lượng',
  'Cân bằng macro theo mục tiêu',
  'Chuẩn bị cách theo dõi phù hợp',
]
```

Derived detail examples:

- `Lịch tập: 3 buổi/tuần`
- `Ưu tiên: linh hoạt khi ăn ngoài`
- `Hỗ trợ rõ nhất: buổi tối`

Loading support:

> Quá trình này thường chỉ mất vài giây.

Retry error:

> Nutree chưa thể hoàn tất phép tính. Vui lòng kiểm tra kết nối và thử lại.

CTA:

> Thử lại

---

## 20. Result

### Eyebrow

> Mục tiêu khởi đầu

### Headline

> **[name], kế hoạch của bạn đã sẵn sàng**

### Explanation

> Mục tiêu này được ước tính từ tuổi, chiều cao, cân nặng, mức vận động, lịch tập và mục tiêu bạn chọn.

### Main metric

> **[calories] calo mỗi ngày**

### Macros

```text
[protein]g protein
[carbs]g carb
[fat]g chất béo
```

### Estimate note

> Đây là mục tiêu khởi đầu, không phải chẩn đoán y tế. Nutree có thể điều chỉnh khi bạn bắt đầu theo dõi tiến độ.

### Edit

> Chỉnh sửa thông tin

### “Why this fits” heading

> **Vì sao kế hoạch này phù hợp với bạn**

Dynamic bullets:

- `Dựa trên mức vận động [activity_label].`
- `Đã tính lịch tập [training_summary].`
- `[challenge_result_sentence]`
- `[diet_result_sentence]`

### Paid-product section

Heading:

> **Nutree giúp bạn thực hiện mục tiêu này mỗi ngày**

Step 1:

> **Ghi nhận món ăn nhanh**  
> Chụp ảnh, quét mã hoặc tìm món để thêm vào ngày của bạn.

Step 2:

> **Biết hôm nay còn bao nhiêu**  
> Theo dõi calo, protein và phần còn lại trong ngày.

Step 3:

> **Cân bằng lại cả tuần**  
> Một ngày ăn vượt không làm mất kế hoạch. Nutree giúp bạn điều chỉnh những ngày còn lại.

### Personalized example heading

Examples by eating moment:

```ts
morning: 'Ví dụ cho bữa sáng của bạn'
lunch: 'Ví dụ cho bữa trưa của bạn'
evening: 'Ví dụ cho bữa tối của bạn'
late_night: 'Ví dụ để chủ động cho bữa phụ tối'
weekend: 'Ví dụ cách cân bằng cuối tuần'
eating_out: 'Ví dụ khi bạn ăn ngoài'
```

### CTA

> **Lưu và mở khóa kế hoạch**

### Secondary reassurance

> Bước tiếp theo: lưu bằng email, sau đó xem gói Nutree Premium 199.000đ/tháng qua MoMo.

---

## 21. Email

### Heading

> **Lưu kế hoạch của bạn**

### Body

> Nhập email để nhận lại mục tiêu, link mở Nutree và khôi phục kế hoạch nếu bạn đổi thiết bị.

### Price disclosure

> **Bước tiếp theo:** gói Nutree Premium **199.000đ/tháng qua MoMo**. Thanh toán ngay, tự động gia hạn hằng tháng và không có dùng thử miễn phí cho gói web này.

### Placeholder

> email@vidu.com

### CTA

> **Lưu kế hoạch và tiếp tục**

### Privacy

> Nutree dùng email để lưu kế hoạch, gửi link nhận kế hoạch và hỗ trợ tài khoản. Xem Chính sách bảo mật.

### Validation

Invalid:

> Email chưa đúng định dạng. Vui lòng kiểm tra lại.

Existing/recoverable:

> Email này đã có kế hoạch Nutree. Chúng tôi sẽ tiếp tục với kế hoạch hiện có.

Network:

> Chưa thể lưu kế hoạch. Vui lòng thử lại.

---

## 22. Paywall

### Eyebrow

> Kế hoạch của bạn đã sẵn sàng

### Personalized headline

> **Mở khóa kế hoạch [name] vừa xây dựng**

### Personalized body

> Kế hoạch này được thiết kế cho mục tiêu **[goal_label]**, nhịp vận động **[routine_short]** và ưu tiên **[priority_short]**.

### Plan

> **Nutree Premium**

### Today’s charge

> **199.000đ thanh toán hôm nay**

### Renewal

> Tự động gia hạn **199.000đ mỗi tháng qua MoMo**.

### Next date

> Kỳ thanh toán tiếp theo: **[next_billing_date]**

### Trial

> Gói web này **không có dùng thử miễn phí**.

### Benefits

Base list:

```text
✓ Lưu mục tiêu calo và macro vào app
✓ Ghi nhận món ăn bằng ảnh, mã vạch hoặc tìm kiếm
✓ Biết phần calo và protein còn lại trong ngày
✓ Nhận gợi ý bữa ăn phù hợp
✓ Cân bằng lại ngân sách dinh dưỡng trong tuần
```

Challenge-specific replacement examples:

No time:

> ✓ Ghi nhận nhanh khi lịch trình bận rộn

Eating out:

> ✓ Theo dõi linh hoạt khi ăn ngoài

Do not know what to eat:

> ✓ Gợi ý bữa ăn cụ thể theo mục tiêu

### Proof

> **4,7★ từ hơn 3.000 đánh giá trên App Store Việt Nam**

Verify before publishing.

### CTA

> **Mở khóa kế hoạch với 199.000đ**

### Processing CTA

> Đang mở MoMo...

### Footer

> Thanh toán an toàn qua MoMo

Links:

- Điều khoản sử dụng
- Chính sách bảo mật
- Cách quản lý hoặc hủy gói

### Error

Checkout creation:

> Chưa thể tạo thanh toán MoMo. Vui lòng thử lại.

Existing pending order:

> Bạn đã có một thanh toán đang chờ xử lý. Nutree sẽ mở lại giao dịch đó thay vì tạo giao dịch mới.

---

## 23. MoMo return and status

### Created/pending headline

> **Đang xác nhận thanh toán**

### Pending body

> MoMo đang xử lý giao dịch. Bạn không cần thanh toán lại.

### Reference

> Mã giao dịch Nutree: [order_reference]

### Manual CTA

> **Tôi đã thanh toán — kiểm tra lại**

### Reopen CTA

> Mở lại MoMo

### Paid

Headline:

> **Thanh toán đã được xác nhận**

Body:

> Nutree đang chuẩn bị link nhận kế hoạch của bạn.

### Cancelled

Headline:

> **Bạn đã hủy thanh toán**

Body:

> Kế hoạch vẫn được lưu. Bạn có thể quay lại khi sẵn sàng.

CTA:

> Quay lại kế hoạch

### Failed

Headline:

> **Thanh toán chưa thành công**

Body:

> MoMo chưa xác nhận giao dịch. Bạn chưa bị kích hoạt gói từ lần thử này.

CTA:

> Thử thanh toán lại

### Expired

Headline:

> **Giao dịch đã hết hạn**

Body:

> Kế hoạch vẫn được lưu. Hãy tạo một giao dịch MoMo mới để tiếp tục.

CTA:

> Tạo thanh toán mới

### Network status error

> Nutree chưa kiểm tra được trạng thái giao dịch. Vui lòng giữ trang này và thử lại. Không cần thanh toán lần nữa.

---

## 24. Success

### Headline

> **Kế hoạch của bạn đã được mở khóa**

### Body

> Kế hoạch [name] vừa tạo đã được lưu trong Nutree. Bạn không cần trả lời lại các câu hỏi trên web.

### Mobile CTA

> **Mở Nutree và nhận kế hoạch**

### App-not-installed support

> Nếu chưa cài Nutree, link sẽ đưa bạn tới cửa hàng ứng dụng rồi tự khôi phục kế hoạch khi mở app.

### Desktop

QR label:

> Quét mã bằng điện thoại để mở Nutree và nhận kế hoạch

Store buttons:

- Tải trên App Store
- Tải trên Google Play

### Email recovery

> Chúng tôi cũng đã gửi link nhận kế hoạch tới **[masked_email]**.

### First-action preview

> Bước đầu tiên trong app: ghi nhận bữa ăn gần nhất để Nutree bắt đầu theo dõi hôm nay.

### Claim pending

> Nutree đang đưa kế hoạch vào ứng dụng...

### Claim success

> Đã nhận kế hoạch. Đang mở Nutree...

### Claim expired

> Link nhận kế hoạch đã hết hạn. Nhập email để nhận link mới.

CTA:

> Gửi lại link

---

## 25. Global error and safety copy

### Session expired

> Phiên tạo kế hoạch đã hết hạn. Bạn có thể bắt đầu lại; Nutree sẽ cố gắng khôi phục những phần đã lưu an toàn.

### Missing required data

> Một số thông tin cần thiết chưa đầy đủ. Vui lòng kiểm tra lại trước khi tính kế hoạch.

### Offline

> Bạn đang mất kết nối. Câu trả lời hiện tại chưa được lưu. Vui lòng kết nối lại rồi tiếp tục.

### Calculation disclaimer

> Kết quả là ước tính dinh dưỡng cho mục đích theo dõi chung, không thay thế tư vấn y tế.

### Health escalation

> Nếu bạn đang mang thai, có tiền sử rối loạn ăn uống, đang điều trị bệnh hoặc theo chế độ ăn do bác sĩ chỉ định, hãy trao đổi với chuyên gia y tế trước khi áp dụng mục tiêu mới.

### Advertising consent

Service-required processing:

> Nutree cần xử lý câu trả lời để tạo và lưu kế hoạch cho bạn.

Optional analytics/advertising:

> Cho phép Nutree dùng cookie đo lường và quảng cáo để hiểu hiệu quả chiến dịch. Lựa chọn này không ảnh hưởng đến việc tạo kế hoạch.

Buttons:

- Chấp nhận tùy chọn
- Chỉ cookie cần thiết
- Xem chi tiết
