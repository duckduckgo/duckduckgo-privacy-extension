# Simple Redirect Server

## Setup
If you're on a Mac, add the following to your /etc/hosts file.
```
127.0.0.1       redirect.local
127.0.0.1       redirect.local2
127.0.0.1       redirect.local3
```

## Usage
From cli navigate to same level as this README and package.json in this directory. Type this command:
```
$ npm start
```

In your browser's address bar, navigate to:
```
http://redirect.local:8070
```

The default config.json file in this library will redirect you three times and then finally end at https://duckduckgo.com

### Simulating redirect loops
In config.json, set the last redirect `host` value to be the first one, plus the port number. If you're using the default config that would be:
```
"redirect.local3": {
    "host": "http://redirect.local:8070",
    "code": 301
}
```

