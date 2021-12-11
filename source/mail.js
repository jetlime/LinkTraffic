const nodemailer = require('nodemailer');

async function sendMail(email,emailMessage, emailMessageAdmin) {
    var transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port : 587,
        secure : false,
        auth: {
          user: 'linktrafficlu@gmail.com',
          pass: process.env.MAILPASS 
        }
      });
    
      var emailOptions = {
        from: 'LinkTraffic <linktrafficlu@gmail.com>',
        to: email,
        subject: 'LinkTraffic Contact',
        text: emailMessage
      };

      var emailOptionsAdmin = {
          from: 'Admin <linktrafficlu@gmail.com>',
          to: 'linktrafficlu@gmail.com',
          subject: 'LinkTraffic Contact Admin',
          text: emailMessageAdmin
      }
      transporter.sendMail(emailOptionsAdmin);

      await transporter.sendMail(emailOptions, (err, info) => {
        if (err) {
          return true
        } 
      });
}

module.exports = sendMail ;