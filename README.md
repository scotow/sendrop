# Sendrop
🗃 **Temporary file hosting** 🗃

Temporary file host build using NodeJS, Express, multer and mySQL.

A instance of this package is currently at https://sendrop.scotow.com.

### Prerequisites

This package was developed using the following version and was not tested with previous ones (even if it may work with previous releases):

* [Node.js](http://nodejs.org) >= 8.9.X
* [Express](https://expressjs.com) >= 4.16.X
* [mySQL](https://www.mysql.com) >= 14.14

Feel free to check the [package.json](https://github.com/Scotow/sendrop/blob/master/package.json) file for more information.

### Installation:

Install the package using npm:

`npm install -g sendrop`

### Configuration:

Sendrop options can be either passed as environment variables or by updating the files in the [config](https://github.com/Scotow/sendrop/tree/master/config) folder.

While using configuration files, your configuration options must to be arranged as profile:

```json
{
    "production": {
        "option1" : "value1",
        "option2" : "value2",
    },
    "dev": {
        "option1" : "value1",
        "option2" : "value2",
    }
}
```

Then, you can specify the profile to load using the `SENDROP_ENV` environment variable (default is *production*):

```bash
export SENDROP_ENV=dev
```

###### Database (mySQL)

Before starting the web server you have to create a new database ([creation script](https://github.com/Scotow/sendrop/blob/master/sendrop_mysql.sql)) and specify your mySQL credentials.

Credentials can be specified in [the database config file](https://github.com/Scotow/sendrop/blob/master/config/database.json) or by setting the following environment variables:

```bash
export DB_HOST=localhost
export DB_USER=sendrop
export DB_PASSWORD=password
export DB_DATABASE=sendrop
```

###### Address and port

Furthermore you can specify a custom [address and listening port](https://github.com/Scotow/sendrop/blob/master/config/site.json). The address is mainly use to generate direct link to file  and the port may be change if you run Sendrop behind a proxy (default address is *localhost* and port is *80*):

```bash
export ADRESS=file.mysite.com
export PORT=8080
```

*NB:* If used behind a proxy don't forget to set the **X-Forwarded-For** HTTP header to the user IP. The IP is used to count and moderate file uploads from the same user.

###### Storage folder

Finally, you can specify the directory where files will be temporary stored using the [config file](https://github.com/Scotow/sendrop/blob/master/config/storage.json) or the following environment variable (default is the *temporary directory of your OS + /uploads/*):

```bash
export STORAGE_PATH=/tmp/sendrop
```

**Feel free to check template files in the [config](https://github.com/Scotow/sendrop/tree/master/config) folder.**

### Running

###### *Optional*

Set a Sendrop profile by setting the SENDROP_ENV variable:

```bash
export SENDROP_ENV=dev
```

###### Start the web server using the command:

`sendrop`

### Contribution

Feedback are appreciated. Feel free to open an issue or a pull request if needed.

### Disclaimer

*sendrop* provided by *Scotow* is for illustrative purposes only which provides customers with programming information regarding the products. This software is supplied "AS IS" without any warranties and support.

I assumes no responsibility or liability for the use of the software, conveys no license or title under any patent, copyright, or mask work right to the product.

***Enjoy sharing!***
