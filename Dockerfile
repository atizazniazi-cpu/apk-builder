FROM gradle:8.10.2-jdk17

USER root

# Install required packages including Node.js and npm
RUN apt-get update && \
    apt-get install -y wget unzip ca-certificates nodejs npm && \
    rm -rf /var/lib/apt/lists/*

# Android SDK
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk

RUN mkdir -p ${ANDROID_HOME}/cmdline-tools

RUN wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip \
    -O /tmp/cmdline-tools.zip && \
    unzip -q /tmp/cmdline-tools.zip -d ${ANDROID_HOME}/cmdline-tools && \
    mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools \
       ${ANDROID_HOME}/cmdline-tools/latest && \
    rm /tmp/cmdline-tools.zip

# Android SDK tools in PATH
ENV PATH=${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/build-tools/35.0.0:$PATH

# Accept Android licenses
RUN yes | sdkmanager --licenses >/dev/null || true

# Install Android SDK components
RUN sdkmanager \
    "platform-tools" \
    "platforms;android-35" \
    "build-tools;35.0.0"

# Verify installations
RUN node --version && \
    npm --version && \
    gradle --version && \
    sdkmanager --version

WORKDIR /app

# Install Node dependencies
COPY package*.json ./

RUN npm install --omit=dev

# Copy application
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
