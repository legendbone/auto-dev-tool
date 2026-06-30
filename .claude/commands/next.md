请按照 CLAUDE.md 中定义的工作流执行下一个任务：

1. 先运行 ./init.sh 初始化环境（如果尚未运行）
2. 读取 task.json，选择下一个 passes: false 的任务
3. 按照任务的 steps 逐步实现
4. 测试验证（lint + build + 浏览器测试）
5. 更新 progress.txt
6. 提交所有更改（代码 + task.json + progress.txt 在同一个 commit）

开始吧。
