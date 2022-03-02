<div id="top"></div>

<!-- PROJECT LOGO -->

<div align="center">
  <a href="https://github.com/othneildrew/Best-README-Template">
    <img src="https://i.imgur.com/zmMj409.png" alt="Logo" >
  </a>

  <h3 align="center">Frontend Benchmarking</h3>

  <p align="center">
    <a href="https://github.com/othneildrew/Best-README-Template">View Demo</a>
    ·
    <a href="https://github.com/othneildrew/Best-README-Template/issues">Report Bug</a>
    ·
    <a href="https://github.com/othneildrew/Best-README-Template/issues">Request Feature</a>
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
    <!-- <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li> -->
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

- Docker Desktop
- npm version 16 or later
  ```sh
  npm install npm@latest -g
  ```
- via node version manager
  ```sh
  nvm install 16
  ```

### Installation

_Below is an example of how you can instruct your audience on installing and
setting up your app. This template doesn't rely on any external dependencies or
services._

1. Clone the repo
   ```sh
   git clone https://github.com/wayfair-incubator/racepoint.git
   ```
2. Navigate to the `race-cli` subpackage
   ```sh
   cd racepoint/packages/race-cli
   ```
3. Install Racepoint command line interface globally
   ```sh
   npm install -g
   ```
4. Basic usage on an example URL
   ```sh
   race profile http://your-favorite-site.com/ -n 5
   ```
   <p align="right">(<a href="#top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->

## Usage

Please note that all modes make use of port 3000 and 442 on your local machine
unless otherwise specified. If you have any existing webservers (e.g. nginx)
this may interfere.

Racepoint accepts the following commands and flags:

### Commands

- `profile` - perform a number of Lighthouse runs against a single URL

| <span style="display: inline-block; width:200px">Flag</span> | Description                                              |
| ------------------------------------------------------------ | -------------------------------------------------------- |
| --chrome-flags                                               | Additional Chrome flags for the emulated browser.        |
| -d, --device-type                                            | Device type to emulate (default: "mobile")               |
| -n, --number-runs                                            | Number of Lighthouse runs per URL (default: 1)           |
| --output-target                                              | Location to save results (defaults to current directory) |
| --output-format                                              | Save results as CSV, HTML, or both                       |
| --raceproxy-port                                             | Port to start the raceproxy container (default: "443")   |
| --racer-port                                                 | Port to start the racer container (default: "3000")      |
| --repository-id                                              | Name of the repository file (default: "lighthouse-runs") |
| -h, --help                                                   | Display help for command                                 |

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

See the
[open issues](https://github.com/othneildrew/Best-README-Template/issues) for a
full list of proposed features (and known issues).

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- CONTRIBUTING -->

## Contributing

Contributions are what make the open source community such an amazing place to
learn, inspire, and create. Any contributions you make are **greatly
appreciated**.

If you have a suggestion that would make this better, please fork the repo and
create a pull request. You can also simply open an issue with the tag
"enhancement". Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- LICENSE -->
<!-- ## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#top">back to top</a>)</p> -->

<!-- CONTACT -->
<!-- ## Contact

Your Name - [@your_twitter](https://twitter.com/your_username) - email@example.com

Project Link: [https://github.com/your_username/repo_name](https://github.com/your_username/repo_name)

<p align="right">(<a href="#top">back to top</a>)</p> -->

<!-- ACKNOWLEDGMENTS -->
<!-- ## Acknowledgments

Use this space to list resources you find helpful and would like to give credit to. I've included a few of my favorites to kick things off!

* [Choose an Open Source License](https://choosealicense.com)
* [GitHub Emoji Cheat Sheet](https://www.webpagefx.com/tools/emoji-cheat-sheet)
* [Malven's Flexbox Cheatsheet](https://flexbox.malven.co/)
* [Malven's Grid Cheatsheet](https://grid.malven.co/)
* [Img Shields](https://shields.io)
* [GitHub Pages](https://pages.github.com)
* [Font Awesome](https://fontawesome.com)
* [React Icons](https://react-icons.github.io/react-icons/search) -->

<p align="right">(<a href="#top">back to top</a>)</p>
