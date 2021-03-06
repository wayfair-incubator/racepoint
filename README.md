<div id="top"></div>

<!-- PROJECT LOGO -->

<div align="center">
  <a href="https://github.com/othneildrew/Best-README-Template">
    <img src="https://i.imgur.com/zmMj409.png" alt="Logo" >
  </a>

  <h3 align="center">Frontend Benchmarking</h3>

  <p align="center">
    <a href="https://github.com/wayfair-incubator/racepoint/issues">Report Bug</a>
    ·
    <a href="https://github.com/wayfair-incubator/racepoint/pulls">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li>
      <a href="#usage">Usage</a>
      <ul>
        <li><a href="#commands">Commands</a></li>
        <li><a href="#debug">Debug</a></li>
      </ul>
    </li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

<div align="center">
<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Race_Point_Lighthouse_on_Cape_Cod_%2814085501664%29.jpg/640px-Race_Point_Lighthouse_on_Cape_Cod_%2814085501664%29.jpg" alt="Race Point Lighthouse" />
</div>

> RacePoint takes its name from the
> [Lighthouse on the 'Knuckles' of Cape Cod](https://www.capecodlighthouses.info/race-point-light/)

This utility provides a mechanism to repeatedly profile web pages. The intention
is to gain metrics and feedback on your page _before_ it is in production.
Specifically it captures several [Core Web Vitals](https://web.dev/vitals/) - an
important set of metrics that Wayfair must meet in order to maintain good SEO
scores.

The main operation of this tool is the 'Profiler' - given a url on some (e.g.
your) DevVm, it will execute Lighthouse from the command line repeatedly and
save various details about the results. After some number of runs is complete,
the tool will present to the user the mean and standard deviation for the
following metrics:

- Speed Index
- First Contentful Paint
- Largest Contentful Paint
- Cumulative Layout Shift
- Max Potential FID
- Total Blocking Time

### Built With

- [Google Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Docker](https://www.docker.com/)
- [Node JS](https://nodejs.org/)
- [Typescript](https://www.typescriptlang.org/)

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- GETTING STARTED -->

## Getting Started

To get a Racepoint up and running locally, follow these simple steps.

### Prerequisites

The following software is required to use Racepoint:

- Docker version 4.0.0 or later
- npm version 16 or later

  ```sh
  npm install npm@latest -g
  ```

- via node version manager

  ```sh
  nvm install 16
  ```

### Installation

1. Clone the repo

   ```sh
   git clone https://github.com/wayfair-incubator/racepoint.git
   ```

2. Navigate to the project folder

   ```sh
   cd racepoint
   ```

3. Build the packages

   ```sh
   npm run build
   ```

4. Build the images

   ```sh
   docker compose build
   ```

5. Run the race command inside a new docker container. Basic usage on an example
   URL

   ```sh
   docker compose run racepoint race profile http://your-favorite-site.com/ -n 5
   ```

6. Perform a single run and save the results HTML to the current working
   directory

   ```sh
   docker compose run -v "$(pwd):/rp/results" racepoint race profile http://example.com/ --output-format html
   ```

7. Shut down containers when finished

   ```sh
   docker compose down
   ```

   <p align="right">(<a href="#top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->

## Usage

Please note that all modes make use of port 3000 and 443 on your local machine
unless otherwise specified. If you have any existing webservers (e.g. nginx)
this may interfere.

Racepoint accepts the following commands and flags:

### Commands

- `profile` - perform a number of Lighthouse runs against a single URL

| <span style="display: inline-block; width:200px">Flag</span> | Description                                                                        |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| --blocked-url-patterns                                       | URLs of requests to block while loading the page. Basic wildcard support using \*. |
| --chrome-flags                                               | Additional comma-delimeted list of Chrome flags for the emulated browser.          |
| -d, --device-type                                            | Device type to emulate (default: "mobile")                                         |
| --disable-storage-reset                                      | If set, will preserve the browser cache between runs.                              |
| --extra-headers                                              | A JSON-encoded string of additional headers to use on during profiling.            |
| --include-individual                                         | Will display the results of individual runs to the console                         |
| -n, --number-runs                                            | Number of Lighthouse runs per URL (default: 1)                                     |
| --output-target                                              | Location to save results (defaults to current directory)                           |
| --output-format                                              | Save results as CSV, HTML, or both                                                 |
| --repository-id                                              | Name of the repository file (default: "lighthouse-runs")                           |
| -h, --help                                                   | Display help for command                                                           |

### Debug

To enable full console logging, run your race command with the environmental
variable `LOG_LEVEL=debug`

```sh
LOG_LEVEL=debug race profile http://my-site.com
```

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- ROADMAP -->

## Roadmap

- [ ] CI integration

There are many exciting new features we plan on adding in the future. Stay
tuned!

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- CONTRIBUTING -->

## Contributing

Please see our
[CONTRIBUTING.md](https://github.com/wayfair-incubator/racepoint/blob/main/CONTRIBUTING.md)
for more information about making contributions.

<p align="right">(<a href="#top">back to top</a>)</p>
