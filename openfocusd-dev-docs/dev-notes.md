```markdown
# OpenFocus browser focus/blocker ext (Chrome/Brave/Firefox) product exploration

existing apps: StayFocusd https://chromewebstore.google.com/detail/stayfocusd-%E2%80%93-website-bloc/laankejkbhbdhmipfmgcngdelahlfoji

- StayFocsd, is a popular chrome ext to block sites that are distracting with 8.6k ratings avg. 4.5/5 and is prob the most used Chrome ext for blocking site and staying focus

- **what it does well**
    - it good at blocking sites and has a good timer ux that that users know how much time is left for that site/category
    - it works well for a single browser blocking but does not sync across all browsers/apps

- **what can be better**
    - app seems super buggy and create group did not working when first installed
        - TypeError: Cannot read properties of undefined (reading 'find') at \_virtual_wxt-plugins-DMpaGf42.js:582:263446
    - the settings can be a bit confusing/annoying, too many settings; there should be sane defaults like block all adult sites, 1 hour for youtube, etc.. sane template that users can modify for their own preferences; i do not want to add every site that might be distracting/inappropriate - but it should be easy to add new sites
        - not sure how to use Nuclear Option, is it a whitelist only option? better naming would be refuge/santuary (positive meaning)
        - disabling switch is alway a redundant, there should not be an option to do that, it should simply be "uninstall ext" which the user can do if they really want to disable the ext so the UX disable switch is not relevant and should not be included as an option
        - these should be a right click context menu option to "block entire url", block a single url is not an useful option and should not be included
            - we should not have "allowed site/url" options in the main view; this should only be available in "Exceptions, Sanctuary" list view
            - this should be a single big button to add current site to block list; 1. click block -> 2. select group
        - the settings for "allow url", "block url", seems broken/confusing, not sure how it actually works
    - "Require challenge" setting to get into configs can be a hassle if you just want to change a settings; should work using some other method that is both effective and less annoying if you actually need to change some settings
    - its a pain to setup initial sites from scratch, there should be sane default, like block all scam/porn/gambling sites by default

- introducing **OpenFocus Project**, an open, and free broswer extension to block distracting website and focus on doing great work
    - Free and Opensourced, MIT License
        - there is another oss project we might be able to use to bootstrap ours https://chromewebstore.google.com/detail/stay-focused/nnlgodiccogbpcfnhmclaicljjgfmekd
    - General Design Principles
        - trust the user to be responsible; if they install this app, then they want to make a change; dont make annoying features, give configuration options instead;
        - have great analytics tracking; we can only improve what we measure
        - be opionated where it matters; eg. sane defaults over starting block lists from scratch
        - just use plain JS/HTML/CSS, no frameworks
    - **support all the great features and UX that StayFocusd already has first** while leaving out the annoying parts
        - story: users can set daily allowance timer per block site group
        - story: users can add sites to per group block list
        - story: users able to create different groups to organize different time allowances per day and track them by group
        - story: when a block group time is used up for the day, block the entire groups websites
            - other groups can still be viewed if their time has not run out for this day
        - requirements: our opensource app should be free from bugs and be super high quality
    - **Extra Feature Ideas beyond the basics**
        - support Exceptions, for eg. if we set a limit of 1 hours per for YT, then we can add certain videos to Exceptions that we need for our work
        - Sanctuary Mode: lets users have a small list of sites 5-10 that are allowed for a set amount of time if Sanctuary is activated
    - community shared list of scam/casino/porn/antisocial websites
        - provide an easy to switch block all sites on this list ALWAYS
        - users can submit new sites to this list (requires backend service+db)
    - **easy switch** to block social media (all Meta) for X amount of time
    - **easy swtich** to block all news sites for X amount of time
    - Work Mode List: users can add sites that they use for work onto this list, then when activated, only sites on this list can be accesible for X amount of time, all other sites will count towards the daily limit timer.
    - Youtube specific blockers; i also use an ext called YTBlock, and it would be nice to have only 1 ext to to all the blocking/focusing
        - block YT shorts
        - block recommendation feedd
        - block view view sidebar recommendations
        - block comments

### Plan MVP Development

to be updated...
```
