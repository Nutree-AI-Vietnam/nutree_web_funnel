import { test, expect, type Page } from '@playwright/test';

async function mockBackend(page: Page) {
  await page.route('https://api.e2e.test/v1/tdee/preview', (route) =>
    route.fulfill({
      json: {
        bmr: 1698.75,
        tdee: 2038.5,
        goal: 'cut',
        macros: { calories: 1538.5, protein: 165, carbs: 84.6, fat: 60 },
      },
    }),
  );
  await page.route('https://api.e2e.test/v1/web-funnel/leads', (route) =>
    route.fulfill({ json: { web_user_id: 'w_e2e', claim_token: 'ct_e2e' } }),
  );
}

test('full funnel: landing -> quiz -> results -> email capture -> paywall', async ({ page }) => {
  await mockBackend(page);

  await page.goto('/');
  await page.getByRole('link', { name: 'Bắt đầu ngay' }).click();

  await page.getByPlaceholder('Nhập tên của bạn').fill('Anh');
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'Giảm cân' }).click();
  await page.getByRole('spinbutton').fill('70');
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'Không có thời gian' }).click();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'TikTok' }).click();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'Vài tháng' }).click();
  await expect(page.getByText('Anh, mục tiêu')).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();

  await page.getByRole('button', { name: 'Nam' }).click();
  await expect(page).toHaveURL(/\/quiz\/age/);
  await page.getByRole('spinbutton').fill('30');
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await expect(page).toHaveURL(/\/quiz\/height_weight/);
  await page.getByLabel('Chiều cao (cm)').fill('175');
  await page.getByLabel('Cân nặng (kg)').fill('75');
  await expect(page.getByRole('button', { name: 'Tiếp tục' })).toBeEnabled();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'Bỏ qua' }).click();

  await page.getByRole('button', { name: '4', exact: true }).click();
  await page.getByRole('button', { name: '~60 phút' }).click();
  await page.getByRole('button', { name: 'Trung cấp (1–3 năm)' }).click();
  await page.getByRole('button', { name: 'Tập tạ' }).click();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();

  await page.getByRole('button', { name: 'Văn phòng / ngồi nhiều' }).click();
  await page.getByRole('button', { name: 'Không có yêu cầu' }).click();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();

  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Tiếp tục' }).click();
  }

  await expect(page).toHaveURL(/tdee_targets/, { timeout: 15_000 });
  await expect(page.getByText('1539')).toBeVisible();
  await expect(page.getByText('165g')).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();

  await page.getByRole('button', { name: 'Nhận kế hoạch của tôi' }).click();
  await expect(page).toHaveURL(/\/email/);
  await page.getByPlaceholder('email@vidu.com').fill('anh@example.vn');
  await page.getByRole('button', { name: 'Lưu kế hoạch của tôi' }).click();

  await expect(page).toHaveURL(/\/paywall/);
  const stored = await page.evaluate(() => localStorage.getItem('nutree_funnel_v1'));
  expect(JSON.parse(stored!).state.lead.claim_token).toBe('ct_e2e');
});

test('mid-quiz resume from localStorage', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/quiz/goal');
  await page.getByRole('button', { name: 'Tăng cơ' }).click();
  await page.reload();
  await page.goto('/quiz/goal');
  await expect(page.getByRole('button', { name: 'Tăng cơ' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('unknown quiz step 404s', async ({ page }) => {
  const res = await page.goto('/quiz/not_a_step');
  expect(res!.status()).toBe(404);
});
