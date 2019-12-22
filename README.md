# Sendrop
🗃 **Temporary file hosting** 🗃

Temporary file host build using NodeJS, Express, multer and mySQL.

A instance of this package is currently at https://sendrop.scotow.com.

### Prerequisites

This package was developed using the following version and was not tested with previous ones (even if it may work with previous releases):

* [Node.js](http://nodejs.org) >= 8.9.X
* [Express](https://expressjs.com) >= 4.16.X
* [mySQL](https://www.mysql.com) >= 5.5.X

Feel free to check the [package.json](https://github.com/Scotow/sendrop/blob/master/package.json) file for more information.

### Installation

Clone the repo then install globaly using npm:

```sh
git clone https://github.com/Scotow/sendrop
cd sendrop
npm install -g sendrop
```

### Configuration

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

##### Database (mySQL)

Before starting the web server you have to create a new database ([creation script](https://github.com/Scotow/sendrop/blob/master/sendrop_mysql.sql)) and specify your mySQL credentials.

Credentials can be specified in [the database config file](https://github.com/Scotow/sendrop/blob/master/config/database.json) or by setting the following environment variables:

```bash
export DB_HOST=localhost
export DB_USER=sendrop
export DB_PASSWORD=password
export DB_DATABASE=sendrop
```

##### Address and port

Furthermore you can specify a custom [address and listening port](https://github.com/Scotow/sendrop/blob/master/config/site.json). The address is mainly use to generate direct link to file and the port may be change if you run Sendrop behind a proxy. Setting the address as *'auto'* makes Sendrop use *req.hostname* and *req.protocol* (default address is *auto* and port is *80*):

```bash
export ADDRESS=file.mysite.com
export PORT=8080
```

*NB:* If used behind a proxy don't forget to set the **X-Forwarded-For** HTTP header to use the user IP and set the **X-Forwarded-Proto** to pass the protocol to Express. The IP is used to count and moderate file uploads from the same user.

Here is the three directives I set in my NGINX conf file:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-For    $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto  $scheme;
```

##### Storage folder

Finally, you can specify the directory where files will be temporary stored using the [config file](https://github.com/Scotow/sendrop/blob/master/config/storage.json) or the following environment variable (default is the *temporary directory of your OS + /uploads/*):

```bash
export STORAGE_PATH=/tmp/sendrop
```

##### Additional proxy configuration

If you have a proxy in front of your Sendrop instance, you may need to increase the allowed body size of the requests.

For example, in NGINX you may change this limit as following:

```nginx
client_max_body_size 256M;
```

**Feel free to check template files in the [config](https://github.com/Scotow/sendrop/tree/master/config) folder.**

### Running

##### *Optional*

Set a Sendrop profile by setting the SENDROP_ENV variable:

```bash
export SENDROP_ENV=dev
```

##### Start the web server using the command:

`sendrop`

### Script

Quickly upload files using the [upload.sh](https://github.com/Scotow/sendrop/blob/master/upload.sh) or [upload.pl](https://github.com/Scotow/sendrop/blob/master/upload.pl) script.

### Contribution

Feedback are appreciated. Feel free to open an issue or a pull request if needed.

### Disclaimer

*sendrop* provided by *Scotow* is for illustrative purposes only which provides customers with programming information regarding the products. This software is supplied "AS IS" without any warranties and support.

I assumes no responsibility or liability for the use of the software, conveys no license or title under any patent, copyright, or mask work right to the product.

***Enjoy sharing!***
