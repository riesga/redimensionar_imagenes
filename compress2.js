require('dotenv').config();
const fs = require('fs');
const archiver = require('archiver');
const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const AdmZip = require('adm-zip');

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

fs.readdir(sourceFolder, (err, files) => {
  if (err) throw err;
  for (const file of files) {
    if (file.endsWith(process.env.EXT_FILES_SEARCH)) {
      const filePath = `${sourceFolder}/${file}`;
      const destination = `${filePath.slice(0, -4)}.zip`;
      if (fs.existsSync(destination)) {
        let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
        fs.appendFile(logFileName, `${EventLog}: ${file.slice(0, -4)}.zip ya comprimido, omitiendo` + '\n', (err) => {
          if (err) throw err;
        });
        continue;
      }
      fs.stat(filePath, function (err, stats) {
        if (err) {
          //console.log(error);          
          let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
          fs.appendFile(logFileName, `${EventLog}: ${err}` + '\n', (err) => {
            if (err) throw err;
          });
        } else {
          var mtime = new Date(stats.mtime);
          var currentDate = new Date();
          var difference = currentDate - mtime;
          var daysDifference = difference / 1000 / 60 / 60 / 24;
          if (daysDifference > 2) {
            fs.unlink(filePath, (err) => {
              if (err) throw err;
              //console.log(`${filePath} deleted`);
              let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
              fs.appendFile(logFileName, `${EventLog}: ${filePath} eliminado.` + '\n', (err) => {
                if (err) throw err;
              });
            });
          } else {
            const output = fs.createWriteStream(destination);
            const archive = archiver('zip', { zlib: { level: 9 } });
            output.on('close', function () {
              //console.log(archive.pointer() + ' total bytes');
              //console.log('Se ha finalizado el proceso.');
              // Sincronizar el archivo zip con S3
              const fileStream = fs.createReadStream(destination);
              fileStream.on('error', function (err) {
                //console.log('File Error', err);
                let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
                fs.appendFile(logFileName, `${EventLog}: error de archivo. ${err}` + '\n', (err) => {
                  if (err) throw err;
                });
              });
              const filenew = `${file.slice(0, -4)}.zip`;
              //console.log(filenew);
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
                  //console.log(`Archivo ${destination} subido con éxito al bucket ${bucketName}`);
                  sendEmail(`Archivo enviado a S3: ${filenew}`, 'El archivo ' + filenew + ' ha sido subido con éxito al bucket ' + bucketName);
                  let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
                  fs.appendFile(logFileName, `${EventLog}: Archivo ${destination} subido con éxito al bucket ${bucketName}` + '\n', (s3Err) => {
                    if (s3Err) throw s3Err;
                  });                  
                }
              });
            });
            archive.on('warning', function (err) {
              if (err.code === 'ENOENT') {
                //console.log("Advertencia de archivo: " + err);
                let EventLog = new Intl.DateTimeFormat("es-ES", options).format(new Date()).replace(/\//g, "-");
                fs.appendFile(logFileName, `${EventLog}: Advertencia de archivo: ${err}` + '\n', (err) => {
                  if (err) throw err;
                });
              } else {
                throw err;
              }
            });

            archive.on('error', function (err) {
              throw err;
            });

            archive.pipe(output);
            archive.file(filePath, { name: file });
            archive.finalize();
          }
        }
      });
    } else if (file.endsWith('.zip')) {
      const filePath = `${sourceFolder}/${file}`;
      // Verificar si el archivo ya existe en el bucket
      const headParams = {
        Bucket: bucketName,
        Key: `${file}`,
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
            Key: `${file}`,
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
              sendEmail('Error al subir el archivo', 'Hubo un error al subir el archivo ' + filePath + ' al bucket ' + bucketName + ': ' + s3Err);
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
          fs.appendFile(logFileName, `${EventLog}: El archivo ${file} ya existe en el bucket ${bucketName}, omitiendo` + '\n', (err) => {
            if (err) throw err;
          });
        }
      });
    }
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