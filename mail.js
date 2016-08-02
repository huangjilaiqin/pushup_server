

var nodemailer = require('nodemailer');
var smtpConfig = {
    host: 'smtp.qq.com',
    port: 465,
    secure: true, // use SSL
    auth: {
        user: '1577594730@qq.com',
        pass: '19910803huangji'
    }
};

var mailOption = {
    from :'"天天俯卧撑" <1577594730@qq.com>',
    to:'huangji_gd@163.com',
    subject:'test',
    text:'hello mail',
};


module.exports  = {

    send:function(subject,text){
        var transporter = nodemailer.createTransport(smtpConfig);
        mailOption.subject = subject;
        mailOption.text = text;
        transporter.sendMail(mailOption, function(error, info){
            if(error){
                console.error(error,info);
            }
        });
    },

    sendHtml:function(subject,html){
        var transporter = nodemailer.createTransport(smtpConfig);
        mailOption.subject = subject;
        mailOption.html = html;
        transporter.sendMail(mailOption, function(error, info){
            if(error){
                console.error(error,info);
            }
        });
    },
};
