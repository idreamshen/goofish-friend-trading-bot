const fs = require('fs');
var conf = {};

const env = process.env.NODE_ENV;
if (env != "") {
    const fileName = "./config-" + env + ".json";
    console.log(fileName);
    conf = require(fileName);
    console.log(conf);
}

module.exports = conf;