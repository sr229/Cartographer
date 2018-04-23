# Cartographer
Sitemap builder for osu!wiki

# Running
You need Node.js v8+ in order to run the webhook.  
You'll also need to get a GitHub access token from [here](https://github.com/settings/tokens) and give it the `repo` scope, and then set that either as an environment variable called `ACCESS_TOKEN` or in a `config.json` in `src/`, in a key called `accessToken`.  
You'll need to put your GitHub username as an environment variable called `ACCESS_USER` or in the `config.json` in a key called `accessUser`.