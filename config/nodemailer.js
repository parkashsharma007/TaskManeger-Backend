const nodemailer = require('nodemailer')
require('dotenv').config()
const transporter = nodemailer.createTransport({
service:"gmail",
auth:{
user:process.env.USER,
pass:process.env.PASSWORD
}
})

const sendmail = async(to,subject,text)=>{

await transporter.sendMail({
from:"parkashjajra106@gmail.com",
to: to,
subject: subject,
text: text
})

}

module.exports = sendmail