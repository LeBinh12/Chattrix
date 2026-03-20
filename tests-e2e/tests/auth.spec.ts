import { test, expect } from '@playwright/test';

test('login flow', async ({ page }) => {
  // 1. Go to /login
  await page.goto('/login');

  // 2. Enter username: superadmin
  await page.getByPlaceholder('Nhập tài khoản...').fill('superadmin');

  // 3. Enter password: 123456
  await page.getByPlaceholder('Nhập mật khẩu...').fill('123456');

  // 4. Click login button
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  // 5. Expect redirection to / or /home
  await page.waitForURL('**/home');
  expect(page.url()).toContain('/home');

  // 6. Wait for the loading state to finish (spinner or skeleton)
  // Optionally wait for the "Đang tải thông tin..." text to disappear
  await expect(page.getByText('Đang tải thông tin...')).not.toBeVisible({ timeout: 15000 });

  // Add a short delay to ensure channel list is populated as requested
  await page.waitForTimeout(2000);

  // 7. Select a chat channel from the list
  // Look for a chat item in the channel list. 
  // Each conversation button contains a p.font-semibold with the display name.
  const firstChat = page.locator('button').filter({ has: page.locator('p.font-semibold') }).first();
  await expect(firstChat).toBeVisible({ timeout: 10000 });
  await firstChat.click();

  // 8. Verify chat window and send a message
  // Wait for the editor to be visible
  const editor = page.locator('.ProseMirror');
  await expect(editor).toBeVisible({ timeout: 10000 });

  // Type a message
  await editor.fill('Chào bạn, đây là tin nhắn tự động từ automation test!');
  
  // Press Enter to send (based on ChatInputWindow.tsx logic for desktop)
  await page.keyboard.press('Enter');

  // Verify the message appeared in the chat content
  // We can look for the text we just sent
  await expect(page.getByText('Chào bạn, đây là tin nhắn tự động từ automation test!')).toBeVisible({ timeout: 10000 });
});
