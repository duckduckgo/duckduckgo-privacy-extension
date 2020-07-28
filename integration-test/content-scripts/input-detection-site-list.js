const tests = [
    {
        name: 'reddit signup',
        url: 'https://www.reddit.com/register/?dest=https%3A%2F%2Fwww.reddit.com%2F',
        autofillExpected: true
    },
    {
        name: 'reddit login',
        url: 'https://www.reddit.com/login/?dest=https%3A%2F%2Fwww.reddit.com%2F',
        autofillExpected: false
    },
    {
        name: 'quora signup',
        url: 'https://www.quora.com/',
        actions: [{action: 'click', selector: '.signup_email_link'}],
        autofillExpected: true
    },
    {
        name: 'quora login',
        url: 'https://www.quora.com/',
        autofillExpected: false
    },
    {
        name: 'imdb signup',
        url: 'https://www.imdb.com/ap/register?showRememberMe=true&openid.return_to=https%3A%2F%2Fwww.imdb.com%2Fregistration%2Fap-signin-handler%2Fimdb_us&prevRID=4P4HK4MBFAQT1PV6PHAZ&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=imdb_us&openid.mode=checkid_setup&siteState=eyJvcGVuaWQuYXNzb2NfaGFuZGxlIjoiaW1kYl91cyIsInJlZGlyZWN0VG8iOiJodHRwczovL3d3dy5pbWRiLmNvbS8_cmVmXz1sb2dpbiJ9&prepopulatedLoginId=&failedSignInCount=0&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&pageId=imdb_us&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0',
        autofillExpected: true
    },
    {
        name: 'imdb login',
        url: 'https://www.imdb.com/ap/signin?openid.return_to=https%3A%2F%2Fwww.imdb.com%2Fregistration%2Fap-signin-handler%2Fimdb_us&prevRID=67HJB7XMRSFB2KXR6NFN&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=imdb_us&openid.mode=checkid_setup&siteState=eyJvcGVuaWQuYXNzb2NfaGFuZGxlIjoiaW1kYl91cyIsInJlZGlyZWN0VG8iOiJodHRwczovL3d3dy5pbWRiLmNvbS8_cmVmXz1sb2dpbiJ9&failedSignInCount=0&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&pageId=imdb_us&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0',
        autofillExpected: false
    }
]

module.exports = tests
