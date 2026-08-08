# Siwei Web

Siwei 是一个基于 React 的 Web 大纲与思维导图编辑器。文档和文件夹统一保存在服务器，浏览器端负责编辑、导入和导出，不再依赖 Tauri、Rust 或本地文件对话框。

## 功能

- 服务器文档空间：支持文件夹、文档、搜索、打开和删除。
- 大纲与思维导图：共享同一份树形数据，支持折叠、编辑和紧凑布局。
- 节点格式：文字颜色、字号、节点背景、粗体、斜体、下划线、删除线、链接和待办。
- 浏览器导入：JSON、Markdown、OPML。
- 浏览器导出：JSON、Markdown、OPML、HTML、纯文本，以及思维导图 PNG/PDF。
- Web 服务监听所有网络接口，开发端口为 `5185`。

## 安装与启动

```bash
pnpm install
pnpm dev
```

开发模式会同时启动：

- Web 前端：`http://0.0.0.0:5185`
- 文档 API：`http://0.0.0.0:5190`

同一局域网中的设备可通过 `http://<服务器IP>:5185` 访问。若需要外网访问，请在路由器、防火墙或反向代理中开放对应端口，并为生产环境配置 HTTPS 和身份认证。

## 生产构建

```bash
pnpm build
pnpm start
```

`pnpm start` 会在 `5185` 端口提供 API 和 `dist` 静态文件。可用 `PORT` 或 `SIWEI_API_PORT` 修改端口。

## 数据位置

服务器文档保存在：

```text
server-data/workspace.json
```

该目录已加入 `.gitignore`。部署时请为它配置持久化磁盘并定期备份。

## 验证

```bash
pnpm build
pnpm test
```

## 目录

```text
src/                React 前端
server/             Node.js 文档 API 与格式转换
scripts/dev-web.mjs Web/API 联合开发启动器
server-data/        运行时文档数据（不提交）
```
