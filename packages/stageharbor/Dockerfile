FROM ubuntu

ARG JDK_VERSION=11
RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get dist-upgrade -y && \
    apt-get install -y --no-install-recommends dnsmasq && \
    apt-get install -y --no-install-recommends dnsutils && \
    apt-get install -y --no-install-recommends pulseaudio libxcomposite-dev libxcursor-dev libxdamage-dev libncurses5:i386 libc6:i386 libstdc++6:i386 lib32gcc-s1 lib32ncurses6 lib32z1 zlib1g:i386 && \
    apt-get install -y --no-install-recommends openjdk-${JDK_VERSION}-jdk && \
    apt-get install -y --no-install-recommends git wget unzip && \
    apt-get install -y --no-install-recommends screen && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends qtbase5-dev qtchooser qt5-qmake qtbase5-dev-tools

ENV JAVA_HOME /usr/lib/jvm/java-${JDK_VERSION}-openjdk-amd64

ENV ANDROID_SDK_ROOT /opt/android-sdk
ARG ANDROID_SDK_VERSION=8092744
RUN mkdir -p ${ANDROID_SDK_ROOT}/cmdline-tools && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_SDK_VERSION}_latest.zip && \
    unzip *tools*linux*.zip -d ${ANDROID_SDK_ROOT}/cmdline-tools && \
    mv ${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools ${ANDROID_SDK_ROOT}/cmdline-tools/tools && \
    rm *tools*linux*.zip

ENV PATH ${PATH}:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/cmdline-tools/tools/bin:${ANDROID_SDK_ROOT}/platform-tools:${ANDROID_SDK_ROOT}/emulator

ENV LD_LIBRARY_PATH ${ANDROID_SDK_ROOT}/emulator/lib64:${ANDROID_SDK_ROOT}/emulator/lib64/qt/lib

ENV QTWEBENGINE_DISABLE_SANDBOX 1

RUN echo y | sdkmanager "platforms;android-32" && \
    echo y | sdkmanager "system-images;android-32;google_apis_playstore;x86_64" && \
    echo y | sdkmanager "build-tools;32.0.0" && \
    echo y | sdkmanager "platform-tools"

RUN yes | sdkmanager --licenses

ENV PATH "$PATH:$ANDROID_HOME/platform-tools"

RUN echo no | avdmanager create avd --force --name testAVD --abi google_apis_playstore/x86_64 --package 'system-images;android-32;google_apis_playstore;x86_64'

RUN DEBIAN_FRONTEND=noninteractive TZ=America/New_York apt-get -y install tzdata && \
    ln -fs /usr/share/zoneinfo/America/New_York /etc/localtime && dpkg-reconfigure -f noninteractive tzdata

COPY files /mnt/files

WORKDIR /mnt/files

RUN chmod +x emulator.sh && \
    chmod +x update-dns.sh

