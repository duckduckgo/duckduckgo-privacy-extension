## Adding new blocking or whitelist rules

The filterToRule.js script will translate a newline separated list of adblock formatted rule into regex entries.
[Adblock Plus filters explained](https://adblockplus.org/filter-cheatsheet)

 There are some restrictions:
 1. Our list is based on domains so only filters with domain anchors `||` will be processed.
 2. The domain has to already exist in our list. Filters that can't be mapped to an existing domain in our list are written to a 'unmatchedFilters.json`. 
 3. The script will combine duplicate filters with some assumptions. If a new filter adds an additional request type option then it's assumed to apply to all domains in the existing rule.

 ### Running the filterToRule script
 1. Your input list of filters must be a newline separated list of adblock formatted filters.
 2. It's assumed that all of your filters are of the same type. You need to provide the type, rule or whitelist, as a --type option. 
 ```
 node filterToRule.js --f <your-list-of-filters> --type <rule for blocking, whitelist for whitelisting>
 ```
 The new list is written to new-trackerWithParentCompany.json. Double check that the list looks okay and copy it into the shared directory to test in the extension. 

 ```
 cp new-trackersWithParentCompany.json ../shared/data/tracker_lists/trackersWithParentCompany.json
 ```

 ### Conflicting filters
 The filterToRule script will attempt to combine duplicate filters. For example, in your input list you might have multiple filters that add different domain or request options.  There can be cases where one filter tries to add domains and another filter tries to add request types. In this case it's not clear if two filter should be merged. The script will print a warning for these filters. You should evaluate each filter and decide which is correct, or combine their options manually and rerun the script.

 ### Unsupported filters
 Filters that do not have domain anchors are not processed and added to a list of unsupported filters. These are written to `log.json`. If you want these to be processed and added then you will need to add the tracker and parent company to our list.

 ### Overriding filters
 The script allows additional filters to override domain or request options. For example, if there are existing domains but a new filter intends to match on all domains, it's assumed that the new filter is the correct one. The script will print out a warning when this happens. If this is not your intention then manually combine the duplicate filters into a new one and rerun. 
