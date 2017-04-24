## Adding a new tracker list

1. Add a new entry to `/scripts/tracker_list_data.json`

The required fields are:
- `type`: A name for the format type of the list
- `loc`: location of the list data
- `processedName`: name for the processed output file saved in /scripts/tracker_lists/

2. Write your list importer in `scripts/importers/`. Your importer should use the same name that you defined in tracker_list_data.json:

`global.<yourType> = ....`

3. Add the name of your processed file to `data/default_settings.json` in the blockLists array.

4. run `grunt` to process the list
