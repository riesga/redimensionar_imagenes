require('dotenv').config();
const child_process = require('child_process');
const fs = require('fs');
const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');

// folder donde se encuentran los archivos .bak
const folder = process.env.LOCAL_FOLDER;

// ruta del ejecutable de WinRAR
const winrarPath = 'c:\\Program Files\\WinRAR\\winrar';

// configurar credenciales de acceso a S3
AWS.config.update({
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_KEY
});

const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET;
const sourceFolder = process.env.LOCAL_FOLDER;

const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Bogota"
};

let date = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");

const logFileName = 'log-' + date.slice(0, 10) + '.txt';

// busca todos los archivos .bak en el folder especificado
const files = fs.readdirSync(folder).filter(file => file.endsWith(process.env.EXT_FILES_SEARCH));

// recorre cada archivo encontrado y lo comprimir con WinRAR
files.forEach(file => {
    // construye el nombre del archivo comprimido sin la extensión .bak
    const fileName = file.slice(0, -4);
    const filePath = `${folder}${file}`;
    const filenew = `${fileName}.rar`;
    const compressedFilePath = `${folder}${fileName}.rar`;

    // verifica si el archivo ya fue comprimido
    if (!fs.existsSync(compressedFilePath)) {
        // ejecuta el comando para comprimir el archivo
        child_process.execSync(`"${winrarPath}" a -ep1 -r "${compressedFilePath}" "${filePath}"`);
        const fileStream = fs.createReadStream(compressedFilePath);
        fileStream.on('error', function (err) {
            //console.log('File Error', err);
            let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
            fs.appendFile(logFileName, `${EventLog}: error de archivo. ${err}` + '\n', (err) => {
                if (err) throw err;
            });
        });
        const params = {
            Bucket: bucketName,
            Key: `${filenew}`,
            Body: fileStream
        };
        s3.upload(params, function (s3Err, data) {
            if (s3Err) {
                //console.log('Error al subir el archivo a S3: ', s3Err);
                let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
                fs.appendFile(logFileName, `${EventLog}: Error al subir el archivo a S3: ${s3Err}` + '\n', (s3Err));
                sendEmail('Error al subir el archivo', 'Hubo un error al subir el archivo ' + filenew + ' al bucket ' + bucketName + ': ' + s3Err);
            } else {
                sendEmail(`Archivo enviado a S3: ${filenew}`, 'El archivo ' + filenew + ' ha sido subido con éxito al bucket ' + bucketName);
                let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
                fs.appendFile(logFileName, `${EventLog}: Archivo ${filenew} subido con éxito al bucket ${bucketName}` + '\n', (s3Err) => {
                    if (s3Err) throw s3Err;
                });
            }
        });
    } else {
        console.log(`${file} ya comprimido, omitiendo`);
        let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
        fs.appendFile(logFileName, `${EventLog}: ${file} ya comprimido, omitiendo` + '\n', (err) => {
            if (err) throw err;
        });
        // Verificar si el archivo ya existe en el bucket
        const filePath = `${compressedFilePath}`;
        const headParams = {
            Bucket: bucketName,
            Key: `${filenew}`,
        };
        s3.headObject(headParams, function (err, data) {
            if (err && err.code === 'NotFound') {
                // Si el archivo no existe, proceder a subirlo
                const fileStream = fs.createReadStream(filePath);
                fileStream.on('error', function (err) {
                    //console.log('File Error', err);
                    let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
                    fs.appendFile(logFileName, `${EventLog}: Error de archivo: ${err}` + '\n', (err) => {
                        if (err) throw err;
                    });
                });
                const params = {
                    Bucket: bucketName,
                    Key: `${filenew}`,
                    Body: fileStream
                };
                s3.upload(params, function (s3Err, data) {
                    if (s3Err) {
                        //console.log('Error al subir el archivo a S3: ', s3Err);
                        // escribir el mensaje de error en el archivo de registro
                        let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
                        fs.appendFile(logFileName, EventLog + ': Error al subir el archivo ' + filePath + ' al bucket ' + bucketName + ': ' + s3Err + '\n', (s3Err) => {
                            if (s3Err) throw s3Err;
                        });
                        sendEmail('Error al subir el archivo', 'Hubo un error al subir el archivo ' + filenew + ' al bucket ' + bucketName + ': ' + s3Err);
                    } else {
                        // escribir el mensaje de error en el archivo de registro
                        sendEmail(`Archivo enviado a S3: ${filePath}`, 'El archivo ' + filePath + ' ha sido subido con éxito al bucket ' + bucketName);
                        let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
                        fs.appendFile(logFileName, EventLog + ': Archivo ' + filePath + ' subido con éxito al bucket  ' + bucketName + '\n', (err) => {
                            if (err) throw err;
                        });
                    }
                });
            } else {
                // escribir el mensaje de error en el archivo de registro
                let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
                fs.appendFile(logFileName, `${EventLog}: El archivo ${filenew} ya existe en el bucket ${bucketName}, omitiendo` + '\n', (err) => {
                    if (err) throw err;
                });
                //Enviar correo:
                if (err && err.code != null) {
                    sendEmail('Error al subir el archivo', 'Hubo un error al subir el archivo ' + filenew + ' al bucket ' + bucketName + ': ' + err);
                    fs.appendFile(logFileName, `${EventLog}: Error al subir el archivo ${filenew} al bucket ${bucketName}: ` + err + '\n', (err) => {
                        if (err) throw err;
                    });
                }
            }
        });
    }
});


function sendEmail(subject, message) {
    // configurar transporte de correo
    let transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER,
        port: process.env.EMAIL_PORT_SERVER,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    // configurar destinatarios y contenido del correo
    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_NOTIF_TO,
        subject: subject,
        text: message
    };

    // enviar correo
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        //console.log('Mensaje enviado: %s', info.messageId);
    });
}