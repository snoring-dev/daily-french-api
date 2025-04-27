FROM node:18-alpine

WORKDIR /usr/daily-french-app

# Install dependencies
RUN apk add --no-cache python3 py3-pip ffmpeg curl

# Create Python virtual environment and install yt-dlp
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install yt-dlp && \
    ln -sf /opt/venv/bin/yt-dlp /usr/local/bin/yt-dlp

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install

COPY . .

RUN pnpm run build

# Create entrypoint script directly with proper shebang
RUN printf '#!/bin/sh\nyt-dlp -U || true\nexec "$@"\n' > /entrypoint.sh && \
    chmod +x /entrypoint.sh && \
    cat /entrypoint.sh

EXPOSE 3000

CMD ["/bin/sh", "-c", "yt-dlp -U || true && node dist/src/main.js"]
