const puppeteer = require('puppeteer');
const util = require('util');
const logger = require('./logger');

class Game {

    constructor(cookieString) {
        this.cookieString = cookieString;
        this.page = null;
    }

    async init() {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox'],
            timeout: 10000,
        });
        this.page = await browser.newPage();
        await this.page.emulate(puppeteer.KnownDevices['iPhone 12 Pro']);
    }

    async start() {
        await this.reload();

        const interval = 10000; // 每10秒执行一次
        let isRunning = false;
        setInterval(async () => {
            if (isRunning) {
                logger.warn(`上一轮未结束`);
                return;
            }

            isRunning = true;

            try {
                await this.reload();
                // 收集员工收益
                await this.collectStaffIncome();
                // 完成任务
                await this.completeTasks();
                await this.updateUserInfo();
                logger.info(`个人信息: ${JSON.stringify(this.userInfo)}`);
                await this.updateStaffs();
                logger.info(`我的员工: ${JSON.stringify(this.staffs)}`);

                // 解雇最差员工
                if (await this.layoffWorstStaff()) {
                    await this.updateUserInfo();
                    logger.info(`解雇员工后，个人信息: ${JSON.stringify(this.userInfo)}`);
                    await this.updateStaffs();
                    logger.info(`解雇员工后，我的员工: ${JSON.stringify(this.staffs)}`);
                }
                // 雇佣员工
                await this.hireStaff();
                // 派活员工
                await this.assignStaffWork();
            } catch (error) {
                logger.error('Error', error);
            } finally {
                isRunning = false;
            }
        }, interval);

        logger.info("开始游戏");
    }

    async reload() {
        await this.page.goto('https://h5.m.goofish.com/wow/moyu/moyu-project/friend-trading/pages/home?titleVisible=false&loadingVisible=false&source=wdcard');
        await this.delay(1000);
        const cookies = parseCookies(this.cookieString, '.goofish.com');
        await this.page.setCookie(...cookies);
        await this.delay(1000);
        await this.page.reload();
        const btnMyStaff = await this.page.waitForSelector('span ::-p-text(我的员工)');
        await this.delay(1000);
    }

    async updateUserInfo() {
        const levelNode = await this.page.waitForSelector('span[class*="UserInfo--userLevel"]');
        const levelStr = levelNode ? await this.page.evaluate(element => element.textContent, levelNode) : null;
        const level = levelStr ? parseInt(levelStr.replace('Lv.', '')) : 0;

        const balanceNode = await this.page.waitForSelector('span[class*="UserInfo--balance"]');
        const balanceStr = balanceNode ? await this.page.evaluate(element => element.textContent, balanceNode) : null;
        let balance = 0;
        if (balanceStr) {
            if (balanceStr.includes('万')) {
                balance = parseInt(parseFloat(balanceStr.replace('万', '')) * 10000);
            } else {
                balance = parseInt(balanceStr);
            }
        }
        
        const priceNode = await this.page.waitForSelector('span[class*="UserInfo--description"] ::-p-text(身价) span');
        const price = priceNode ? parseInt(await this.page.evaluate(element => element.textContent, priceNode)) : 0;

        const staffNumNode = await this.page.waitForSelector('span[class*="UserInfo--description"] ::-p-text(员工) span');
        const staffNum = staffNumNode ? parseInt(await this.page.evaluate(element => element.textContent, staffNumNode)) : 0;

        const bossNameNode = await this.page.waitForSelector('div[class*="BossInfo--myBoss"] span span');
        const bossName = bossNameNode ? await this.page.evaluate(element => element.textContent, bossNameNode) : "";
        
        
        const maxStaffNumNode = await this.page.waitForSelector('span[class*="Main--staffNumber"]');
        const maxStaffNumStr = maxStaffNumNode ? await this.page.evaluate(element => element.textContent, maxStaffNumNode) : null;
        const maxStaffNum = maxStaffNumStr ? parseInt(maxStaffNumStr.match(/\/(\d+)/)[1]) : 0;
        
        const userInfo = {
            "level": level, // 等级
            "price": price, // 身价
            "balance": balance, // 金币
            "staffNum": staffNum, // 员工数量
            "maxStaffNum": maxStaffNum, // 最大员工数量
            "bossName": bossName, // 老板名字
        };

        this.userInfo = userInfo;
    }

    async updateStaffs() {
        const btnMyStaff = await this.page.waitForSelector('span ::-p-text(我的员工)');
        await btnMyStaff.click();
        await this.page.waitForSelector('div[class*="MyStaff--myStaffItem"]');
        const staffNodes = await this.page.$$('div[class*="MyStaff--myStaffItem"]');
        let staffs = [];
        for (const staffNode of staffNodes) {
            const staffNickNameNode = await staffNode.$('span[class*="MyStaff--myStaffNick"]');
            const staffNickName = await this.page.evaluate(element => element.textContent, staffNickNameNode);

            const staffStatusNode = await staffNode.$('div[class*="MyStaff--myStaffStatus"]');
            const staffStatus = await this.page.evaluate(element => element.textContent, staffStatusNode);

            const staffPriceNode = await staffNode.waitForSelector('span[class*="MyStaff--myStaffPrice"] ::-p-text(身价)');
            const staffPriceStr = staffPriceNode ? await this.page.evaluate(element => element.textContent, staffPriceNode) : null;
            const staffPrice = staffPriceStr ? parseInt(staffPriceStr.match(/(\d+)/)[1]) : 0;

            const staffIncomeNode = await staffNode.waitForSelector('span[class*="MyStaff--myStaffIncome"]');
            const staffIncomeStr = staffIncomeNode ? await this.page.evaluate(element => element.textContent, staffIncomeNode) : null;
            const staffIncome = staffIncomeStr ? parseInt(staffIncomeStr.match(/(\d+)/)[1]) : 0;
            
            staffs.push({
                "nickname": staffNickName,
                "status": staffStatus,
                "price": staffPrice,
                "income": staffIncome,
            });
        }

        await this.page.click('img[class*="MyStaff--myStaffClose"]');
        await this.page.waitForSelector('img[class*="MyStaff--myStaffClose"]', { hidden: true });

        this.staffs = staffs;
    }

    async collectStaffIncome() {
        logger.info("开始收集打工收益");
        const btnMyStaff = await this.page.waitForSelector('span ::-p-text(我的员工)');
        await btnMyStaff.evaluate(b => b.click());
        await this.page.waitForSelector('div[class*="MyStaff--myStaffItem"]');
        const staffs = await this.page.$$('div[class*="MyStaff--myStaffItem"]');

        let found = false;

        for (const staff of staffs) {
            const staffNickNameNode = await staff.$('span[class*="MyStaff--myStaffNick"]');
            const staffNickName = await this.page.evaluate(element => element.textContent, staffNickNameNode);

            const staffStatusNode = await staff.$('div[class*="MyStaff--myStaffStatus"]');
            const staffStatus = await this.page.evaluate(element => element.textContent, staffStatusNode);

            if (staffStatus.includes("待领取")) {
                const clickBtn = await staff.$('span[class*="MyStaff--interactiveTxt"] ::-p-text(领取)');
                if (clickBtn) {
                    found = true;
                    await this.delay(500);
                    await clickBtn.evaluate(b => b.click());
                    logger.info(util.format("已领取员工 %s 收益", staffNickName));
                }
            }
        }

        if (!found) {
            logger.info('暂未找到可以领取的打工收益');
        }

        await this.page.click('img[class*="MyStaff--myStaffClose"]');
        await this.page.waitForSelector('img[class*="MyStaff--myStaffClose"]', { hidden: true });
    }

    async layoffWorstStaff() {
        logger.info("开始淘汰最差员工");
        if (this.userInfo.staffNum < this.userInfo.maxStaffNum) {
            logger.info("员工人数未饱和，无需淘汰");
            return false;
        }

        this.staffs.sort((a, b) => a.income - b.income);
        const minIncome = this.staffs[0].income;

        const freeMinIncomeStaffs = this.staffs
            .filter(item => item.status.includes("摸鱼"))
            .filter(item => item.income == minIncome);

        if (freeMinIncomeStaffs.length <= 0) {
            logger.info("未找到低收益的空闲员工，无需淘汰");
            return false;
        }

        await this.reload();
        const targetStaff = freeMinIncomeStaffs[0];

        const btnMyStaff = await this.page.waitForSelector('span ::-p-text(我的员工)');
        await btnMyStaff.click();
        await this.page.waitForSelector('div[class*="MyStaff--myStaffItem"]');
        const staffs = await this.page.$$('div[class*="MyStaff--myStaffItem"]');
        let found = false;

        for (const staff of staffs) {
            const staffNickNameNode = await staff.$('span[class*="MyStaff--myStaffNick"]');
            const staffNickName = await this.page.evaluate(element => element.textContent, staffNickNameNode);

            const staffStatusNode = await staff.$('div[class*="MyStaff--myStaffStatus"]');
            const staffStatus = await this.page.evaluate(element => element.textContent, staffStatusNode);

            if (staffNickName == targetStaff.nickname) {
                if (!staffStatus.includes("摸鱼")) {
                    logger.warn(`待解雇员工 ${staffNickName} 状态错误，当前为 ${staffStatus}`);
                    continue;
                }
                const clickBtn = await staff.$('span ::-p-text(解雇)');
                if (clickBtn) {
                    found = true;
                    await clickBtn.evaluate(b => b.click());
                    await this.delay(1000);
                    const confirmNode = await this.page.waitForSelector('div[class*="commonPop--popConfirmBtn"]');
                    await confirmNode.evaluate(b => b.click());
                    await this.delay(100);
                    await this.page.waitForSelector('img[class*="commonPop--popClose"]', { hidden: true });
                    logger.info(`已解雇员工 ${staffNickName}`);
                    break;
                }
            }
        }

        await this.page.click('img[class*="MyStaff--myStaffClose"]');
        await this.delay(1000);
        await this.page.waitForSelector('img[class*="MyStaff--myStaffClose"]', { hidden: true });

        return found;
    }

    async assignStaffWork() {
        logger.info("开始派活员工");
        await this.reload();
        const btnMyStaff = await this.page.waitForSelector('span ::-p-text(我的员工)');
        await btnMyStaff.click();
        await this.page.waitForSelector('div[class*="MyStaff--myStaffItem"]');
        await this.delay(200);

        let found = false;

        const staffs = await this.page.$$('div[class*="MyStaff--myStaffItem"]');
        logger.info(`找到 ${staffs.length} 位员工`);
        for (const staff of staffs) {
            const staffNickNameNode = await staff.$('span[class*="MyStaff--myStaffNick"]');
            const staffNickName = await this.page.evaluate(element => element.textContent, staffNickNameNode);

            const staffStatusNode = await staff.$('div[class*="MyStaff--myStaffStatus"]');
            const staffStatus = await this.page.evaluate(element => element.textContent, staffStatusNode);

            if (staffStatus == "摸鱼中") {
                const clickBtn = await staff.$('span ::-p-text(派活)');
                if (clickBtn) {
                    this.delay(1000);
                    await clickBtn.evaluate(b => b.click());
                    logger.info(util.format("已分配员工 %s 干活", staffNickName));
                    found = true;
                }
            }
        }

        if (found == false) {
            logger.info("当前员工均在忙碌中");
        }

        await this.page.click('img[class*="MyStaff--myStaffClose"]');
        await this.page.waitForSelector('img[class*="MyStaff--myStaffClose"]', { hidden: true });
    }

    async hireStaff() {
        logger.info("开始雇佣新员工");
        const freeSlot = this.userInfo.maxStaffNum - this.userInfo.staffNum;
        if (freeSlot <= 0) {
            logger.info('没有空闲位置，无需雇佣新员工');
            return false;
        }

        await this.reload();

        this.staffs.sort((a, b) => a.income - b.income);
        const minIncome = this.staffs.length ? this.staffs[0].income : 0;
        const minIncomeNickname = this.staffs.length ? this.staffs[0].nickname : "unknown";

        let maxHirableNickname = "";
        let maxHirableIncome = 0;
        let maxHirablePrice = 0;
        
        const employNodes = await this.page.$$('div[class*="UserItem--employItem"]');
        let targetEmployStatusNode = null;
        for (const employNode of employNodes) {
            const employNicknameNode = await employNode.$('span[class*="UserItem--employNick"]');
            const employNickname = employNicknameNode ? await this.page.evaluate(element => element.textContent, employNicknameNode) : "";

            const employPriceNode = await employNode.$('span[class*="UserItem--employPrice"]');
            const employPriceStr = employPriceNode ? await this.page.evaluate(element => element.textContent, employPriceNode) : null;
            const employPrice = employPriceNode ? parseInt(employPriceStr.match(/(\d+)/)[1]) : 0;

            const employIncomeNode = await employNode.$('span[class*="UserItem--employIncome"] span');
            const employIncomeStr = employIncomeNode ? await this.page.evaluate(element => element.textContent, employIncomeNode) : null;
            const employIncome = employIncomeNode ? parseInt(employIncomeStr.match(/(\d+)/)[1]) : 0;

            const employStatusNode = await employNode.$('div[class*="UserItem--employBtn"]');
            // 邀请 打工中 雇佣
            const employStatus = employStatusNode ? await this.page.evaluate(element => element.textContent, employStatusNode) : "";
            
            if (employStatus.includes("雇佣") 
                    && employIncome > maxHirableIncome
                ) {
                targetEmployStatusNode = employStatusNode;
                maxHirableNickname = employNickname;
                maxHirableIncome = employIncome;
                maxHirablePrice = employPrice;
            }
        }

        if (targetEmployStatusNode == null) {
            logger.warn('未能找到合适的新员工雇佣');
            return false;
        }

        if (maxHirableIncome <= minIncome) {
            logger.info('新员工收入未超过老员工，无需雇佣');
            return false;
        }

        logger.info(`发现新员工[${maxHirableNickname}]收入(${maxHirableIncome})比当前最低收入(${minIncome})员工[${minIncomeNickname}]高，准备雇佣新员工`);

        if (maxHirablePrice > this.userInfo.balance) {
            logger.info(`当前金币不够，无法雇佣新员工。新员工身价${maxHirablePrice}，当前金币${this.userInfo.balance}`);
            return false;
        }

        await targetEmployStatusNode.evaluate(b => b.click());

        const confirmNode = await this.page.waitForSelector('div[class*="commonPop--popConfirmBtn"]');
        const closeNode = await this.page.waitForSelector('img[class*="commonPop--popClose"]');
        await this.delay(1000);

        const confirmSpanNode = await confirmNode.$('span[class*="popConfirmBtnTxt"]');
        const finalPriceStr = confirmSpanNode ? await this.page.evaluate(element => element.textContent, confirmSpanNode) : null;
        const finalPrice = finalPriceStr ? parseInt(finalPriceStr.match(/(\d+)/)[1]) : 0;

        if (finalPrice > this.userInfo.balance) {
            logger.warn(`无法雇佣新员工[${maxHirableNickname}]，其雇佣费为${finalPrice}，当前金币${this.userInfo.balance}`);
            await closeNode.evaluate(b => b.click());
            await this.page.waitForSelector('img[class*="commonPop--popClose"]', { hidden: true });
            return false;
        }

        await confirmNode.evaluate(b => b.click());
        logger.info(util.format("雇佣 %s", maxHirableNickname));
        await this.page.waitForSelector('img[class*="commonPop--popClose"]', { hidden: true });
        return true;
    }

    async completeTasks() {
        logger.info("开始巡检任务");
        await this.page.waitForSelector('div[class*="Main--goldBtn"]');
        await this.page.click('div[class*="Main--goldBtn"]');
        await this.page.waitForSelector('div[class*="taskItem"]')
        const tasks = await this.page.$$('div[class*="taskItem"]');
        logger.info(util.format("加载 %d 个任务", tasks.length));
      
        for (const task of tasks) {
            const taskTitleNode = await task.$('span[class*="title"]');
            const taskTitle = taskTitleNode ? await this.page.evaluate(element => element.textContent, taskTitleNode) : "unknown task";
        
            const taskAcceptBtn = await task.$('div[class*="accepted_button"]');
            if (taskAcceptBtn) {
                const tmp = await taskAcceptBtn.$('span');
                if (!tmp) {
                    await taskAcceptBtn.evaluate(b => b.click());
                    logger.info(util.format("领取任务奖励: %s", taskTitle));
                    await this.delay(1000);
                }
            }
        }

        await this.page.click('div[class*="dotask--src--close"]');
        await this.page.waitForSelector('div[class*="dotask--src--close"]', { hidden: true });
    }

    async screenshot() {
        await this.page.screenshot({path: 'full.png', fullPage: true});
    }

    async delay(time) {
        return new Promise(function(resolve) {
            setTimeout(resolve, time);
        });
    }

}

function parseCookies(cookieString, domain) {
    return cookieString.split('; ').map(cookie => {
        const [name, ...rest] = cookie.split('=');
        return { name, value: rest.join('='), domain };
    });
}

module.exports = Game;