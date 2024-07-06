const puppeteer = require('puppeteer');
const util = require('util');
const logger = require('./logger');

class Game {

    constructor(cookieString) {
        this.cookieString = cookieString;
        this.page = null;
    }

    async start() {
        const browser = await puppeteer.launch();
        this.page = await browser.newPage();
        await this.page.emulate(puppeteer.KnownDevices['iPhone 12 Pro']);
        const cookies = parseCookies(this.cookieString, '.goofish.com');

        await this.page.goto('https://h5.m.goofish.com/wow/moyu/moyu-project/friend-trading/pages/home?titleVisible=false&loadingVisible=false&source=wdcard');
        await this.delay(1000);
        await this.page.setCookie(...cookies);
        await this.delay(1000);
        await this.reload();

        const interval = 10000; // 每10秒执行一次
        setInterval(async () => {
            try {
                await this.reload();
                const userInfo = await this.fetchUserInfo();
                logger.info(`当前等级=${userInfo.level} 身价=${userInfo.worth} 金币=${userInfo.balance} 员工数量=${userInfo.staffNum} 老板名字=${userInfo.bossName}`);
                await this.completeTasks();
                await this.inviteStaff();   
                await this.assignStaff();
            } catch (error) {
                logger.error('Error', error);
            }
        }, interval);

        logger.info("开始游戏");
    }

    async reload() {
        await this.page.reload();
        const btnMyStaff = await this.page.waitForSelector('span ::-p-text(我的员工)');
    }

    async assignStaff() {
        logger.info("开始巡检员工");
        await this.reload();
        const btnMyStaff = await this.page.waitForSelector('span ::-p-text(我的员工)');
        await btnMyStaff.click();
        await this.delay(100);

        await this.page.waitForSelector('div[class*="MyStaff--myStaffItem"]');
        await this.delay(100);

        const staffs = await this.page.$$('div[class*="MyStaff--myStaffItem"]');
        for (const staff of staffs) {
            const staffNickNameNode = await staff.$('span[class*="MyStaff--myStaffNick"]');
            const staffNickName = await this.page.evaluate(element => element.textContent, staffNickNameNode);

            const staffStatusNode = await staff.$('div[class*="MyStaff--myStaffStatus"]');
            const staffStatus = await this.page.evaluate(element => element.textContent, staffStatusNode);

            if (staffStatus == "摸鱼中") {
                const clickBtn = await staff.$('span ::-p-text(派活)');
                if (clickBtn) {
                    await clickBtn.evaluate(b => b.click());
                    logger.info(util.format("已分配员工 %s 干活", staffNickName));
                }
            } else if (staffStatus.includes("待领取")) {
                const clickBtn = await staff.$('span[class*="MyStaff--interactiveTxt"] ::-p-text(领取)');
                if (clickBtn) {
                    await clickBtn.evaluate(b => b.click());
                    logger.info(util.format("已领取员工 %s 收益", staffNickName));
                }
            }
        }

        await this.page.click('img[class*="MyStaff--myStaffClose"]');
        await this.page.waitForSelector('img[class*="MyStaff--myStaffClose"]', { hidden: true });
    }

