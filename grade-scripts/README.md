Privacy grade scripts
====

These are a set of scripts that run the DDG privacy grade algorithm against a set of sites in bulk, so we can reason about it more easily.

Prerequisites
---

Tested on NodeJS 8.11.x. Any version that supports `async`/`await`.

A few datasets aren't publicly available just yet: `https_list.txt`, `https_autoupgrade_list.txt`, original `polisis.json`. They currently need to be in `data/symlinked`.

Talk to Andrey or Russell if you need them.

Workflow
---

The workflow aims to make it easy to:

- restart previous runs (e.g. if you rerun the same step with the same args, it'll continue where you left off)
- experiment with the output along the way (e.g. tweak the tracker blocking algo, output to a different folder, then compare)

There's three main steps in the process:

### 1. Scrape a list of sites to get a list of requests

`$ node ./grade-scripts/dump-requests.js -f 50k.txt -o 50k`

50k.txt is a list of hostnames separated by newlines like:

```
bbc.co.uk
www.theguardian.com
msnbc.com
...

```

The site data will be output with the following folder structure:

```
50k-sites/
|- bbc.co.uk.json
|- www.theguardian.com.json
|- masnbc.com.json
|- ...
```

The step runs tracker blocking as it goes. The idea is, if you *don't* run tracker blocking while you get the requests you'll end up with a heavily inflated number of trackers (because one tracker may try to access a tracker URL multiple times).

### 2. Get the list of trackers for each of those sites

`$ node ./grade-scripts/trackers-from-requests.js -i 50k -o 50k`

will take request data from `50k-sites` and output it at `50k-trackers`.

This script will also calculate tracker prevalence %'s, which is necessary for the next step.

### 3. Get the grade for each list of trackers

`$ node ./grade-scripts/grades-from-trackers.js -i 50k -o 50k`

will take request data from `50k-trackers` and output it at `50k-grades`.

It'll also produce a histogram and a CSV file with all the grades.

Caveats
---

The output of step 1 is heavily influenced by your location and IP, time of the day, and might be blocked, captcha'd, etc. So the results you get are not consistent between runs.

Steps 2 and 3 are deterministic, so if you're comparing two different sets of data you probably want to use the same data from step 1.
