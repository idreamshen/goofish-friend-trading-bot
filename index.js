'use strict';
const puppeteer = require('puppeteer');
const conf = require('./config');

function delay(time) {
  return new Promise(function(resolve) {
    setTimeout(resolve, time);
  });
}
// 将 cookies 字符串解析成对象数组，并添加 domain 属性
function parseCookies(cookieString, domain) {
  return cookieString.split('; ').map(cookie => {
    const [name, ...rest] = cookie.split('=');
    return { name, value: rest.join('='), domain };
  });
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.emulate(puppeteer.KnownDevices['iPhone 12 Pro']);
  const cookieString = conf.cookies;
  const cookies = parseCookies(cookieString, '.goofish.com');

  await page.goto('https://h5.m.goofish.com/wow/moyu/moyu-project/friend-trading/pages/home?titleVisible=false&loadingVisible=false&source=wdcard');
  await page.setCookie(...cookies);
  console.log("Cookies:", await page.cookies('https://h5.m.goofish.com'));

  await page.reload()
  //await page.goto('https://h5.m.goofish.com/wow/moyu/moyu-project/friend-trading/pages/home?titleVisible=false&loadingVisible=false&source=wdcard');
  //await page.goto('https://passport.goofish.com/mini_login.htm?ttid=&redirectType=Redirect&returnUrl=https://h5.m.goofish.com/wow/moyu/moyu-project/friend-trading/pages/home?titleVisible%3Dfalse%26loadingVisible%3Dfalse%26source%3Dwdcard&appName=xianyu&appEntrance=web&isMobile=true')
  // 等待包含特定文本的 <div> 元素出现
  //await page.waitForFunction(
  //  text => {
  //    const elements = Array.from(document.querySelectorAll('div'));
  //    return elements.some(element => element.textContent.trim() === text);
  //  },
  //  {}, // 传递给 pageFunction 的参数
  //  '立即登录' // 要等待的文本内容
  //);
  console.log(2)
  // 等待链接元素出现
  //await page.waitForSelector('.password-login-link');
  //console.log(3)

  // 点击链接
  //await page.click('.password-login-link');
  //console.log(4)
  //await page.waitForSelector('.sms-login-link')
  //console.log(5)
  // 等待输入框元素出现
  //await page.waitForSelector('#fm-login-id');

  // 等待复选框元素出现
  //await page.waitForSelector('#fm-agreement-checkbox');

  // 勾选复选框
  //const isChecked = await page.$eval('#fm-agreement-checkbox', checkbox => checkbox.checked);
  //if (!isChecked) {
  //  await page.click('#fm-agreement-checkbox');
  //}

  // 等待按钮元素出现
  //await page.waitForSelector('.fm-button.fm-submit.password-login');

  // 点击按钮
  //await page.click('.fm-button.fm-submit.password-login');

  await delay(5000)

  await page.screenshot({path: 'full.png', fullPage: true});
  await browser.close();
})();