    async fetchUserInfo() {
        const levelNode = await this.page.waitForSelector('span[class*="UserInfo--userLevel"]');
        const levelStr = levelNode ? await this.page.evaluate(element => element.textContent, levelNode) : null;
        const level = levelStr ? parseInt(levelStr.replace('Lv.', '')) : 0;

        const balanceNode = await this.page.waitForSelector('span[class*="UserInfo--balance"]');
        const balance = balanceNode ? parseInt(await this.page.evaluate(element => element.textContent, balanceNode)) : 0;
        
        const worthNode = await this.page.waitForSelector('span[class*="UserInfo--description"] ::-p-text(身价) span');
        const worth = worthNode ? parseInt(await this.page.evaluate(element => element.textContent, worthNode)) : 0;

        const staffNumNode = await this.page.waitForSelector('span[class*="UserInfo--description"] ::-p-text(员工) span');
        const staffNum = staffNumNode ? parseInt(await this.page.evaluate(element => element.textContent, staffNumNode)) : 0;

        const bossNameNode = await this.page.waitForSelector('div[class*="BossInfo--myBoss"] span span');
        const bossName = bossNameNode ? await this.page.evaluate(element => element.textContent, bossNameNode) : "";
        
        
        const maxStaffNumNode = await this.page.waitForSelector('span[class*="Main--staffNumber"]');
        const maxStaffNumStr = maxStaffNumNode ? await this.page.evaluate(element => element.textContent, maxStaffNumNode) : null;
        const maxStaffNum = maxStaffNumStr ? parseInt(maxStaffNumStr.match(/\/(\d+)/)[1]) : 0;
        
        const userInfo = {
            "level": level, // 等级
            "worth": worth, // 身价
            "balance": balance, // 金币
            "staffNum": staffNum, // 员工数量
            "maxStaffNum": maxStaffNum, // 最大员工数量
            "bossName": bossName, // 老板名字
        };


        return userInfo;
    }

    async inviteStaff() {
        logger.info("开始巡检雇佣");
        const userInfo = await this.fetchUserInfo();
        const freeSlot = userInfo.maxStaffNum - userInfo.staffNum;
        if (freeSlot <= 0) {
            logger.info(`员工人数已满，无需雇佣新员工。当前员工数=${userInfo.staffNum}`);
            return;
        }

        let hirableStaffs = [];
        const employNodes = await this.page.$$('div[class*="UserItem--employItem"]');
        for (const employNode of employNodes) {
            const employNicknameNode = await employNode.$('span[class*="UserItem--employNick"]');
            const employNickname = employNicknameNode ? await this.page.evaluate(element => element.textContent, employNicknameNode) : "";

            const employWorthNode = await employNode.$('span[class*="UserItem--employPrice"]');
            const employWorthStr = employWorthNode ? await this.page.evaluate(element => element.textContent, employWorthNode) : null;
            const employWorth = employWorthNode ? parseInt(employWorthStr.match(/(\d+)/)[1]) : 0;

            const employIncomeNode = await employNode.$('span[class*="UserItem--employIncome"] span');
            const employIncomeStr = employIncomeNode ? await this.page.evaluate(element => element.textContent, employIncomeNode) : null;
            const employIncome = employIncomeNode ? parseInt(employIncomeStr.match(/(\d+)/)[1]) : 0;

            const employStatusNode = await employNode.$('div[class*="UserItem--employBtn"]');
            // 邀请 打工中 雇佣
            const employStatus = employStatusNode ? await this.page.evaluate(element => element.textContent, employStatusNode) : "";
            if (employStatus == "雇佣") {
                hirableStaffs.push({
                    "node": employNode,
                    "statusNode": employStatusNode,
                    "nickname": employNickname,
                    "worth": employWorth,
                    "income": employIncome,
                    "status": employStatus,

                });
            }
        }

        logger.info(util.format("找到 %d 个可雇佣员工，当前需要雇佣 %d 个", hirableStaffs.length, freeSlot));

        if (hirableStaffs.length <= 0) {
            return;
        }

        const hirableStaff = hirableStaffs[0];
        await hirableStaff.statusNode.evaluate(b => b.click());

        const confirmNode = await this.page.waitForSelector('div[class*="commonPop--popConfirmBtn"]');
        const inWorkNode = await this.page.$('span ::-p-text(他正在为)');
        const closeNode = await this.page.$('img[class*="commonPop--popClose"]');
        if (!inWorkNode) {
            await confirmNode.evaluate(b => b.click());
            logger.info(util.format("雇佣 %s", hirableStaff.nickname));
            await this.page.$('img[class*="commonPop--popClose"]', { hidden: true });
        } else {
            logger.info(util.format("%s 已有雇主，不雇佣", hirableStaff.nickname));
            await closeNode.evaluate(b => b.click());
            await this.page.$('img[class*="commonPop--popClose"]', { hidden: true });
        }
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
                    await this.delay(50);
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