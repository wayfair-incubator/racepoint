# Stage Harbor

The swiss knife for mobile automated tasks (Android/iOS)

Stage Harbor (named after the [lighthouse](https://www.capecodlighthouses.info/stage-harbor-lighthouse-k-hardings-beach-lighthouse/) in Chatham, Massachusetts) was born from the need for an automated method of running performance metrics (device and network). We are now designing this tool as an open to grow solution to allow us to have a mobile device/emulator available for any pipeline, which will be customizable to fit the user's needs.

## Android Features

- Oracle Open JDK v11
- Gradle v7.4.2 (Gradle wrapper available)
- Kotlin v1.6.21
- Android SDK v.8092744
- Build tools v.32
- Emulator Image (android-32;google_apis_playstore;x86_64)

## iOS Features
- libimobiledevice v1.3.0
- More comming soon
## Docker image creation

In order to create a local image of stage harbor we need to:

- Install docker 
- Run the following command

```bash
cd /path/to/docker/file
docker image build -t stageharbor .
```

> Mac users : Mac is not compatible at the moment to run the headless emulator, we can use a physical device connected to the host instead.

> Windows users : We need to enable the WSL 2 feature in order to enable the emulator, we can enable thar following [this](https://docs.microsoft.com/en-us/windows/wsl/install) steps. Linux rules :metal:
## Container creation/usage

```bash
docker container run -it --privileged --rm stageharbor /bin/bash
```

#### Where

- -i    : Keep STDIN open even if not attached *
- -t    : Allocate a pseudo-tty *
- --privileged : Needed in order to use host's emulation capabilities (To run the android emulator).
- --rm  : Needed when runing in a CI/CD pipeline, to dispose the container after we get results back.
- /bin/bash : To set bash as default console on the container *

*(Used only if testing, to keep the input alive even in detached mode, not needed in a CI/CD Pipeline)


## Documentation

[Human Readable Documentation](https://infohub.corp.wayfair.com/x/chzLJg)

[Technical Documentation](#) (In progress)


## Feedback

If you have any feedback, please reach out to me at smartinez11@wayfair.com


## Roadmap

- Enable integratgion with Racepoint (Emulator)
- Add multiple docker image versions with tags, for mobile os versions (like stageharbor-android-latest, stageharbor-android-oreo, stageharbor-iOS-13, etc...)
- Clone a repository/branch that contains the desired code (Or pass it as a volume)
- Run unit tests based on a namespace / class / test name
- Configure endpoints and resources to throw results to the desired tools (Datadog, Scribe, etc...)
- Create scripts to run specific tasks, making them automated processes 
- iOS Compatibility
- Real Device farm (To allow configurations like : internal network access (Compatibility with racepoint and other tools), complete control over physical devices, UI testing using stageharbor or any other custom tool 
- Decide if this can be an open source tool :smile:
## Authors

- [@smartinez11](smartinez11@wayfair.com)
