const trackerTests = [
    { 
        rootDomain: "2mdn.net",
        whitelist: [
            {tracker: "2mdn.net/asdf/1x1image.jpg", site: "convert-me.com", type: "image"},
            {tracker: "2mdn.net/asdf/html_inpage_rendering_lib_", site: "investopedia.com", type: "script"}
        ],
        block: [
            {tracker: "2mdn.net/asdf/1x1image.jpg", type: "image"}
        ]
    }
]
