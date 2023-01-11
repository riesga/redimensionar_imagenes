const sharp = require("sharp");
const path = require('path');
const fs = require('fs');

async function getMetadata(file) {
  try {
    const metadata = await sharp(file).metadata();
    console.log('File: ', file);
    console.log(metadata);
  } catch (error) {
    console.log(`An error occurred during processing: ${error}`);
  }
}



function getImagesMetadata() {
  //joining path of directory 
  const directoryPath = path.join(__dirname);
  //passsing directoryPath and callback function
  fs.readdir(directoryPath, function (err, files) {
    //handling error
    if (err) {
      return console.log('Unable to scan directory: ' + err);
    }
    //listing all files using forEach
    files.forEach(function (file) {
      // Do whatever you want to do with the file
      const ext = path.extname(file);
 
      if (ext === ".png" || ext === ".jpg") {
        getMetadata(file);
      }      
    });
  });
}


getImagesMetadata();