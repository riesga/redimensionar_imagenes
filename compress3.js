require('dotenv').config();
const child_process = require('child_process');
const fs = require('fs');
const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');

// folder donde se encuentran los archivos .bak
const folder = process.env.LOCAL_FOLDER;

// ruta del ejecutable de WinRAR
const winrarPath = process.env.PATH_WINRAR;

// configurar credenciales de acceso a S3
AWS.config.update({
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_KEY
});

const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET;

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
        let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
        fs.appendFile(logFileName, `${EventLog}: ${file} ya comprimido, omitiendo` + '\n', (err) => {
            if (err) throw err;
        });
        // Sincroniza el archivo con el bucket S3
        SyncS3(filenew);
    }
});


/*  Esta función sincroniza el archivo con S3 y valida si ya se subió, si es así, llama la función CheckFile 
    para validar la antiguedad del archivo y proceder a eliminarlo si tiene más días de los definidos en la variable OLD_DAYS
*/
function SyncS3(fileSync) {
    const fileToS3 = fileSync;
    const filePathZip = `${folder}${fileToS3}`;
    const headParams = {
        Bucket: bucketName,
        Key: `${fileToS3}`,
    };
    s3.headObject(headParams, function (err, data) {
        if (err && err.code === 'NotFound') {
            // Si el archivo no existe, proceder a subirlo
            const fileStream = fs.createReadStream(filePathZip);
            fileStream.on('error', function (err) {
                //console.log('File Error', err);
                let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
                fs.appendFile(logFileName, `${EventLog}: Error de archivo: ${err}` + '\n', (err) => {
                    if (err) throw err;
                });
            });
            const params = {
                Bucket: bucketName,
                Key: `${fileToS3}`,
                Body: fileStream
            };
            s3.upload(params, function (s3Err, data) {
                if (s3Err) {
                    //console.log('Error al subir el archivo a S3: ', s3Err);
                    // escribir el mensaje de error en el archivo de registro
                    let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
                    fs.appendFile(logFileName, EventLog + ': Error al subir el archivo ' + fileToS3 + ' al bucket ' + bucketName + ': ' + s3Err + '\n', (s3Err) => {
                        if (s3Err) throw s3Err;
                    });
                    sendEmail('Error al subir el archivo', 'Hubo un error al subir el archivo ' + fileToS3 + ' al bucket ' + bucketName + ': ' + s3Err);
                } else {
                    // escribir el mensaje de error en el archivo de registro
                    sendEmail(`Archivo enviado a S3: ${fileToS3}`, 'El archivo ' + fileToS3 + ' ha sido subido con éxito al bucket ' + bucketName);
                    let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
                    fs.appendFile(logFileName, EventLog + ': Archivo ' + fileToS3 + ' subido con éxito al bucket  ' + bucketName + '\n', (err) => {
                        if (err) throw err;
                    });
                }
            });
        } else {
            if (err && err.code != null) {
                sendEmail('Error al subir el archivo', 'Hubo un error al subir el archivo ' + fileToS3 + ' al bucket ' + bucketName + ': ' + err);
                let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
                fs.appendFile(logFileName, `${EventLog}: Error al subir el archivo ${fileToS3} al bucket ${bucketName}: ` + err + '\n', (err) => {
                    if (err) throw err;
                });
            } else {
                // escribir el mensaje de error en el archivo de registro
                let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
                fs.appendFile(logFileName, `${EventLog}: El archivo ${fileToS3} ya existe en el bucket ${bucketName}, omitiendo` + '\n', (err) => {
                    if (err) throw err;
                });
                CheckFile(fileToS3);
            }
        }
    });
}

//Con este proceso se van limpiando los archivos comprimidos con X días de antiguedad
function CheckFile(fileCh) {

    const fileOri = fileCh;
    const fileZip = fileCh.slice(0, -4) + process.env.EXT_FILES_SEARCH;
    const files = [fileOri, fileZip];
    
    files.forEach(file => {        
        const filePathCheck = `${folder}${file}`;
        fs.stat(filePathCheck, function (err, stats) {
            if (err) {
                let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
                fs.appendFile(logFileName, `${EventLog}: ${err}` + '\n', (err) => {
                    if (err) throw err;
                });
            } else {
                var mtime = new Date(stats.mtime);
                var currentDate = new Date();
                var difference = currentDate - mtime;
                var daysDifference = difference / 1000 / 60 / 60 / 24;
                if (daysDifference > process.env.OLD_DAYS) {
                    fs.unlink(filePathCheck, (err) => {
                        if (err) throw err;
                        let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
                        fs.appendFile(logFileName, `${EventLog}: ${filePathCheck} eliminado por antiguedad.` + '\n', (err) => {
                            if (err) throw err;
                        });
                    });
                }
            }
        });
    });
}

//Función que envía la notificación por correo electrónico
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