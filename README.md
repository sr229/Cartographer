# Cartographer
Sitemap builder for osu!wiki

## Running
You need Node.js v8+ in order to run the webhook.

## Configuration
You'll need to get a GitHub access token from [here](https://github.com/settings/tokens) and give it the `repo` scope in order to properly use this.

Either create a `config.yml` in `src/` with the following keys:
```yml
port: 8080 # Port to listen on. Defaults to 8080.
sitemapPath: "wiki/__sitemap.md" # Path of where to write the sitemap. Defaults to "wiki/__sitemap.md"
sitemapGenPath: "" # What path to generate the sitemap of. Defaults to the directory of sitemapPath.
skipFiles: true # Whether to skip over files while generating the sitemap. Defaults to true.
accessToken: "" # Access token for GitHub.
accessUser: "" # Username to access GitHub as. Should be the same username that accessToken was generated for.
```

or as the following environment variables (useful if using a "serverless" deployer like Heroku):
```
PORT=8080
SITEMAP_PATH=wiki/__sitemap.md
SITEMAP_GEN_PATH=
SKIP_FILES=true
ACCESS_TOKEN=
ACCESS_USER=
```

Add `http://your-host.com/cartographer-webhook` as a webhook listening to the `push` event on your repository on GitHub, and watch the magic happen.