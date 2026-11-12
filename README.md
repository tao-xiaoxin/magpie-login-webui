<div align="center">

<img src="public/magpie-logo-official.png" width="96" alt="magpie">

# magpie-login-webui

### 专为 magpie 的 Web 界面打造的登录静态页面。

**登录页是打包出来的静态页面，鉴权、会话、限流全部由 Nginx 承担。**

[![License](https://img.shields.io/badge/license-MIT-111111)](LICENSE) [![Node](https://img.shields.io/badge/node-%E2%89%A522.12-339933?logo=node.js&logoColor=white)](#环境要求) [![Nginx](https://img.shields.io/badge/nginx-stable--alpine-009639?logo=nginx&logoColor=white)](#方式二docker) [![Docker](https://img.shields.io/badge/docker-compose-2496ED?logo=docker&logoColor=white)](#方式二docker)

**[方式一 · 本地安装](#方式一本地安装)** &nbsp;·&nbsp; **[方式二 · Docker](#方式二docker)** &nbsp;·&nbsp; **[测试验证](#测试验证)** &nbsp;·&nbsp; **[环境变量](#环境变量)**

<br>

<img src="login-page.jpg" width="900" alt="登录页：左侧是 magpie 品牌区，右侧是账号与密码表单">

</div>

<br>

## 它解决什么问题

magpie 的 Web 管理页本身没有账号密码，只有 Web key，这个项目在管理页前面加一层登录：浏览器访问时先看到登录页，输对用户名密码才拿到会话 Cookie，Nginx 校验通过后再把请求转发给 magpie，并在转发时注入 Web key。key 始终留在服务端，浏览器拿不到。

支持两种部署方式，共用同一份 Nginx 站点配置（`nginx/nginx.conf`）：本机安装（系统 nginx + 官方安装脚本装的 magpie）和 Docker（compose 起 magpie 与 nginx 两个容器）。

## 环境要求

- Node.js ≥ 22.12（只用于打包前端）
- 方式一：服务器上有 nginx 和 `envsubst`（`gettext` 包）
- 方式二：有 docker 和 docker compose 插件

## 打包前端

两种部署方式都要先打包，仓库里不包含 `dist/`。

```sh
npm ci            # 安装依赖，第一次必须；等于干净的 npm install，严格按 lockfile
npm run build     # 产物在 dist/
```

<sub>构建期需要 Node，运行期不需要。`dist/` 已在 `.gitignore` 中排除。</sub>

## 方式一：本地安装

magpie 和系统 nginx 直接跑在服务器上，不碰 `/etc/nginx`。下面命令在同一个 shell 里按顺序执行，`<your-dir>` 换成仓库的绝对路径。

### 1. 安装 magpie

```sh
cd <your-dir>
export MAGPIE_BIN_DIR=$PWD/bin
export XDG_CONFIG_HOME=$PWD/config
export XDG_CACHE_HOME=$PWD/cache
mkdir -p "$MAGPIE_BIN_DIR" "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME"

curl -fsSL https://usemagpie.ai/install.sh | sh -s -- --tui   # --tui 就是带网页界面的版本
"$MAGPIE_BIN_DIR/magpie" --version
```

三个环境变量把二进制、配置、缓存都圈在项目目录里，不然会写到 `~/.config`、`~/.cache`。脚本会自己校验发布包的 SHA-256，不匹配就中止。

**更新到最新版**：重跑上面那条 install 命令，然后 `sudo systemctl restart magpie`（第 3 步用的是 systemd 就重启服务，用 3.2 的 nohup 就 kill 掉再重新起）。

**更新到指定版本**：`install.sh` 只装最新版，没有版本参数，指定版本要自己下 release 包替换二进制。版本号就是 Releases 的 tag 去掉 `v`：

```sh
VER=0.1.3866                                                        # 想要哪个版本写哪个
ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
cd "$MAGPIE_BIN_DIR"

curl -fsLO "https://github.com/yetone/magpie/releases/download/v$VER/magpie-cli-linux-$ARCH"
curl -fsSLO "https://github.com/yetone/magpie/releases/download/v$VER/SHA256SUMS"
sha256sum -c --ignore-missing SHA256SUMS      # 输出 OK 才往下走

chmod +x "magpie-cli-linux-$ARCH"
mv "magpie-cli-linux-$ARCH" magpie.new        # 先落新文件再原子替换，不动正在跑的进程
mv magpie.new magpie
"$MAGPIE_BIN_DIR/magpie" --version
```

`--tui` 装的就是这个 `magpie-cli-*` 包（终端界面 + 网页界面 + CLI），换版本不影响配置和登录态。

**卸载**：

```sh
curl -fsSL https://usemagpie.ai/install.sh | sh -s -- --uninstall
```

它会把接进来的 agent 断开并还原、删掉脚本装的东西，`~/.config/magpie` 里的设置保留。设置、供应商、用量记录也要清掉：

```sh
curl -fsSL https://usemagpie.ai/install.sh | sh -s -- --uninstall --purge
```

### 2. 配置 .env

```sh
cp .env.example .env && chmod 600 .env
```

填 3 个空值：登录密码 `MAGPIE_LOGIN_PASSWORD`，加两个随机串——`openssl rand -hex 16` 给 `MAGPIE_WEB_KEY`，`-hex 24` 给 `MAGPIE_API_KEY`。密码只用字母数字，它同时也是会话 Cookie 的值。其余变量都有默认值，不用改。

### 3. 启动 magpie
#### 3.1 Linux 用 systemd 管理 magpie。

```sh
sed "s#<your-dir>#$PWD#g" service/magpie.service | sudo tee /etc/systemd/system/magpie.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable --now magpie

systemctl status magpie --no-pager     # 看状态
journalctl -u magpie -f                # 看日志
sudo systemctl restart magpie          # 改完 .env 后重启生效
```

`MAGPIE_ADDR` 只监听本机，网关不对外。单元里写死了监听地址、配置目录、缓存目录三项，与第 1 步导出的变量一致；`.env` 通过 `EnvironmentFile` 注入，不用再手工 export。

<sub>只想临时前台跑一下：`set -a; . ./.env; set +a` 之后执行 `"$MAGPIE_BIN_DIR/magpie" web --addr 127.0.0.1:3430 --no-open`，Ctrl-C 结束。</sub>

#### 3.2 没有 systemd 时用 nohup 后台运行

```sh
set -a; . ./.env; set +a

nohup env MAGPIE_ADDR=127.0.0.1:3425 \
  MAGPIE_WEB_KEY="$MAGPIE_WEB_KEY" \
  XDG_CONFIG_HOME="$XDG_CONFIG_HOME" XDG_CACHE_HOME="$XDG_CACHE_HOME" \
  "$MAGPIE_BIN_DIR/magpie" web --addr 127.0.0.1:3430 --no-open >> magpie.log 2>&1 &

echo $! > magpie.pid
```

`tail -f magpie.log` 看日志，`kill "$(cat magpie.pid)"` 停止。

<sub>它不管进程：挂掉不会自动拉起，机器重启后也不会自己回来，所以能用 systemd 就走 3.1。`MAGPIE_BIN_DIR`、两个 `XDG_` 变量来自第 1 步，换到新 shell 要先重新 `export` 一次。</sub>

### 4. 安装并启动 nginx

先确认机器上有 nginx 和 `envsubst`，两个都要：

```sh
nginx -v                      # 显示 nginx version: nginx/… 就是装了
envsubst --version            # 显示 GNU gettext-runtime 就是装了
```

缺了用 apt 装，Ubuntu 24.04 源里都有：

```sh
sudo apt update
sudo apt install -y nginx gettext-base
```

然后生成配置并启动：

```sh
mkdir -p runtime/temp && cp /etc/nginx/mime.types runtime/mime.types

cat > runtime/nginx.conf <<'EOF'
user root;              # 项目在 /root 下时必须留着，否则 nobody 读不到 dist
worker_processes 1;
pid nginx.pid;
error_log error.log crit;
events { worker_connections 256; }
http {
    include mime.types;
    default_type application/octet-stream;
    access_log off;
    client_body_temp_path temp/client_body;
    proxy_temp_path temp/proxy;
    include magpie.conf;
}
EOF

set -a; . ./.env; set +a

# 本机部署和容器的三处差异，只在这一步给，不写进 .env
export MAGPIE_UPSTREAM_HOST=127.0.0.1     # 容器里是 magpie 服务名
export MAGPIE_WEB_ROOT="$PWD/dist"        # 容器里是 /usr/share/nginx/html
export MAGPIE_HTTP_PORT=${HTTP_PORT}      # 容器里固定 80

VARS='${MAGPIE_WEB_KEY} ${MAGPIE_API_KEY} ${MAGPIE_LOGIN_USER} ${MAGPIE_LOGIN_PASSWORD} ${MAGPIE_SESSION_TTL} ${MAGPIE_SESSION_RENEW} ${MAGPIE_COOKIE_SECURE_FLAG} ${MAGPIE_UPSTREAM_HOST} ${MAGPIE_WEB_ROOT} ${MAGPIE_HTTP_PORT}'
envsubst "$VARS" < nginx/nginx.conf > runtime/magpie.conf
chmod 600 runtime/magpie.conf        # 里面是明文密钥

nginx -p "$PWD/runtime" -c "$PWD/runtime/nginx.conf" -t          # 先检配置
nginx -p "$PWD/runtime" -c "$PWD/runtime/nginx.conf"             # 启动
nginx -p "$PWD/runtime" -c "$PWD/runtime/nginx.conf" -s quit     # 停止
```

`envsubst` 只替换白名单里这十个变量，nginx 自己的 `$host`、`$request_uri` 不受影响。

`nginx -p ...` 会 fork 到后台，它本身就是守护进程，不依赖当前 shell，所以这里不需要 nohup；机器重启后重新执行一次启动命令即可。改了 `.env` 或 `nginx/nginx.conf` 要重新渲染 `magpie.conf`，再 `-s reload`。

<sub>`nginx/nginx.conf` 是站点配置（http 级），`runtime/nginx.conf` 只是把渲染结果 `magpie.conf` include 进 `http {}` 的主配置，两个不是同一个文件。想在系统 nginx 里反代过来，就在某个 server 里指到 `127.0.0.1:<端口>`，这一步需要修改服务器上的站点配置，仓库不提供。</sub>

## 方式二：Docker

先确认有 docker 和 compose 插件，两个都要：

```sh
docker --version            # 显示 Docker version 就是装了
docker compose version      # 显示 Docker Compose version v2.x 就是装了
```

缺了用 apt 装，Ubuntu 24.04 源里都有：

```sh
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
```

apt 不会把当前用户加进 `docker` 组。想不带 `sudo` 跑 compose，执行 `sudo usermod -aG docker $USER` 后重新登录一次 shell。

然后启动：

```sh
docker compose up -d
docker compose ps                        # magpie 和 magpie-login-nginx 都显示 healthy 后再继续

# 打开 http://localhost:8080/login
# 账号密码就是 .env 里的 MAGPIE_LOGIN_USER / MAGPIE_LOGIN_PASSWORD
```

镜像按版本号钉死，别用 `latest`、`stable`、`edge`、`daily` 这类会动的标签——同一个名字隔一段时间拉到的可能不是同一个版本，容器一重建行为就跟着变。`.env` 里的 `MAGPIE_IMAGE_TAG` 就是版本号：

```sh
MAGPIE_IMAGE_TAG=0.1.3866
```

版本号取 [Releases](https://github.com/yetone/magpie/releases) 的 tag 去掉前缀 `v`。升级就改这个值，只重建 magpie 一个服务：

```sh
docker compose pull magpie
docker compose up -d magpie
```

数据在 `magpie-config` 卷里，换版本不动 providers、keys 和登录态。回退把版本号改回去，同样两步。

默认只绑 `127.0.0.1:8080`。要让外面访问，`.env` 改两行再重建：

```sh
HTTP_BIND=0.0.0.0
MAGPIE_LOGIN_ORIGIN=https://<你的域名>    # 不写就按 HTTP_PORT 推成 http://localhost:<port>
```

```sh
docker compose up -d --force-recreate nginx
```

`/v1` 用的 key 就是 `MAGPIE_API_KEY`：管理页 Gateway → Gateway keys 创建一个并启用，把 `sk-magpie-key-…` 填进 `.env` 的 `MAGPIE_API_KEY`，然后重启。客户端拿同一个值当 Bearer，地址 `http://<host>:8080/v1`。

**卸载**：

```sh
docker compose down            # 停并删容器、网络；magpie-config 卷留着
```

卷还在，下次 `docker compose up -d` 回来还是原来的 providers、keys 和登录态。要连数据一起删：

```sh
docker compose down -v         # 卷一起删，providers/keys/用量都不可恢复
```

镜像想一起清掉：`docker image rm ghcr.io/yetone/magpie:0.1.3866 nginx:stable-alpine`。

<sub>容器里的 magpie 把来自其他容器的请求当作外网，只认管理页里启用的 key——留空或随手编一个都会返回 401，不能用占位值代替。方式一走 loopback，填任意非空字符串即可。数据在 `magpie-config` 卷里（providers、keys、订阅登录态、插件、用量），`docker compose down` 不删除。</sub>

## 测试验证

```sh
set -a; . ./.env; set +a
B=http://localhost:${HTTP_PORT:-8080}    # 方式一换成 http://127.0.0.1:<HTTP_PORT>

curl -sS -o /dev/null -w 'login    %{http_code}\n' "$B/login"            # 200
curl -sS -o /dev/null -w 'anon     %{http_code}\n' "$B/"                 # 303 跳登录
curl -sS -o /dev/null -w 'csrf     %{http_code}\n' "$B/api/v1/auth/csrf" # 200
curl -sS -o /dev/null -w 'no key   %{http_code}\n' "$B/v1/models"        # 401
curl -sS -o /dev/null -w 'apikey   %{http_code}\n' \
  -H "Authorization: Bearer $MAGPIE_API_KEY" "$B/v1/models"              # 200，方式二得是启用状态的 gateway key
curl -sS -o /dev/null -w 'session  %{http_code}\n' -X POST \
  -H "X-CSRF-Token: magpie-webui" \
  -H "X-Magpie-Login: $MAGPIE_LOGIN_USER:$MAGPIE_LOGIN_PASSWORD" \
  "$B/api/v1/auth/sessions"                                              # 201，返回 HttpOnly Cookie
curl -sS -o /dev/null -w 'authed   %{http_code}\n' \
  -H "Cookie: magpie_session=$MAGPIE_LOGIN_PASSWORD" "$B/"               # 200，进管理页
```

密码错是 401，少 `X-CSRF-Token` 是 403，Cookie 错或过期是 303 回登录页。

## 环境变量

一共 10 个，只有 3 个要填，其余都有默认值。

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `MAGPIE_LOGIN_PASSWORD` | **必填**，登录页密码，同时是会话 Cookie 的值（只用字母数字） | 空 |
| `MAGPIE_WEB_KEY` | **必填**，magpie 管理页密钥，Nginx 注入上游 Cookie，不下发给浏览器 | 空 |
| `MAGPIE_API_KEY` | **必填**，调 `/v1` 的 Bearer key；方式二必须是启用状态的 gateway key | 空 |
| `MAGPIE_LOGIN_USER` | 登录页用户名 | `admin` |
| `MAGPIE_SESSION_TTL` | 会话有效期（秒） | `604800` |
| `MAGPIE_SESSION_RENEW` | 每次访问续期到多少秒，留空或 0 = 不续期 | `86400` |
| `HTTP_BIND` / `HTTP_PORT` | 方式二在宿主机上的监听地址 | `127.0.0.1` / `8080` |
| `MAGPIE_IMAGE_TAG` | 方式二用的 magpie 镜像版本，写版本号，别用 `latest` | `0.1.3866` |
| `MAGPIE_COOKIE_SECURE_FLAG` | HTTPS 时填 `"; Secure"`，本机 HTTP 留空 | 空 |
| `MAGPIE_LOGIN_ORIGIN` | 对外 origin，同时作为 magpie 的 `MAGPIE_PUBLIC_URL` | 按 `HTTP_PORT` 推 |

方式一那三个位置（监听端口、`dist` 路径、上游地址）在部署命令里用环境变量给，不进 `.env`。

## 支持一下

如果这个项目帮你省了事，帮我仓库点个 Star，顺手转给同样需要的人。