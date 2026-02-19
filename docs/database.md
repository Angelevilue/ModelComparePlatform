# PostgreSQL 数据库使用指南

本文档介绍如何在 ModelCompare 平台使用 PostgreSQL 数据库存储对话历史和模型配置。

## 快速开始

### 1. 启动数据库

```bash
npm run db:start
```

### 2. 启动应用

```bash
# 启动后端 + 前端
npm run dev:all

# 或启动桌面端
npm run electron:dev
```

## 数据库管理命令

| 命令 | 说明 |
|------|------|
| `npm run db:start` | 启动 PostgreSQL 数据库 |
| `npm run db:stop` | 停止数据库 |
| `npm run db:reset` | 重置数据库（清空所有数据） |

## 连接数据库

### 命令行连接

```bash
docker exec -it modelcompare-db psql -U modelcompare -d modelcompare
```

### 连接参数

| 参数 | 值 |
|------|------|
| 主机 | localhost |
| 端口 | 5432 |
| 用户名 | modelcompare |
| 密码 | modelcompare123 |
| 数据库 | modelcompare |

### 图形化客户端连接

推荐使用以下客户端：
- [DBeaver](https://dbeaver.io/) - 免费、跨平台
- [pgAdmin](https://www.pgadmin.org/) - PostgreSQL 官方工具
- [DataGrip](https://www.jetbrains.com/datagrip/) - JetBrains 出品
- [TablePlus](https://tableplus.com/) - macOS 专用

## 数据库表结构

### users 表 - 用户信息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| username | VARCHAR(100) | 用户名 |
| created_at | TIMESTAMP | 创建时间 |

### conversations 表 - 对话信息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(50) | 主键 |
| user_id | INTEGER | 用户ID |
| title | VARCHAR(255) | 对话标题 |
| mode | VARCHAR(20) | 模式（single/compare） |
| system_prompt | TEXT | 系统提示词 |
| compare_count | INTEGER | 对比数量 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### messages 表 - 消息记录

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(50) | 主键 |
| conversation_id | VARCHAR(50) | 对话ID |
| role | VARCHAR(20) | 角色（user/assistant） |
| content | TEXT | 消息内容 |
| model_id | VARCHAR(100) | 模型ID |
| panel_index | INTEGER | 面板索引（对比模式） |
| is_error | BOOLEAN | 是否错误 |
| is_streaming | BOOLEAN | 是否正在生成 |
| created_at | TIMESTAMP | 创建时间 |

### model_configs 表 - 模型配置

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(50) | 主键 |
| name | VARCHAR(100) | 模型名称 |
| provider | VARCHAR(100) | 提供商 |
| model_id | VARCHAR(200) | 模型标识 |
| api_key | TEXT | API密钥 |
| base_url | VARCHAR(500) | API地址 |
| temperature | DECIMAL | 温度参数 |
| max_tokens | INTEGER | 最大Token |
| top_p | DECIMAL | Top-P参数 |
| is_enabled | BOOLEAN | 是否启用 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## 常用 SQL 查询

### 查看所有对话

```sql
SELECT id, title, mode, created_at 
FROM conversations 
ORDER BY updated_at DESC;
```

### 查看某对话的所有消息

```sql
SELECT role, content, model_id, created_at 
FROM messages 
WHERE conversation_id = '对话ID' 
ORDER BY created_at;
```

### 统计对话数量

```sql
SELECT COUNT(*) FROM conversations;
```

### 统计消息数量

```sql
SELECT COUNT(*) FROM messages;
```

### 删除特定对话

```sql
DELETE FROM conversations WHERE id = '对话ID';
-- 关联的消息会自动删除（级联删除）
```

### 清空所有数据（保留表结构）

```sql
TRUNCATE TABLE messages;
TRUNCATE TABLE conversations;
TRUNCATE TABLE model_configs;
```

## API 接口

后端提供以下 REST API 接口：

### 对话接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/conversations` | 获取所有对话 |
| POST | `/api/conversations` | 创建对话 |
| PUT | `/api/conversations/:id` | 更新对话 |
| DELETE | `/api/conversations/:id` | 删除对话 |
| DELETE | `/api/conversations/:id/messages` | 清空对话消息 |

### 消息接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/conversations/:id/messages` | 获取对话消息 |
| POST | `/api/conversations/:id/messages` | 添加消息 |
| PUT | `/api/conversations/:id/messages/:msgId` | 更新消息 |
| DELETE | `/api/conversations/:id/messages/:msgId` | 删除消息 |

### 模型接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/models` | 获取模型配置 |
| POST | `/api/models` | 保存模型配置 |

## 数据同步机制

### 存储优先级

1. **PostgreSQL 数据库**（优先）
   - 后端服务连接成功时使用
   - 支持多端数据同步

2. **本地文件存储**（备用）
   - 数据库不可用时自动降级
   - 文件位置：`config/models.json`

3. **浏览器 localStorage**（降级）
   - 后端服务不可用时使用
   - 仅本地存储

### 前端数据同步

前端每次操作都会：
1. 更新本地状态（立即生效）
2. 异步同步到后端（静默执行）
3. 后端不可用时自动降级

## 故障排除

### 数据库连接失败

1. 检查 Docker 是否运行：
```bash
docker ps
```

2. 检查数据库容器状态：
```bash
docker logs modelcompare-db
```

3. 重启数据库：
```bash
npm run db:stop
npm run db:start
```

### 重置数据库

如果需要清空所有数据重新开始：

```bash
npm run db:reset
```

### 查看数据库日志

```bash
docker logs -f modelcompare-db
```

## 备份与恢复

### 备份数据库

```bash
docker exec modelcompare-db pg_dump -U modelcompare modelcompare > backup.sql
```

### 恢复数据库

```bash
cat backup.sql | docker exec -i modelcompare-db psql -U modelcompare modelcompare
```

## 性能优化

### 索引说明

数据库已创建以下索引以提升查询性能：

```sql
-- 对话查询优化
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

-- 消息查询优化
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);
```

### 查询优化建议

1. 使用索引字段进行排序
2. 避免全表扫描
3. 定期清理历史数据

## 环境变量配置

在 `.env` 文件中配置数据库连接：

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=modelcompare
DB_PASSWORD=modelcompare123
DB_NAME=modelcompare
PORT=3001
```

生产环境建议修改默认密码。
