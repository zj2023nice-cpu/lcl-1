# ============================================
# 第一阶段：构建阶段 (Build Stage)
# 使用 Maven + JDK 17 镜像编译 Spring Boot 项目
# ============================================
FROM maven:3.9-eclipse-temurin-17 AS builder

# 设置工作目录
WORKDIR /app

# 复制 pom.xml 到工作目录
# 单独复制 pom.xml 可以利用 Docker 缓存，
# 只有 pom.xml 变更时才会重新下载依赖
COPY pom.xml .

# 下载 Maven 依赖（不执行测试和编译）
# 使用 dependency:go-offline 提前下载所有依赖到本地仓库
RUN mvn dependency:go-offline -B

# 复制项目源码到工作目录
COPY src ./src

# 执行 Maven 构建命令
# -B: 批处理模式（非交互）
# -DskipTests: 跳过单元测试
# clean package: 清理并打包项目
RUN mvn clean package -B -DskipTests

# ============================================
# 第二阶段：运行阶段 (Runtime Stage)
# 使用轻量级 JRE 17 镜像运行应用
# ============================================
FROM eclipse-temurin:17-jre

# 设置工作目录
WORKDIR /app

# 安装系统依赖：FFmpeg（音频处理）、curl（健康检查）
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

# 从构建阶段复制打包好的 jar 文件
# Spring Boot 打包后通常在 target 目录下，
# 文件名通常为 {artifactId}-{version}.jar
# 使用通配符匹配，并重命名为 app.jar 简化启动命令
COPY --from=builder /app/target/*.jar app.jar

# 暴露应用端口（Spring Boot 默认 8080）
EXPOSE 8080

# 设置 JVM 启动参数环境变量（可在运行时覆盖）
# 默认设置初始堆内存 256MB，最大堆内存 1GB
ENV JAVA_OPTS="-Xms256m -Xmx1g -XX:+UseG1GC"

# 设置容器启动时区为 Asia/Shanghai
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 容器启动命令：执行 java -jar app.jar
# 使用 exec 形式确保信号正确传递
ENTRYPOINT ["sh", "-c", "java ${JAVA_OPTS} -jar app.jar"]
