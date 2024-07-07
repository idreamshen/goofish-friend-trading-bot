# 闲鱼人才市场机器人
在“人才市场”该游戏中自动打工

# 支持的功能
- [X] 自动雇佣
- [X] 自动领取打工奖励
- [X] 自动分配员工任务
- [X] 自动领取任务奖励
- [X] 自动淘汰最差的员工
- [X] 自动雇佣更好的员工
- [ ] 自动完成任务

# Docker 使用方式
```
docker run -e COOKIE_STR='' -d idreamshen/goofish-friend-trading-bot:main
```
- COOKIE_STR 为 https://h5.m.goofish.com/wow/moyu/moyu-project/friend-trading/pages/home?titleVisible=false&loadingVisible=false&source=wdcard 该网页中的 cookie，需自行登陆成功进入游戏后，将 cookie 复制给 COOKIE_STR 变量
- COOKIE_STR 的值类似为 '__itrace_wid=***; cookie2=***; cna=***; _samesite_flag_=***; t=***; _tb_token_=***; xlly_s=***; unb=***; mtop_partitioned_detect=***; _m_h5_tk=***; _m_h5_tk_enc=***; sgcookie=***; csg=***; isg=***; tfstk=***'

# 日志一览
```
[2024-07-07 15:43:31] info: 开始游戏
[2024-07-07 15:43:45] info: 开始收集打工收益
[2024-07-07 15:43:46] info: 暂未找到可以领取的打工收益
[2024-07-07 15:43:46] info: 开始巡检任务
[2024-07-07 15:43:47] info: 加载 9 个任务
[2024-07-07 15:43:47] info: 个人信息: {"level":12,"price":1075,"balance":28091,"staffNum":10,"maxStaffNum":10,"bossName":"***"}
[2024-07-07 15:43:49] info: 我的员工: [{"nickname":"***","status":"干活中：01:03:10","price":500,"income":140},{"nickname":"***","status":"干活中：00:37:10","price":450,"income":130},{"nickname":"***","status":"干活中：01:44:19","price":400,"income":120},{"nickname":"***","status":"干活中：01:06:10","price":400,"income":120},{"nickname":"***","status":"干活中：02:01:10","price":350,"income":110},{"nickname":"***","status":"干活中：01:13:19","price":350,"income":110},{"nickname":"***","status":"干活中：02:06:50","price":300,"income":100},{"nickname":"***","status":"干活中：02:09:40","price":300,"income":100},{"nickname":"***","status":"干活中：02:01:29","price":300,"income":100},{"nickname":"***","status":"干活中：02:11:20","price":300,"income":100}]
[2024-07-07 15:43:49] info: 可雇佣员工: [{"nickname":"***","price":350,"income":110,"status":"雇佣"}]
[2024-07-07 15:43:49] info: 开始淘汰最差员工
[2024-07-07 15:43:49] info: 未找到低收益的空闲员工，无需淘汰
[2024-07-07 15:43:49] info: 开始雇佣新员工
[2024-07-07 15:43:49] info: 没有空闲位置，无需雇佣新员工
[2024-07-07 15:43:49] info: 开始派活员工
[2024-07-07 15:43:51] warn: 上一轮未结束
[2024-07-07 15:43:52] info: 找到 10 位员工
[2024-07-07 15:43:53] info: 当前员工均在忙碌中
[2024-07-07 15:43:53] info: 个人信息: {"level":12,"price":1075,"balance":28091,"staffNum":10,"maxStaffNum":10,"bossName":"***"}
[2024-07-07 15:43:54] info: 我的员工: [{"nickname":"***","status":"干活中：01:03:05","price":500,"income":140},{"nickname":"***","status":"干活中：00:37:05","price":450,"income":130},{"nickname":"***","status":"干活中：01:44:14","price":400,"income":120},{"nickname":"***","status":"干活中：01:06:05","price":400,"income":120},{"nickname":"***","status":"干活中：02:01:05","price":350,"income":110},{"nickname":"***","status":"干活中：01:13:14","price":350,"income":110},{"nickname":"***","status":"干活中：02:06:45","price":300,"income":100},{"nickname":"***","status":"干活中：02:09:35","price":300,"income":100},{"nickname":"***","status":"干活中：02:01:24","price":300,"income":100},{"nickname":"***","status":"干活中：02:11:15","price":300,"income":100}]

```