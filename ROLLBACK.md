# 回滚指南

本项目使用 Git 版本控制，支持多种方式回滚到之前的版本。

## 版本标签

| 版本 | 说明 | 日期 |
|------|------|------|
| v1.1.0 | 视唱练耳功能完善 | 2026-01-13 |
| v1.0.0 | 钢琴弹奏功能完成 | 2026-01-13 |

## 回滚方法

### 方法1：回滚到特定版本标签

```bash
# 查看所有版本标签
git tag -l

# 回滚到 v1.0.0
git checkout v1.0.0

# 如果需要在该版本基础上继续开发
git checkout -b new-branch-from-v1.0.0 v1.0.0
```

### 方法2：回滚到特定提交

```bash
# 查看提交历史
git log --oneline -10

# 回滚到特定提交（保留更改为未提交状态）
git reset --soft <commit-hash>

# 回滚到特定提交（完全丢弃更改）
git reset --hard <commit-hash>
```

### 方法3：撤销最近的提交

```bash
# 撤销最近一次提交（保留更改）
git reset --soft HEAD~1

# 撤销最近一次提交（丢弃更改）
git reset --hard HEAD~1
```

### 方法4：强制推送回滚

```bash
# 回滚后强制推送到远程（慎用！）
git push origin main --force
```

## 恢复方法

如果回滚后需要恢复：

```bash
# 查看所有操作历史（包括回滚）
git reflog

# 恢复到某个状态
git reset --hard <reflog-hash>
```

## 注意事项

1. 回滚前请确保当前更改已提交或暂存
2. 强制推送会覆盖远程历史，团队协作时请谨慎使用
3. 建议在重要节点创建版本标签：`git tag -a vX.X.X -m "描述"`
