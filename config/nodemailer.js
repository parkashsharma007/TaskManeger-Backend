const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
service:"gmail",
auth:{
user:"parkashjajra106@gmail.com",
pass:"edht vczz lhkj jong"
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