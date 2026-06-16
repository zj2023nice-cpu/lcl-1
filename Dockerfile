# ============================================
# 第一阶段：构建阶段 (Build Stage)
# 使用 Node.js 20 Alpine 镜像构建前端项目
# ============================================
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
# 单独复制依赖文件可以利用 Docker 缓存，
# 只有依赖文件变更时才会重新安装依赖
COPY package*.json ./

# 安装项目依赖
# 使用 npm ci 根据 package-lock.json 安装确定版本的依赖，
# 比 npm install 更快更可靠
RUN npm ci

# 复制项目源码到工作目录
COPY . .

# 执行构建命令，生成静态资源到 dist 目录
RUN npm run build

# ============================================
# 第二阶段：运行阶段 (Runtime Stage)
# 使用 Nginx Alpine 镜像提供静态文件服务
# ============================================
FROM nginx:alpine

# 复制自定义的 Nginx 配置文件
COPY nginx.conf /etc/nginx/nginx.conf

# 从构建阶段复制构建产物到 Nginx 静态文件目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露 Nginx 监听端口 80
EXPOSE 80

# 容器启动命令：前台运行 Nginx
CMD ["nginx", "-g", "daemon off;"]
